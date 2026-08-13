import { defineEventHandler, readBody, readMultipartFormData, createError } from 'h3';
import { db, ensureTablesExist } from '~/server/db';
import { tournaments, participants } from '~/server/db/schema';
import { eq } from 'drizzle-orm';
import { parseAndDeduplicateCsv } from '~/utils/csvParser';
import { fetchLichessUsersBulk, fetchChessComUsersBulk } from '~/utils/chessApi';
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
  if (isNaN(id) || id <= 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid tournament ID',
    });
  }

  // 1. Verify tournament exists
  const existing = await db.select().from(tournaments).where(eq(tournaments.id, id));
  if (!existing || existing.length === 0) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Tournament not found',
    });
  }
  const tournament = existing[0];

  // 2. Extract CSV string from multipart/form-data or JSON body
  let csvContent = '';
  const contentType = event.node.req.headers['content-type'] || '';

  if (contentType.includes('multipart/form-data')) {
    const multipart = await readMultipartFormData(event);
    if (multipart && multipart.length > 0) {
      const fileItem = multipart.find((item) => item.name === 'file' || item.name === 'csv');
      if (fileItem) {
        csvContent = fileItem.data.toString('utf-8');
      }
    }
  } else {
    const body = await readBody(event);
    if (body) {
      if (typeof body === 'string') {
        csvContent = body;
      } else if (body.csvContent && typeof body.csvContent === 'string') {
        csvContent = body.csvContent;
      }
    }
  }

  if (!csvContent || !csvContent.trim()) {
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
    minimumTrustScore: tournament.minimumTrustScore ?? 65,
  };

  console.log(`[Process-CSV] Processing ${rawList.length} candidates for Tournament ID: ${id}`);

  // Collect platform usernames for bulk fetching
  const lichessUsernames = rawList
    .map((r) => r.rawLichessUser)
    .filter((u): u is string => !!u);

  const chessComUsernames = rawList
    .map((r) => r.rawChessComUser)
    .filter((u): u is string => !!u);

  console.log(`[Process-CSV] Parallel bulk fetching ${lichessUsernames.length} Lichess & ${chessComUsernames.length} Chess.com handles...`);

  // Parallel bulk fetch both platforms
  const [lichessBulkProfiles, chessComBulkProfiles] = await Promise.all([
    fetchLichessUsersBulk(lichessUsernames, 'rapid'),
    fetchChessComUsersBulk(chessComUsernames, 'rapid'),
  ]);

  console.log(`[Process-CSV] Parallel bulk fetch complete. Received ${lichessBulkProfiles.size} Lichess & ${chessComBulkProfiles.size} Chess.com profile responses.`);

  const processedResults = [];
  let eligibleCount = 0;
  let rejectedCount = 0;

  for (const raw of rawList) {
    const chessComStats = raw.rawChessComUser
      ? chessComBulkProfiles.get(raw.rawChessComUser.toLowerCase()) ?? null
      : null;

    const lichessStats = raw.rawLichessUser
      ? lichessBulkProfiles.get(raw.rawLichessUser.toLowerCase()) ?? null
      : null;

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

    processedResults.push({
      tournamentId: id,
      telegramUsername: raw.telegramUsername,
      rawChessComUser: raw.rawChessComUser,
      rawLichessUser: raw.rawLichessUser,
      chessComVerified: chessComStats?.verified ?? false,
      chessComCurrentRating: chessComStats?.currentRating ?? null,
      chessComPeakRating: chessComStats?.peakRating ?? null,
      chessComPeakDate: chessComStats?.peakDate ?? null,
      chessComGamesCount: chessComStats?.gamesCount ?? 0,
      chessComJoinedAt: chessComStats?.joinedAt ?? null,
      chessComLastPlayedAt: chessComStats?.lastPlayedAt ?? null,
      chessComRd: chessComStats?.rd ?? null,
      chessComProv: chessComStats?.prov ?? null,
      chessComClosed: chessComStats?.isClosed ? true : false,
      lichessVerified: lichessStats?.verified ?? false,
      lichessCurrentRating: lichessStats?.currentRating ?? null,
      lichessPeakRating: lichessStats?.peakRating ?? null,
      lichessPeakDate: lichessStats?.peakDate ?? null,
      lichessGamesCount: lichessStats?.gamesCount ?? 0,
      lichessJoinedAt: lichessStats?.joinedAt ?? null,
      lichessLastPlayedAt: lichessStats?.lastPlayedAt ?? null,
      lichessRd: lichessStats?.rd ?? null,
      lichessProv: lichessStats?.prov ?? null,
      lichessTosViolation: lichessStats?.tosViolation ? true : false,
      systemVerdict: ruleRes.systemVerdict,
      rejectionReasons: ruleRes.rejectionReasons,
      organizerStatus: 'PENDING' as const,
      organizerNotes: null,
      confirmedAt: null,
      submittedAt: raw.submittedAt,
    });
  }

  // Clear previous participants and bulk insert new records atomically
  await db.delete(participants).where(eq(participants.tournamentId, id));

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
