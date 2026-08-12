import type { PlatformUserStats } from './chessApi';
import type { TrustScoreDetails } from '~/types/tournament';

export interface TournamentRuleLimits {
  chessComMaxRating: number;
  chessComMaxPeak: number;
  chessComMinAgeMonths: number;
  chessComMinGames: number;
  lichessMaxRating: number;
  lichessMaxPeak: number;
  lichessMinAgeMonths: number;
  lichessMinGames: number;
  minimumTrustScore?: number;
  peakWindowMonths?: number;
  rejectProvisional?: boolean;
}

export interface RuleEvaluationResult {
  systemVerdict: 'ELIGIBLE' | 'REJECTED';
  rejectionReasons: string[];
  trustScore?: number;
  trustDetails?: TrustScoreDetails;
}

/**
 * Standard Normal Cumulative Distribution Function (CDF) Φ(z)
 * Φ(z) = (1 + erf(z / sqrt(2))) / 2
 * Uses Abramowitz and Stegun formula 7.1.26 approximation for erf(x).
 */
export function standardNormalCdf(z: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.sqrt(2);

  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  const erf = sign * y;
  return (1.0 + erf) / 2.0;
}

/**
 * Game Count Reliability Factor (G) based on FIDE & USCF thresholds.
 * <5 games: 3.0 (FIDE initial threshold)
 * 5-25 games: 2.0 (USCF provisional)
 * 26-29 games: 1.3 (USCF established boundary)
 * >=30 games: 1.0 (FIDE K-factor drops, Lichess settled)
 */
export function getGameCountFactor(gamesCount: number): number {
  if (gamesCount < 5) return 3.0;
  if (gamesCount <= 25) return 2.0;
  if (gamesCount <= 29) return 1.3;
  return 1.0;
}

/**
 * Computes ETHCHESS Trust Score (0-100) for a participant on a platform.
 * Score = Φ((limit - effectiveRating) / effectiveRd) * 100
 */
export function computePlatformTrustScore(
  stats: PlatformUserStats | null,
  maxRatingLimit: number,
  peakWindowMonths: number = 24,
  platform: 'chessCom' | 'lichess'
): TrustScoreDetails | undefined {
  if (!stats || !stats.verified) return undefined;

  const rating = stats.currentRating ?? maxRatingLimit;
  const peak = stats.peakRating ?? rating;
  const isProv = stats.prov ?? false;
  const rd = stats.rd ?? (isProv ? 200 : 80);
  const games = stats.gamesCount ?? 0;

  // Calculate peak recency weight
  let monthsSincePeak = 0;
  if (stats.peakDate) {
    const peakMs = new Date(stats.peakDate).getTime();
    if (!isNaN(peakMs) && peakMs > 0) {
      monthsSincePeak = Math.max(0, (Date.now() - peakMs) / (1000 * 60 * 60 * 24 * 30.4375));
    }
  }

  const peakWeight = peakWindowMonths > 0 ? Math.max(0, 1 - monthsSincePeak / peakWindowMonths) : 0;
  const peakContribution = peak * peakWeight + rating * (1 - peakWeight);
  const effectiveRating = Math.max(rating, peakContribution);

  const gameCountFactor = getGameCountFactor(games);
  const effectiveRd = rd * gameCountFactor;

  const zScore = (maxRatingLimit - effectiveRating) / (effectiveRd || 1);
  const rawProb = standardNormalCdf(zScore);
  const score = Math.min(100, Math.max(0, Math.round(rawProb * 100)));

  let verdictBand: TrustScoreDetails['verdictBand'] = 'REJECT';
  if (score >= 90) verdictBand = 'EXCELLENT';
  else if (score >= 70) verdictBand = 'GOOD';
  else if (score >= 50) verdictBand = 'BORDERLINE';
  else if (score >= 30) verdictBand = 'POOR';
  else verdictBand = 'REJECT';

  let explanation = `Trust Score ${score}/100: ${Math.round(rawProb * 100)}% statistical probability true strength ≤ ${maxRatingLimit}.`;
  if (effectiveRating > rating) {
    explanation += ` Peak (${peak}) weighted at ${Math.round(peakWeight * 100)}% (${Math.round(monthsSincePeak)} mo ago).`;
  }
  if (gameCountFactor > 1) {
    explanation += ` Expanded uncertainty due to ${games} total games (factor ×${gameCountFactor}).`;
  }

  return {
    score,
    zScore: Number(zScore.toFixed(3)),
    effectiveRating: Math.round(effectiveRating),
    effectiveRd: Math.round(effectiveRd),
    gameCountFactor,
    peakWeight: Number(peakWeight.toFixed(2)),
    peakContribution: Math.round(peakContribution),
    verdictBand,
    explanation,
    rd,
    gamesCount: games,
    lastPlayedAt: stats.lastPlayedAt,
    isProvisional: isProv,
    platform,
  };
}

