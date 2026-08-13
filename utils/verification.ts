import type { Participant, QualificationRules } from '~/types/tournament';
import { fetchChessComUserStats, fetchLichessUserStats } from './chessApi';
import { computePlatformTrustScore } from './ruleEngine';

/**
 * Calculates full months elapsed from a given ISO date string to today.
 * Returns null if the date is missing/invalid — callers skip the age check in that case.
 */
function monthsFromDate(isoDate: string | null | undefined): number | null {
  if (!isoDate) return null;
  const joinedMs = new Date(isoDate).getTime();
  if (isNaN(joinedMs) || joinedMs <= 0) return null;
  const diffMs = Date.now() - joinedMs;
  if (diffMs <= 0) return 0;
  return Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30.4375));
}

/**
 * Evaluates a participant against tournament qualification rules.
 *
 * Exact Flow:
 * 1. Check account existence for both platforms.
 * 2. If BOTH exist & are verified -> do DUAL-PLATFORM check (AND ratings, OR activity).
 * 3. If ONLY ONE exists -> do SINGLE-PLATFORM check on existing account + add statement that the other didn't exist.
 * 4. If NEITHER exists -> REJECTED.
 */
export function evaluateParticipant(
  participant: Participant,
  rules: QualificationRules
): Participant {
  const rejectionReasons: string[] = [];

  const safeRules = rules || ({} as any);
  const rawChess = safeRules.chessCom || {};
  const rawLichess = safeRules.lichess || {};

  // Extract platform-specific rules with bulletproof fallbacks
  const chessRules = {
    maxRating: rawChess.maxRating ?? (safeRules as any).chessComMaxRating ?? 1500,
    maxPeakRating: rawChess.maxPeakRating ?? (safeRules as any).chessComMaxPeak ?? 1600,
    minGamesPlayed: rawChess.minGamesPlayed ?? (safeRules as any).chessComMinGames ?? 30,
    minAccountAgeMonths:
      rawChess.minAccountAgeMonths ??
      (rawChess.minAccountAgeDays ? Math.round(rawChess.minAccountAgeDays / 30.4375) : undefined) ??
      (safeRules as any).chessComMinAgeMonths ??
      3,
  };

  const lichessRules = {
    maxRating: rawLichess.maxRating ?? (safeRules as any).lichessMaxRating ?? 1500,
    maxPeakRating: rawLichess.maxPeakRating ?? (safeRules as any).lichessMaxPeak ?? 1600,
    minGamesPlayed: rawLichess.minGamesPlayed ?? (safeRules as any).lichessMinGames ?? 30,
    minAccountAgeMonths:
      rawLichess.minAccountAgeMonths ??
      (rawLichess.minAccountAgeDays ? Math.round(rawLichess.minAccountAgeDays / 30.4375) : undefined) ??
      (safeRules as any).lichessMinAgeMonths ??
      3,
  };

  const hasChessComHandle = !!participant.chessComUsername && participant.chessComUsername.trim().length > 0;
  const hasLichessHandle = !!participant.lichessUsername && participant.lichessUsername.trim().length > 0;

  const isChessComVerified = hasChessComHandle;
  const isLichessVerified = hasLichessHandle;

  // Immediate ToS / Fair Play / Closed Account Rejection
  if (participant.lichessTosViolation || participant.chessComClosed) {
    if (participant.lichessTosViolation) {
      rejectionReasons.push('Lichess Terms of Service (ToS) Violation detected (account flagged or closed by Lichess).');
    }
    if (participant.chessComClosed) {
      rejectionReasons.push('Chess.com account closed, blocked, or flagged for Fair Play / Terms of Service violation.');
    }
    const trustDetails: TrustScoreDetails = {
      score: 0,
      zScore: -9.99,
      effectiveRating: 9999,
      effectiveRd: 0,
      gameCountFactor: 1,
      peakWeight: 1,
      peakContribution: 9999,
      verdictBand: 'REJECT',
      explanation: 'Account flagged, closed, or banned for Terms of Service / Fair Play violation.',
      rd: 0,
      gamesCount: 0,
      platform: participant.lichessTosViolation ? 'lichess' : 'chessCom',
    };
    return { ...participant, rejectionReasons, verdict: 'REJECTED', trustScore: 0, trustDetails };
  }

  let evaluationFailed = false;

  // ─── SCENARIO 1: BOTH ACCOUNTS EXIST ───────────────────────────────────────
  if (isChessComVerified && isLichessVerified) {
    // RATINGS: AND — both must pass
    if (participant.chessComRating !== null && participant.chessComRating !== undefined) {
      if (participant.chessComRating > chessRules.maxRating) {
        rejectionReasons.push(
          `Chess.com rating (${participant.chessComRating}) exceeds limit of ${chessRules.maxRating}`
        );
        evaluationFailed = true;
      }
    }
    if (participant.chessComPeakRating !== null && participant.chessComPeakRating !== undefined) {
      if (participant.chessComPeakRating > chessRules.maxPeakRating) {
        rejectionReasons.push(
          `Chess.com peak rating (${participant.chessComPeakRating}) exceeds peak limit of ${chessRules.maxPeakRating}`
        );
        evaluationFailed = true;
      }
    }
    if (participant.lichessRating !== null && participant.lichessRating !== undefined) {
      if (participant.lichessRating > lichessRules.maxRating) {
        rejectionReasons.push(
          `Lichess rating (${participant.lichessRating}) exceeds limit of ${lichessRules.maxRating}`
        );
        evaluationFailed = true;
      }
    }
    if (participant.lichessPeakRating !== null && participant.lichessPeakRating !== undefined) {
      if (participant.lichessPeakRating > lichessRules.maxPeakRating) {
        rejectionReasons.push(
          `Lichess peak rating (${participant.lichessPeakRating}) exceeds peak limit of ${lichessRules.maxPeakRating}`
        );
        evaluationFailed = true;
      }
    }

    // ACTIVITY: OR — at least ONE platform passes (games AND age both pass for that platform)
    const chessComAgeMonths = monthsFromDate(participant.chessComJoinedAt);
    const lichessAgeMonths = monthsFromDate(participant.lichessJoinedAt);

    const chessComAgePass = chessComAgeMonths === null || chessComAgeMonths >= chessRules.minAccountAgeMonths;
    const lichessAgePass = lichessAgeMonths === null || lichessAgeMonths >= lichessRules.minAccountAgeMonths;

    const chessComActivityPass =
      (participant.chessComGamesCount ?? 0) >= chessRules.minGamesPlayed && chessComAgePass;

    const lichessActivityPass =
      (participant.lichessGamesCount ?? 0) >= lichessRules.minGamesPlayed && lichessAgePass;

    if (!chessComActivityPass && !lichessActivityPass) {
      const chessAgeStr = chessComAgeMonths !== null ? `${chessComAgeMonths}/${chessRules.minAccountAgeMonths} months` : 'age unknown';
      const lichessAgeStr = lichessAgeMonths !== null ? `${lichessAgeMonths}/${lichessRules.minAccountAgeMonths} months` : 'age unknown';
      rejectionReasons.push(
        `Activity requirement not met: Neither platform meets minimum activity. ` +
        `Chess.com: ${participant.chessComGamesCount ?? 0}/${chessRules.minGamesPlayed} games, ${chessAgeStr}. ` +
        `Lichess: ${participant.lichessGamesCount ?? 0}/${lichessRules.minGamesPlayed} games, ${lichessAgeStr}.`
      );
      evaluationFailed = true;
    }
  }

  // ─── SCENARIO 2: ONLY CHESS.COM EXISTS ─────────────────────────────────────
  else if (isChessComVerified) {
    if (hasLichessHandle && !isLichessVerified) {
      rejectionReasons.push(`Note: Lichess account '${participant.lichessUsername}' does not exist or could not be verified.`);
    }

    if (participant.chessComRating !== null && participant.chessComRating !== undefined) {
      if (participant.chessComRating > chessRules.maxRating) {
        rejectionReasons.push(
          `Chess.com rating (${participant.chessComRating}) exceeds limit of ${chessRules.maxRating}`
        );
        evaluationFailed = true;
      }
    }
    if (participant.chessComPeakRating !== null && participant.chessComPeakRating !== undefined) {
      if (participant.chessComPeakRating > chessRules.maxPeakRating) {
        rejectionReasons.push(
          `Chess.com peak rating (${participant.chessComPeakRating}) exceeds peak limit of ${chessRules.maxPeakRating}`
        );
        evaluationFailed = true;
      }
    }
    if ((participant.chessComGamesCount ?? 0) < chessRules.minGamesPlayed) {
      rejectionReasons.push(
        `Chess.com games (${participant.chessComGamesCount ?? 0}/${chessRules.minGamesPlayed}) below minimum`
      );
      evaluationFailed = true;
    }
    const chessComAgeMonths = monthsFromDate(participant.chessComJoinedAt);
    if (chessComAgeMonths !== null && chessComAgeMonths < chessRules.minAccountAgeMonths) {
      rejectionReasons.push(
        `Chess.com account age (${chessComAgeMonths}/${chessRules.minAccountAgeMonths} months) below minimum`
      );
      evaluationFailed = true;
    }
  }

  // ─── SCENARIO 3: ONLY LICHESS EXISTS ───────────────────────────────────────
  else if (isLichessVerified) {
    if (hasChessComHandle && !isChessComVerified) {
      rejectionReasons.push(`Note: Chess.com account '${participant.chessComUsername}' does not exist or could not be verified.`);
    }

    if (participant.lichessRating !== null && participant.lichessRating !== undefined) {
      if (participant.lichessRating > lichessRules.maxRating) {
        rejectionReasons.push(
          `Lichess rating (${participant.lichessRating}) exceeds limit of ${lichessRules.maxRating}`
        );
        evaluationFailed = true;
      }
    }
    if (participant.lichessPeakRating !== null && participant.lichessPeakRating !== undefined) {
      if (participant.lichessPeakRating > lichessRules.maxPeakRating) {
        rejectionReasons.push(
          `Lichess peak rating (${participant.lichessPeakRating}) exceeds peak limit of ${lichessRules.maxPeakRating}`
        );
        evaluationFailed = true;
      }
    }
    if ((participant.lichessGamesCount ?? 0) < lichessRules.minGamesPlayed) {
      rejectionReasons.push(
        `Lichess games (${participant.lichessGamesCount ?? 0}/${lichessRules.minGamesPlayed}) below minimum`
      );
      evaluationFailed = true;
    }
    const lichessAgeMonths = monthsFromDate(participant.lichessJoinedAt);
    if (lichessAgeMonths !== null && lichessAgeMonths < lichessRules.minAccountAgeMonths) {
      rejectionReasons.push(
        `Lichess account age (${lichessAgeMonths}/${lichessRules.minAccountAgeMonths} months) below minimum`
      );
      evaluationFailed = true;
    }
  }

  // ─── SCENARIO 4: NEITHER ACCOUNT EXISTS OR IS VERIFIED ────────────────────
  else {
    if (hasChessComHandle) {
      rejectionReasons.push(`Chess.com account '${participant.chessComUsername}' does not exist or could not be verified.`);
    }
    if (hasLichessHandle) {
      rejectionReasons.push(`Lichess account '${participant.lichessUsername}' does not exist or could not be verified.`);
    }
    if (!hasChessComHandle && !hasLichessHandle) {
      rejectionReasons.push('No Chess.com or Lichess handle was provided.');
    }
    evaluationFailed = true;
  }

  // Compute Trust Score details
  const cTrust = isChessComVerified ? computePlatformTrustScore({
    verified: true,
    currentRating: participant.chessComRating ?? chessRules.maxRating,
    peakRating: participant.chessComPeakRating ?? participant.chessComRating ?? chessRules.maxRating,
    peakDate: participant.chessComPeakDate,
    gamesCount: participant.chessComGamesCount ?? 0,
    joinedAt: participant.chessComJoinedAt ?? '',
    rawUsername: participant.chessComUsername,
    rd: participant.chessComRd,
    prov: participant.chessComProv,
    lastPlayedAt: participant.chessComLastPlayedAt,
  }, chessRules.maxRating, safeRules.peakWindowMonths ?? 24, 'chessCom') : undefined;

  const lTrust = isLichessVerified ? computePlatformTrustScore({
    verified: true,
    currentRating: participant.lichessRating ?? lichessRules.maxRating,
    peakRating: participant.lichessPeakRating ?? participant.lichessRating ?? lichessRules.maxRating,
    peakDate: participant.lichessPeakDate,
    gamesCount: participant.lichessGamesCount ?? 0,
    joinedAt: participant.lichessJoinedAt ?? '',
    rawUsername: participant.lichessUsername,
    rd: participant.lichessRd,
    prov: participant.lichessProv,
    lastPlayedAt: participant.lichessLastPlayedAt,
  }, lichessRules.maxRating, safeRules.peakWindowMonths ?? 24, 'lichess') : undefined;

  let trustDetails = lTrust || cTrust;
  if (cTrust && lTrust) {
    const cOver = (participant.chessComRating ?? 0) > chessRules.maxRating || (participant.chessComPeakRating ?? 0) > chessRules.maxPeakRating;
    const lOver = (participant.lichessRating ?? 0) > lichessRules.maxRating || (participant.lichessPeakRating ?? 0) > lichessRules.maxPeakRating;

    if (cOver || lOver) {
      // If either platform exceeds limit, lower score governs (sandbagging protection)
      trustDetails = cTrust.score < lTrust.score ? cTrust : lTrust;
    } else {
      // Both platforms within limit -> prioritize account with lower RD (most reliable data)
      trustDetails = cTrust.effectiveRd <= lTrust.effectiveRd ? cTrust : lTrust;
    }
  }
  const trustScore = trustDetails?.score;
  const minScoreThreshold = safeRules.minimumTrustScore ?? 65;

  let isRescued = false;

  // Rescue Eligibility Policy:
  // 1. NO ToS or closed account violations (permanent rejection).
  // 2. NO unverified or 404 handles (all provided handles must exist).
  // 3. Activity failures (games/age below min) AND rating/peak ceiling exceedances CAN BE RESCUED if Trust Score >= threshold!
  const hasUnverifiedHandleError = rejectionReasons.some((r) => r.includes('does not exist or could not be verified') || r.includes('No Chess.com or Lichess handle'));
  const hasBanOrTos = Boolean(participant.lichessTosViolation || participant.chessComClosed);

  const canBeRescued = !hasBanOrTos && !hasUnverifiedHandleError;

  if (trustScore !== undefined) {
    if (evaluationFailed && canBeRescued && trustScore >= minScoreThreshold) {
      // RESCUE LOGIC: Candidate has valid verified handle(s) & no bans. Trust Score >= threshold rescues activity or ceiling failures!
      evaluationFailed = false;
      isRescued = true;
      if (!rejectionReasons.some((r) => r.includes('Rescued by Trust Score'))) {
        rejectionReasons.push(`🛡️ Rescued by Trust Score (${trustScore}/100 >= ${minScoreThreshold} threshold) despite rating/activity limits.`);
      }
    } else if (!evaluationFailed && trustScore < minScoreThreshold) {
      // LOW TRUST REJECTION: Candidate passed raw ceilings, but statistical uncertainty/unreliability drops Trust Score below threshold.
      evaluationFailed = true;
      if (!rejectionReasons.some((r) => r.includes('Trust Score'))) {
        rejectionReasons.push(`Trust Score (${trustScore}/100) is below minimum required threshold of ${minScoreThreshold}.`);
      }
    }
  }

  const verdict = evaluationFailed ? 'REJECTED' : 'ELIGIBLE';
  return { ...participant, rejectionReasons, verdict, trustScore, trustDetails, isRescued };
}

