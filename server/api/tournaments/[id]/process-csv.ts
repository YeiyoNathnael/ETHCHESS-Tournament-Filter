import { defineEventHandler, readBody, readMultipartFormData, createError } from 'h3';
import { db, ensureTablesExist } from '~/server/db';
import { tournaments, participants } from '~/server/db/schema';
import { eq } from 'drizzle-orm';
import { parseAndDeduplicateCsv } from '~/utils/csvParser';
import { fetchChessComUserStats, fetchLichessUserStats, type PlatformUserStats } from '~/utils/chessApi';
import { evaluateParticipantRules, type TournamentRuleLimits } from '~/utils/ruleEngine';

export default defineEventHandler(async (event) => {
  await ensureTablesExist();

  if (event.node.req.method !== 'POST') {
    throw createError({
      statusCode: 405,
      statusMessage: 'Method Not Allowed',
    });
  }

  const idParam = event.context.params?.id;
  const id = Number(idParam);

  if (!idParam || isNaN(id)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid tournament ID',
    });
  }

  // 1. Fetch tournament definition
  const foundTournaments = await db.select().from(tournaments).where(eq(tournaments.id, id));
  if (foundTournaments.length === 0) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Tournament not found',
    });
  }

  const tournament = foundTournaments[0];
  if (!tournament) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Tournament not found',
    });
  }

  // 2. Extract CSV content from request
  let csvContent = '';

  const contentType = event.node.req.headers['content-type'] || '';
  if (contentType.includes('multipart/form-data')) {
    const formData = await readMultipartFormData(event);
    if (formData && formData.length > 0) {
      const fileItem = formData.find((item) => item.name === 'file' || item.name === 'csv' || item.filename);
      if (fileItem && fileItem.data) {
        csvContent = fileItem.data.toString('utf-8');
      }
    }
  } else {
    const body = await readBody(event);
    if (typeof body === 'string') {
      csvContent = body;
    } else if (body && typeof body.csvContent === 'string') {
      csvContent = body.csvContent;
    } else if (body && typeof body.csv === 'string') {
      csvContent = body.csv;
    }
  }

  if (!csvContent || csvContent.trim().length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'No CSV content provided in request body or file upload',
    });
  }

  // 3. Parse and deduplicate CSV
  const parseSummary = parseAndDeduplicateCsv(csvContent);
  const rawList = parseSummary.participants;

  const limits: TournamentRuleLimits = {
    chessComMaxRating: tournament.chessComMaxRating,
    chessComMaxPeak: tournament.chessComMaxPeak,
    chessComMinAgeMonths: tournament.chessComMinAgeMonths,
    chessComMinGames: tournament.chessComMinGames,
    lichessMaxRating: tournament.lichessMaxRating,
    lichessMaxPeak: tournament.lichessMaxPeak,
    lichessMinAgeMonths: tournament.lichessMinAgeMonths,
    lichessMinGames: tournament.lichessMinGames,
  };

  // Clear previous participants for this tournament to re-process cleanly
  await db.delete(participants).where(eq(participants.tournamentId, id));

  // Process in concurrent chunks of 5
  const chunkSize = 5;
  const processedResults = [];
  let eligibleCount = 0;
  let rejectedCount = 0;

  for (let i = 0; i < rawList.length; i += chunkSize) {
    const chunk = rawList.slice(i, i + chunkSize);

    // Throttle slightly to respect Lichess & Chess.com rate limits
    if (i > 0) {
      await new Promise((resolve) => setTimeout(resolve, 150));
    }

    const chunkResults = await Promise.all(
      chunk.map(async (raw) => {
        let chessComStats: PlatformUserStats | null = null;
        let lichessStats: PlatformUserStats | null = null;

        // Eligibility screening is strictly evaluated against Rapid ratings & Rapid peaks
        if (raw.rawChessComUser) {
          chessComStats = await fetchChessComUserStats(raw.rawChessComUser, 'rapid');
        }
        if (raw.rawLichessUser) {
          lichessStats = await fetchLichessUserStats(raw.rawLichessUser, 'rapid');
        }

        const ruleRes = evaluateParticipantRules(
          limits,
          raw.rawChessComUser,
          chessComStats,
          raw.rawLichessUser,
          lichessStats
        );

        if (ruleRes.systemVerdict === 'ELIGIBLE') {
          eligibleCount++;
        } else {
          rejectedCount++;
        }

        const newParticipant = {
          tournamentId: id,
          telegramUsername: raw.telegramUsername,
          rawChessComUser: raw.rawChessComUser,
          rawLichessUser: raw.rawLichessUser,
          chessComVerified: chessComStats?.verified ?? false,
          chessComCurrentRating: chessComStats?.currentRating ?? null,
          chessComPeakRating: chessComStats?.peakRating ?? null,
          chessComGamesCount: chessComStats?.gamesCount ?? 0,
          chessComJoinedAt: chessComStats?.joinedAt ?? null,
          chessComClosed: chessComStats?.isClosed ?? false,
          lichessVerified: lichessStats?.verified ?? false,
          lichessCurrentRating: lichessStats?.currentRating ?? null,
          lichessPeakRating: lichessStats?.peakRating ?? null,
          lichessGamesCount: lichessStats?.gamesCount ?? 0,
          lichessJoinedAt: lichessStats?.joinedAt ?? null,
          lichessTosViolation: lichessStats?.tosViolation ?? false,
          systemVerdict: ruleRes.systemVerdict,
          rejectionReasons: ruleRes.rejectionReasons,
          organizerStatus: 'PENDING' as const,
          organizerNotes: null,
          confirmedAt: null,
          submittedAt: raw.submittedAt,
        };

        return newParticipant;
      })
    );

    processedResults.push(...chunkResults);
  }

  // Bulk insert into SQLite database if items exist
  let savedParticipants: (typeof participants.$inferSelect)[] = [];
  if (processedResults.length > 0) {
    savedParticipants = await db.insert(participants).values(processedResults).returning();
  }

  return {
    success: true,
    totalRowsProcessed: parseSummary.totalRowsProcessed,
    duplicatesRemoved: parseSummary.duplicatesRemoved,
    processedCount: savedParticipants.length,
    eligibleCount,
    rejectedCount,
    participants: savedParticipants,
  };
});
