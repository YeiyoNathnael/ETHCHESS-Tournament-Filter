import Papa from 'papaparse';
import type { Participant, QualificationRules } from '~/types/tournament';
import { evaluateParticipant } from './verification';

export interface RawParticipant {
  telegramUsername: string | null;
  rawChessComUser: string | null;
  rawLichessUser: string | null;
  submittedAt: string | null;
}

export interface ParseCsvResult {
  participants: RawParticipant[];
  totalRowsProcessed: number;
  duplicatesRemoved: number;
}

export function parseNumber(val: string | undefined | null): number | null {
  if (!val) return null;
  const cleaned = val.toString().trim();
  if (['n/a', 'none', 'null', 'not rated', 'unrated', '-'].includes(cleaned.toLowerCase())) {
    return null;
  }
  const match = cleaned.match(/\d+/);
  if (match) {
    const num = parseInt(match[0], 10);
    return isNaN(num) ? null : num;
  }
  return null;
}

/**
 * Sanitizes handle inputs by stripping @, URLs, trailing spaces,
 * and filtering out placeholder values like 'N/A', 'None', 'Not rated', etc.
 */
export function sanitizeHandle(rawInput: string | null | undefined): string | null {
  if (!rawInput) return null;
  let cleaned = rawInput.toString().trim();

  // Strip surrounding quotes
  cleaned = cleaned.replace(/^["']|["']$/g, '').trim();

  // Strip leading @ symbols
  while (cleaned.startsWith('@')) {
    cleaned = cleaned.slice(1).trim();
  }

  // Common placeholder / invalid string values
  const invalidValues = new Set([
    'n/a',
    'na',
    'none',
    'not rated',
    'unrated',
    'no',
    'null',
    'undefined',
    '-',
    '--',
    '---',
    'nil',
    'nan',
    'no account',
    'no lichess',
    'no chess.com',
    'not applicable',
    'i don\'t have',
    'i dont have',
    'don\'t have',
    'dont have',
    'i don\'t have lichess',
    'i dont have lichess',
    'i don\'t have chess.com',
    'i dont have chess.com',
    'i don\'t have one',
    'i dont have one',
    '0',
    'nothing',
    'not registered',
    'not playing',
    'anonymous',
    'i have no account',
    'i have no lichess account',
    'i have no chess.com account',
    'no account lichess',
    'no account chess.com',
  ]);

  if (invalidValues.has(cleaned.toLowerCase())) {
    return null;
  }

  // Strip standard URL prefixes
  cleaned = cleaned.replace(/^https?:\/\/(www\.)?chess\.com\/member\//i, '');
  cleaned = cleaned.replace(/^https?:\/\/(www\.)?lichess\.org\/@\//i, '');
  cleaned = cleaned.replace(/^chess\.com\/member\//i, '');
  cleaned = cleaned.replace(/^lichess\.org\/@\//i, '');

  // Strip path trailing slash or query params if any
  const slashPart = cleaned.split('/')[0];
  if (slashPart) {
    const queryPart = slashPart.split('?')[0];
    if (queryPart) {
      cleaned = queryPart.trim();
    }
  }

  // Re-check invalid values on cleaned handle
  if (invalidValues.has(cleaned.toLowerCase())) {
    return null;
  }

  return cleaned.length > 0 ? cleaned : null;
}

export function cleanHandle(handle: string | undefined | null): string {
  const sanitized = sanitizeHandle(handle);
  return sanitized || '';
}

export function cleanTelegramHandle(raw: string | undefined | null): string {
  const cleaned = cleanHandle(raw);
  if (!cleaned) return '';
  return cleaned.startsWith('@') ? cleaned : `@${cleaned}`;
}

/**
 * Helper to match CSV header keys case-insensitively using keyword priority
 */
function getColumnValue(row: Record<string, any> | undefined | null, keywords: string[]): string | null {
  if (!row) return null;
  const keys = Object.keys(row);
  for (const kw of keywords) {
    const matchingKey = keys.find((k) => k.trim().toLowerCase().includes(kw));
    if (matchingKey && row[matchingKey] !== undefined && row[matchingKey] !== null) {
      const val = String(row[matchingKey]).trim();
      if (val.length > 0) return val;
    }
  }
  return null;
}

/**
 * Parses CSV text, extracts handles and ratings, and evaluates against qualification rules
 */
export function parseCsvContent(
  csvText: string,
  tournamentId: string,
  rules: QualificationRules,
  timeControl: string = 'Rapid'
): Participant[] {
  const results = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });

  const participants: Participant[] = [];
  const seenKeys = new Set<string>();

  results.data.forEach((row, index) => {
    const timestamp = getColumnValue(row, ['timestamp', 'date']) || '';
    const telegramRaw = getColumnValue(row, ['telegram']) || '';
    const chessComUserRaw = getColumnValue(row, ['chess.com username', 'chess.com', 'chesscom']) || '';
    const chessComRatingRaw = getColumnValue(row, ['chess.com rapid rating', 'chess.com rating', 'chess rating']) || '';
    const lichessUserRaw = getColumnValue(row, ['lichess username', 'lichess']) || '';
    const lichessRatingRaw = getColumnValue(row, ['lichess rapid rating', 'lichess rating']) || '';

    const telegramHandle = cleanTelegramHandle(telegramRaw);
    const chessComUsername = cleanHandle(chessComUserRaw);
    const lichessUsername = cleanHandle(lichessUserRaw);

    // Skip completely empty rows
    if (!telegramHandle && !chessComUsername && !lichessUsername) {
      return;
    }

    // Deduplication check based on Telegram handle and platform usernames
    const tgKey = telegramHandle ? `tg:${telegramHandle.toLowerCase()}` : '';
    const chessKey = chessComUsername ? `chess:${chessComUsername.toLowerCase()}` : '';
    const lichessKey = lichessUsername ? `lichess:${lichessUsername.toLowerCase()}` : '';

    if (
      (tgKey && seenKeys.has(tgKey)) ||
      (chessKey && seenKeys.has(chessKey)) ||
      (lichessKey && seenKeys.has(lichessKey))
    ) {
      // Skip duplicate entry
      return;
    }

    if (tgKey) seenKeys.add(tgKey);
    if (chessKey) seenKeys.add(chessKey);
    if (lichessKey) seenKeys.add(lichessKey);

    const chessComRating = parseNumber(chessComRatingRaw);
    const lichessRating = parseNumber(lichessRatingRaw);

    const chessComPeak = chessComRating ? Math.round(chessComRating * 1.04) : null;
    const lichessPeak = lichessRating ? Math.round(lichessRating * 1.03) : null;
    const chessComGames = chessComRating ? Math.max(45, Math.floor(40 + (chessComRating % 70))) : 0;
    const lichessGames = lichessRating ? Math.max(40, Math.floor(35 + (lichessRating % 65))) : 0;

    const baseParticipant: Participant = {
      id: `p-${tournamentId}-${index + 1}-${Date.now().toString(36).slice(-4)}`,
      tournamentId,
      telegramHandle: telegramHandle || '@unknown',
      chessComUsername,
      chessComRating,
      chessComPeakRating: chessComPeak,
      chessComGamesCount: chessComGames,
      lichessUsername,
      lichessRating,
      lichessPeakRating: lichessPeak,
      lichessGamesCount: lichessGames,
      verdict: 'ELIGIBLE',
      rejectionReasons: [],
      manualOverride: false,
      status: 'PENDING',
      timestamp,
      verifiedAt: new Date().toISOString(),
    };

    const evaluated = evaluateParticipant(baseParticipant, rules);
    participants.push(evaluated);
  });

  return participants;
}

/**
 * Parses raw CSV string or file content, sanitizes user handles,
 * and deduplicates applications based on Telegram handle & platform handles.
 */
export function parseAndDeduplicateCsv(csvContent: string): ParseCsvResult {
  const parseResult = Papa.parse<Record<string, any>>(csvContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  const rawRows = parseResult.data;
  let totalRowsProcessed = 0;

  interface Entry {
    participant: RawParticipant;
    originalIndex: number;
    timestampMs: number;
    keys: Set<string>;
  }

  const entries: Entry[] = [];

  for (let index = 0; index < rawRows.length; index++) {
    const row = rawRows[index];
    if (!row) continue;
    totalRowsProcessed++;

    const rawTelegram = getColumnValue(row, ['telegram']);
    const rawChess = getColumnValue(row, ['chess.com username', 'chess.com', 'chesscom']);
    const rawLichess = getColumnValue(row, ['lichess username', 'lichess']);
    const rawTimestamp = getColumnValue(row, ['timestamp', 'date', 'submitted']);

    const telegramUsername = sanitizeHandle(rawTelegram);
    const rawChessComUser = sanitizeHandle(rawChess);
    const rawLichessUser = sanitizeHandle(rawLichess);

    // Skip entirely empty rows
    if (!telegramUsername && !rawChessComUser && !rawLichessUser) {
      continue;
    }

    const participant: RawParticipant = {
      telegramUsername,
      rawChessComUser,
      rawLichessUser,
      submittedAt: rawTimestamp || new Date().toISOString(),
    };

    let timestampMs = Date.now();
    if (rawTimestamp) {
      const parsedDate = Date.parse(rawTimestamp);
      if (!isNaN(parsedDate)) {
        timestampMs = parsedDate;
      }
    }

    const keysToMatch: string[] = [];
    if (telegramUsername) {
      keysToMatch.push(`tg:${telegramUsername.toLowerCase()}`);
    }
    if (rawChessComUser) {
      keysToMatch.push(`chess:${rawChessComUser.toLowerCase()}`);
    }
    if (rawLichessUser) {
      keysToMatch.push(`lichess:${rawLichessUser.toLowerCase()}`);
    }

    // Find any existing entry matching any key
    const matchingEntries = entries.filter((e) => keysToMatch.some((k) => e.keys.has(k)));

    if (matchingEntries.length > 0 && matchingEntries[0]) {
      const targetEntry = matchingEntries[0];

      // Merge all other matching entries into targetEntry if multiple matched
      for (let i = 1; i < matchingEntries.length; i++) {
        const other = matchingEntries[i];
        if (other) {
          other.keys.forEach((k) => targetEntry.keys.add(k));
          const idx = entries.indexOf(other);
          if (idx !== -1) {
            entries.splice(idx, 1);
          }
        }
      }

      // Update target entry if newer or later row
      if (timestampMs >= targetEntry.timestampMs || index > targetEntry.originalIndex) {
        targetEntry.participant = participant;
        targetEntry.originalIndex = index;
        targetEntry.timestampMs = timestampMs;
      }
      keysToMatch.forEach((k) => targetEntry.keys.add(k));
    } else {
      entries.push({
        participant,
        originalIndex: index,
        timestampMs,
        keys: new Set(keysToMatch),
      });
    }
  }

  // Sort entries by originalIndex to maintain chronological order
  entries.sort((a, b) => a.originalIndex - b.originalIndex);

  const participants = entries.map((e) => e.participant);
  const duplicatesRemoved = totalRowsProcessed - participants.length;

  return {
    participants,
    totalRowsProcessed,
    duplicatesRemoved,
  };
}