/**
 * Fetches live stats from Chess.com & Lichess, then evaluates the participant.
 * All eligibility screening is strictly based on Rapid format ratings.
 */
export async function verifyParticipantLive(
  participant: Participant,
  rules: QualificationRules,
  timeFormat: string = 'rapid'
): Promise<Participant> {
  let updated = { ...participant };
  const screeningFormat = 'rapid';

  if (participant.lichessUsername) {
    const stats = await fetchLichessUserStats(participant.lichessUsername, screeningFormat);
    // Always apply ban flags — independent of whether full stats were retrieved
    if (stats.tosViolation) updated.lichessTosViolation = true;
    if (stats.verified) {
      updated.lichessRating = stats.currentRating;
      updated.lichessPeakRating = stats.peakRating;
      updated.lichessPeakDate = stats.peakDate;
      updated.lichessGamesCount = stats.gamesCount;
      updated.lichessJoinedAt = stats.joinedAt;
      updated.lichessTosViolation = stats.tosViolation ?? updated.lichessTosViolation;
      updated.lichessRd = stats.rd;
      updated.lichessProv = stats.prov;
      updated.lichessLastPlayedAt = stats.lastPlayedAt;
    }
  }

  if (participant.chessComUsername) {
    const stats = await fetchChessComUserStats(participant.chessComUsername, screeningFormat);
    // Always apply ban flags — independent of whether full stats were retrieved
    if (stats.isClosed) updated.chessComClosed = true;
    if (stats.verified) {
      updated.chessComRating = stats.currentRating;
      updated.chessComPeakRating = stats.peakRating;
      updated.chessComPeakDate = stats.peakDate;
      updated.chessComGamesCount = stats.gamesCount;
      updated.chessComJoinedAt = stats.joinedAt;
      updated.chessComClosed = stats.isClosed ?? updated.chessComClosed;
      updated.chessComRd = stats.rd;
      updated.chessComProv = stats.prov;
      updated.chessComLastPlayedAt = stats.lastPlayedAt;
    }
  }

  updated.verifiedAt = new Date().toISOString();
  return evaluateParticipant(updated, rules);
}
