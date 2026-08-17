import type { Participant } from '~/types/tournament';

export interface PgnGame {
  id: string;
  headers: Record<string, string>;
  white: string;
  black: string;
  result: '1-0' | '0-1' | '1/2-1/2' | '*';
  whiteElo?: number;
  blackElo?: number;
  date?: string;
  round?: string;
  site?: string;
  event?: string;
  movesText: string;
}

export type RatingMode = 'blitz' | 'rapid';

export interface UpsetEntry {
  id: string;
  rank: number;
  winnerHandle: string;
  winnerMatchedParticipant?: Participant;
  winnerRating: number | null;
  winnerRatingNote?: string;
  loserHandle: string;
  loserMatchedParticipant?: Participant;
  loserRating: number | null;
  loserRatingNote?: string;
  ratingDiff: number;
  platform: 'lichess' | 'chessCom';
  ratingMode: RatingMode;
  game: PgnGame;
}

export interface UpsetAnalysisResult {
  totalGamesParsed: number;
  decisiveGamesCount: number;
  matchedPlayersCount: number;
  lichessUpsets: UpsetEntry[];
  chessComUpsets: UpsetEntry[];
}

/**
 * Normalizes a handle string for case-insensitive matching without @ prefix or extra quotes
 */
function normalizeHandle(handle?: string | null): string {
  if (!handle || typeof handle !== 'string') return '';
  return handle.trim().toLowerCase().replace(/^@/, '').replace(/^["']|["']$/g, '');
}

/**
 * Parses raw PGN text into an array of PgnGame objects
 */
export function parsePgnText(pgnText: string): PgnGame[] {
  if (!pgnText || !pgnText.trim()) return [];

  const rawGames = pgnText.split(/\[Event\s+/i);
  const games: PgnGame[] = [];

  for (let i = 0; i < rawGames.length; i++) {
    const rawChunk = rawGames[i].trim();
    if (!rawChunk) continue;

    // Re-attach [Event if omitted by split
    const fullChunk = rawChunk.startsWith('[') ? rawChunk : `[Event ${rawChunk}`;

    const headers: Record<string, string> = {};
    const headerRegex = /\[(\w+)\s+"([^"]*)"\]/g;
    let match: RegExpExecArray | null;

    while ((match = headerRegex.exec(fullChunk)) !== null) {
      const key = match[1];
      const val = match[2];
      headers[key] = val;
    }

    // Extract moves text (content after the last closing header bracket ])
    const lastHeaderEnd = fullChunk.lastIndexOf(']');
    const movesText = lastHeaderEnd !== -1 ? fullChunk.substring(lastHeaderEnd + 1).trim() : fullChunk;

    const white = headers.White || 'Unknown White';
    const black = headers.Black || 'Unknown Black';
    const result = (headers.Result || '*') as PgnGame['result'];
    const whiteElo = headers.WhiteElo && !isNaN(Number(headers.WhiteElo)) ? Number(headers.WhiteElo) : undefined;
    const blackElo = headers.BlackElo && !isNaN(Number(headers.BlackElo)) ? Number(headers.BlackElo) : undefined;

    games.push({
      id: `game-${i + 1}-${Date.now().toString(36)}`,
      headers,
      white,
      black,
      result,
      whiteElo,
      blackElo,
      date: headers.Date || headers.UTCDate,
      round: headers.Round,
      site: headers.Site,
      event: headers.Event,
      movesText,
    });
  }

  return games;
}

/**
 * Finds a matching participant from the participants list given a handle string
 */
export function findParticipantByHandle(handle: string, participants: Participant[]): Participant | undefined {
  const norm = normalizeHandle(handle);
  if (!norm) return undefined;

  return participants.find((p) => {
    const pLichess = normalizeHandle(p.lichessUsername);
    const pChessCom = normalizeHandle(p.chessComUsername);
    const pTg = normalizeHandle(p.telegramHandle);

    return norm === pLichess || norm === pChessCom || norm === pTg;
  });
}

/**
 * Analyzes PGN games and returns 2 sorted arrays of upsets: Lichess & Chess.com (CDC)
 */
export function analyzeTournamentUpsets(
  games: PgnGame[],
  participants: Participant[],
  ratingMode: RatingMode = 'blitz'
): UpsetAnalysisResult {
  const lichessUpsets: UpsetEntry[] = [];
  const chessComUpsets: UpsetEntry[] = [];
  const matchedHandles = new Set<string>();

  let decisiveGamesCount = 0;

  for (const game of games) {
    if (game.result !== '1-0' && game.result !== '0-1') {
      continue; // Skip draws and unfinished games
    }

    decisiveGamesCount++;

    const isWhiteWinner = game.result === '1-0';
    const rawWinner = isWhiteWinner ? game.white : game.black;
    const rawLoser = isWhiteWinner ? game.black : game.white;
    const pgnWinnerElo = isWhiteWinner ? game.whiteElo : game.blackElo;
    const pgnLoserElo = isWhiteWinner ? game.blackElo : game.whiteElo;

    const winnerP = findParticipantByHandle(rawWinner, participants);
    const loserP = findParticipantByHandle(rawLoser, participants);

    if (winnerP) matchedHandles.add(winnerP.id);
    if (loserP) matchedHandles.add(loserP.id);

    const siteLower = (game.site || '').toLowerCase();
    const isLichessPgn = siteLower.includes('lichess') || (!siteLower.includes('chess.com') && !!pgnWinnerElo);
    const isChessComPgn = siteLower.includes('chess.com');

    // --- 1. Lichess Upset Calculation (Strict Lichess Ratings) ---
    const winnerLichessRating = winnerP?.lichessRating ?? winnerP?.lichessPeakRating ?? (isLichessPgn ? pgnWinnerElo : null);
    const loserLichessRating = loserP?.lichessRating ?? loserP?.lichessPeakRating ?? (isLichessPgn ? pgnLoserElo : null);

    if (winnerLichessRating && loserLichessRating && loserLichessRating > winnerLichessRating) {
      const diff = loserLichessRating - winnerLichessRating;
      lichessUpsets.push({
        id: `lichess-${game.id}`,
        rank: 0,
        winnerHandle: rawWinner,
        winnerMatchedParticipant: winnerP,
        winnerRating: winnerLichessRating,
        loserHandle: rawLoser,
        loserMatchedParticipant: loserP,
        loserRating: loserLichessRating,
        ratingDiff: diff,
        platform: 'lichess',
        ratingMode,
        game,
      });
    }

    // --- 2. Chess.com (CDC) Upset Calculation (Strict Chess.com Ratings) ---
    const winnerCdcRating = winnerP?.chessComRating ?? winnerP?.chessComPeakRating ?? (isChessComPgn ? pgnWinnerElo : null);
    const loserCdcRating = loserP?.chessComRating ?? loserP?.chessComPeakRating ?? (isChessComPgn ? pgnLoserElo : null);

    if (winnerCdcRating && loserCdcRating && loserCdcRating > winnerCdcRating) {
      const diff = loserCdcRating - winnerCdcRating;
      chessComUpsets.push({
        id: `cdc-${game.id}`,
        rank: 0,
        winnerHandle: rawWinner,
        winnerMatchedParticipant: winnerP,
        winnerRating: winnerCdcRating,
        loserHandle: rawLoser,
        loserMatchedParticipant: loserP,
        loserRating: loserCdcRating,
        ratingDiff: diff,
        platform: 'chessCom',
        ratingMode,
        game,
      });
    }
  }

  // Sort descending by ratingDiff
  lichessUpsets.sort((a, b) => b.ratingDiff - a.ratingDiff);
  chessComUpsets.sort((a, b) => b.ratingDiff - a.ratingDiff);

  // Assign ranks
  lichessUpsets.forEach((item, index) => {
    item.rank = index + 1;
  });

  chessComUpsets.forEach((item, index) => {
    item.rank = index + 1;
  });

  return {
    totalGamesParsed: games.length,
    decisiveGamesCount,
    matchedPlayersCount: matchedHandles.size,
    lichessUpsets,
    chessComUpsets,
  };
}