/**
 * Calculates full months elapsed from a given ISO date string to today.
 * Returns null if the date is missing/invalid (caller decides how to handle).
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
 * Evaluates participant stats against tournament eligibility rules.
 *
 * Exact Flow:
 * 1. Check account existence for both platforms.
 * 2. If BOTH exist & are verified -> do DUAL-PLATFORM check (AND ratings, OR activity).
 * 3. If ONLY ONE exists -> do SINGLE-PLATFORM check on existing account + add statement that the other didn't exist.
 * 4. If NEITHER exists -> REJECTED.
 */
export function evaluateParticipantRules(
  limitsInput: TournamentRuleLimits,
  rawChessComUser: string | null,
  chessComStats: PlatformUserStats | null,
  rawLichessUser: string | null,
  lichessStats: PlatformUserStats | null
): RuleEvaluationResult {
  const rejectionReasons: string[] = [];

  const limits = {
    chessComMaxRating: limitsInput?.chessComMaxRating ?? 1500,
    chessComMaxPeak: limitsInput?.chessComMaxPeak ?? 1600,
    chessComMinGames: limitsInput?.chessComMinGames ?? 30,
    chessComMinAgeMonths: limitsInput?.chessComMinAgeMonths ?? 3,
    lichessMaxRating: limitsInput?.lichessMaxRating ?? 1500,
    lichessMaxPeak: limitsInput?.lichessMaxPeak ?? 1600,
    lichessMinGames: limitsInput?.lichessMinGames ?? 30,
    lichessMinAgeMonths: limitsInput?.lichessMinAgeMonths ?? 3,
  };

  const hasChessComHandle = Boolean(rawChessComUser);
  const hasLichessHandle = Boolean(rawLichessUser);

  const isChessComVerified = Boolean(chessComStats?.verified);
  const isLichessVerified = Boolean(lichessStats?.verified);

  // Immediate ToS Violation Check for Lichess
  if (lichessStats?.tosViolation) {
    rejectionReasons.push('Lichess Terms of Service (ToS) Violation detected (account flagged by Lichess engine).');
    return { systemVerdict: 'REJECTED', rejectionReasons };
  }

  // Immediate Closed / Fair Play Violation Check for Chess.com
  if (chessComStats?.isClosed) {
    rejectionReasons.push('Chess.com account closed or flagged for Fair Play violation.');
    return { systemVerdict: 'REJECTED', rejectionReasons };
  }

  let evaluationFailed = false;

  // ─── SCENARIO 1: BOTH ACCOUNTS EXIST & ARE VERIFIED ────────────────────────
  if (isChessComVerified && isLichessVerified && chessComStats && lichessStats) {
    // RATINGS: AND — both must pass
    if (chessComStats.currentRating !== null && chessComStats.currentRating > limits.chessComMaxRating) {
      rejectionReasons.push(
        `Chess.com rating (${chessComStats.currentRating}) exceeds limit of ${limits.chessComMaxRating}`
      );
      evaluationFailed = true;
    }
    if (chessComStats.peakRating !== null && chessComStats.peakRating > limits.chessComMaxPeak) {
      rejectionReasons.push(
        `Chess.com peak rating (${chessComStats.peakRating}) exceeds peak limit of ${limits.chessComMaxPeak}`
      );
      evaluationFailed = true;
    }
    if (lichessStats.currentRating !== null && lichessStats.currentRating > limits.lichessMaxRating) {
      rejectionReasons.push(
        `Lichess rating (${lichessStats.currentRating}) exceeds limit of ${limits.lichessMaxRating}`
      );
      evaluationFailed = true;
    }
    if (lichessStats.peakRating !== null && lichessStats.peakRating > limits.lichessMaxPeak) {
      rejectionReasons.push(
        `Lichess peak rating (${lichessStats.peakRating}) exceeds peak limit of ${limits.lichessMaxPeak}`
      );
      evaluationFailed = true;
    }

    // ACTIVITY: OR — at least ONE platform passes (games AND age both pass for that platform)
    const chessComAgeMonths = monthsFromDate(chessComStats.joinedAt);
    const lichessAgeMonths = monthsFromDate(lichessStats.joinedAt);

    const chessComAgePass = chessComAgeMonths === null || chessComAgeMonths >= limits.chessComMinAgeMonths;
    const lichessAgePass = lichessAgeMonths === null || lichessAgeMonths >= limits.lichessMinAgeMonths;

    const chessComActivityPass = chessComStats.gamesCount >= limits.chessComMinGames && chessComAgePass;
    const lichessActivityPass = lichessStats.gamesCount >= limits.lichessMinGames && lichessAgePass;

    if (!chessComActivityPass && !lichessActivityPass) {
      const chessAgeStr = chessComAgeMonths !== null ? `${chessComAgeMonths}/${limits.chessComMinAgeMonths} months` : 'age unknown';
      const lichessAgeStr = lichessAgeMonths !== null ? `${lichessAgeMonths}/${limits.lichessMinAgeMonths} months` : 'age unknown';
      rejectionReasons.push(
        `Activity requirement not met: Neither platform meets minimum activity. ` +
        `Chess.com: ${chessComStats.gamesCount}/${limits.chessComMinGames} games, ${chessAgeStr}. ` +
        `Lichess: ${lichessStats.gamesCount}/${limits.lichessMinGames} games, ${lichessAgeStr}.`
      );
      evaluationFailed = true;
    }
  }

  // ─── SCENARIO 2: ONLY CHESS.COM EXISTS & IS VERIFIED ───────────────────────
  else if (isChessComVerified && chessComStats) {
    if (hasLichessHandle && !isLichessVerified) {
      rejectionReasons.push(`Note: Lichess account '${rawLichessUser}' does not exist or could not be verified.`);
    }

    if (chessComStats.currentRating !== null && chessComStats.currentRating > limits.chessComMaxRating) {
      rejectionReasons.push(
        `Chess.com rating (${chessComStats.currentRating}) exceeds limit of ${limits.chessComMaxRating}`
      );
      evaluationFailed = true;
    }
    if (chessComStats.peakRating !== null && chessComStats.peakRating > limits.chessComMaxPeak) {
      rejectionReasons.push(
        `Chess.com peak rating (${chessComStats.peakRating}) exceeds peak limit of ${limits.chessComMaxPeak}`
      );
      evaluationFailed = true;
    }
    if (chessComStats.gamesCount < limits.chessComMinGames) {
      rejectionReasons.push(
        `Chess.com games (${chessComStats.gamesCount}/${limits.chessComMinGames}) below minimum`
      );
      evaluationFailed = true;
    }
    const chessComAgeMonths = monthsFromDate(chessComStats.joinedAt);
    if (chessComAgeMonths !== null && chessComAgeMonths < limits.chessComMinAgeMonths) {
      rejectionReasons.push(
        `Chess.com account age (${chessComAgeMonths}/${limits.chessComMinAgeMonths} months) below minimum`
      );
      evaluationFailed = true;
    }
  }

  // ─── SCENARIO 3: ONLY LICHESS EXISTS & IS VERIFIED ─────────────────────────
  else if (isLichessVerified && lichessStats) {
    if (hasChessComHandle && !isChessComVerified) {
      rejectionReasons.push(`Note: Chess.com account '${rawChessComUser}' does not exist or could not be verified.`);
    }

    if (lichessStats.currentRating !== null && lichessStats.currentRating > limits.lichessMaxRating) {
      rejectionReasons.push(
        `Lichess rating (${lichessStats.currentRating}) exceeds limit of ${limits.lichessMaxRating}`
      );
      evaluationFailed = true;
    }
    if (lichessStats.peakRating !== null && lichessStats.peakRating > limits.lichessMaxPeak) {
      rejectionReasons.push(
        `Lichess peak rating (${lichessStats.peakRating}) exceeds peak limit of ${limits.lichessMaxPeak}`
      );
      evaluationFailed = true;
    }
    if (lichessStats.gamesCount < limits.lichessMinGames) {
      rejectionReasons.push(
        `Lichess games (${lichessStats.gamesCount}/${limits.lichessMinGames}) below minimum`
      );
      evaluationFailed = true;
    }
    const lichessAgeMonths = monthsFromDate(lichessStats.joinedAt);
    if (lichessAgeMonths !== null && lichessAgeMonths < limits.lichessMinAgeMonths) {
      rejectionReasons.push(
        `Lichess account age (${lichessAgeMonths}/${limits.lichessMinAgeMonths} months) below minimum`
      );
      evaluationFailed = true;
    }
  }

  // ─── SCENARIO 4: NEITHER ACCOUNT EXISTS OR COULD BE VERIFIED ──────────────
  else {
    if (hasChessComHandle) {
      rejectionReasons.push(`Chess.com account '${rawChessComUser}' does not exist or could not be verified.`);
    }
    if (hasLichessHandle) {
      rejectionReasons.push(`Lichess account '${rawLichessUser}' does not exist or could not be verified.`);
    }
    if (!hasChessComHandle && !hasLichessHandle) {
      rejectionReasons.push('No Chess.com or Lichess handle was provided.');
    }
    evaluationFailed = true;
  }

  const systemVerdict: 'ELIGIBLE' | 'REJECTED' = evaluationFailed ? 'REJECTED' : 'ELIGIBLE';

  return { systemVerdict, rejectionReasons };
}
