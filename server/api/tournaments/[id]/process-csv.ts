import { defineEventHandler, readBody, readMultipartFormData, createError } from 'h3';
import { db, ensureTablesExist } from '~/server/db';
import { tournaments, participants } from '~/server/db/schema';
import { eq } from 'drizzle-orm';
import { parseAndDeduplicateCsv } from '~/utils/csvParser';
import { fetchChessComUserStats, fetchLichessUserStats, fetchLichessUsersBulk, type PlatformUserStats } from '~/utils/chessApi';
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
    minimumTrustScore: tournament.minimumTrustScore ?? 65,
  };

  // Clear previous participants for this tournament to re-process cleanly
  await db.delete(participants).where(eq(participants.tournamentId, id));

  const processedResults = [];
  let eligibleCount = 0;
  let rejectedCount = 0;

  console.log(`[Process-CSV] Processing ${rawList.length} candidates for Tournament ID: ${id}`);

  // ── Step 1: Bulk fetch ALL Lichess profiles in a single POST /api/users ────
  const lichessUsernames = rawList
    .map((r) => r.rawLichessUser)
    .filter((u): u is string => !!u);

  console.log(`[Process-CSV] Bulk fetching ${lichessUsernames.length} Lichess handles via POST /api/users...`);
  const lichessBulkProfiles = await fetchLichessUsersBulk(lichessUsernames, 'rapid');
  console.log(`[Process-CSV] Lichess bulk fetch complete. Received ${lichessBulkProfiles.size} profile responses.`);

  // ── Step 2: Fetch rating history per Lichess user (sequential, 1 at a time) ─
  const lichessFullStats = new Map<string, PlatformUserStats>();
  for (const username of lichessUsernames) {
    const baseStats = lichessBulkProfiles.get(username.toLowerCase());
    if (baseStats?.verified) {
      const withHistory = await fetchLichessUserStats(username, 'rapid');
      lichessFullStats.set(username.toLowerCase(), withHistory);
    }
  }

  // ── Step 3: Fetch Chess.com stats sequentially & assemble records ─────────
  console.log(`[Process-CSV] Evaluating rule matrix & Trust Scores for ${rawList.length} candidates...`);
  for (const raw of rawList) {
    let chessComStats: PlatformUserStats | null = null;
    let lichessStats: PlatformUserStats | null = null;

    if (raw.rawChessComUser) {
      chessComStats = await fetchChessComUserStats(raw.rawChessComUser, 'rapid');
    }
    if (raw.rawLichessUser) {
      lichessStats = lichessFullStats.get(raw.rawLichessUser.toLowerCase()) ??
        lichessBulkProfiles.get(raw.rawLichessUser.toLowerCase()) ??
        null;
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
      chessComPeakDate: chessComStats?.peakDate ?? null,
      chessComGamesCount: chessComStats?.gamesCount ?? 0,
      chessComJoinedAt: chessComStats?.joinedAt ?? null,
      chessComLastPlayedAt: chessComStats?.lastPlayedAt ?? null,
      chessComRd: chessComStats?.rd ?? null,
      chessComProv: chessComStats?.prov ?? null,
      chessComClosed: chessComStats?.isClosed ?? null,
      lichessVerified: lichessStats?.verified ?? false,
      lichessCurrentRating: lichessStats?.currentRating ?? null,
      lichessPeakRating: lichessStats?.peakRating ?? null,
      lichessPeakDate: lichessStats?.peakDate ?? null,
      lichessGamesCount: lichessStats?.gamesCount ?? 0,
      lichessJoinedAt: lichessStats?.joinedAt ?? null,
      lichessLastPlayedAt: lichessStats?.lastPlayedAt ?? null,
      lichessRd: lichessStats?.rd ?? null,
      lichessProv: lichessStats?.prov ?? null,
      lichessTosViolation: lichessStats?.tosViolation ?? null,
      systemVerdict: ruleRes.systemVerdict,
      rejectionReasons: ruleRes.rejectionReasons,
      organizerStatus: 'PENDING' as const,
      organizerNotes: null,
      confirmedAt: null,
      submittedAt: raw.submittedAt,
    };

    processedResults.push(newParticipant);
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
