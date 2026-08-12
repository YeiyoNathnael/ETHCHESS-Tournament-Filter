import type { PlatformUserStats } from './chessApi';

export interface TournamentRuleLimits {
  chessComMaxRating: number;
  chessComMaxPeak: number;
  chessComMinAgeMonths: number;
  chessComMinGames: number;
  lichessMaxRating: number;
  lichessMaxPeak: number;
  lichessMinAgeMonths: number;
  lichessMinGames: number;
}

export interface RuleEvaluationResult {
  systemVerdict: 'ELIGIBLE' | 'REJECTED';
  rejectionReasons: string[];
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
