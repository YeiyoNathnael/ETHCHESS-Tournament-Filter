import { defineEventHandler, readBody, createError } from 'h3';
import { db, ensureTablesExist } from '~/server/db';
import { participantClaims, participants, tournaments } from '~/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { fetchChessComUserStats, fetchLichessUserStats } from '~/utils/chessApi';
import { evaluateParticipantRules } from '~/utils/ruleEngine';

export default defineEventHandler(async (event) => {
  await ensureTablesExist();

  const method = event.node.req.method;
  if (method !== 'PATCH' && method !== 'PUT') {
    throw createError({
      statusCode: 405,
      statusMessage: 'Method Not Allowed',
    });
  }

  const idParam = event.context.params?.id;
  const claimId = Number(idParam);

  if (isNaN(claimId) || claimId <= 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid claim ID',
    });
  }

  try {
    const existingClaims = await db.select().from(participantClaims).where(eq(participantClaims.id, claimId));
    if (existingClaims.length === 0) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Claim not found',
      });
    }

    const claim = existingClaims[0];
    const body = await readBody(event);
    const newStatus = body.status;

    if (!newStatus || (newStatus !== 'APPROVED' && newStatus !== 'REJECTED' && newStatus !== 'PENDING')) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid status value',
      });
    }

    // 1. Search for an existing participant matching by normalized Telegram username
    const tourneyParticipants = await db
      .select()
      .from(participants)
      .where(eq(participants.tournamentId, claim.tournamentId));

    const normClaimTg = claim.telegramUsername ? claim.telegramUsername.replace(/^@/, '').trim().toLowerCase() : '';
    const matchedParticipant = tourneyParticipants.find((p) => {
      const pTg = p.telegramUsername ? p.telegramUsername.replace(/^@/, '').trim().toLowerCase() : '';
      return normClaimTg && pTg && pTg === normClaimTg;
    });

    // 2. Strict Rule: If claimType is MISSING_LICHESS but candidate does not exist in form responses, reject/error!
    if (newStatus === 'APPROVED' && claim.claimType === 'MISSING_LICHESS' && !matchedParticipant) {
      // Auto-mark claim as REJECTED in database
      await db
        .update(participantClaims)
        .set({ status: 'REJECTED' })
        .where(eq(participantClaims.id, claimId));

      throw createError({
        statusCode: 400,
        statusMessage: `Cannot approve: Telegram handle ${claim.telegramUsername} does not exist in prior form responses. Only candidates registered in the form can use 'Missing Lichess'. New creation is restricted to 'Unlisted Registration'.`,
      });
    }

    // Update claim status in participant_claims table
    await db
      .update(participantClaims)
      .set({ status: newStatus })
      .where(eq(participantClaims.id, claimId));

    // 3. Handle Approval & Candidate Updating / Creation
    if (newStatus === 'APPROVED') {
      const tourneyList = await db.select().from(tournaments).where(eq(tournaments.id, claim.tournamentId));
      if (tourneyList.length > 0) {
        const tourney = tourneyList[0];
        const timeFormat = (tourney.timeFormat || 'blitz').toLowerCase() as any;

        // Determine final handles combining claim + existing participant
        const finalChessComUser = claim.chessComUser || matchedParticipant?.rawChessComUser || undefined;
        const finalLichessUser = claim.lichessUser || matchedParticipant?.rawLichessUser || undefined;

        let chessStats = null;
        let lichessStats = null;

        if (finalChessComUser) {
          try {
            chessStats = await fetchChessComUserStats(finalChessComUser, timeFormat);
          } catch (e) {
            console.warn(`Could not fetch Chess.com stats for ${finalChessComUser}`);
          }
        }

        if (finalLichessUser) {
          try {
            lichessStats = await fetchLichessUserStats(finalLichessUser, timeFormat);
          } catch (e) {
            console.warn(`Could not fetch Lichess stats for ${finalLichessUser}`);
          }
        }

        const rules = {
          chessComMaxRating: tourney.chessComMaxRating,
          chessComMaxPeak: tourney.chessComMaxPeak,
          chessComMinAgeMonths: tourney.chessComMinAgeMonths,
          chessComMinGames: tourney.chessComMinGames,
          lichessMaxRating: tourney.lichessMaxRating,
          lichessMaxPeak: tourney.lichessMaxPeak,
          lichessMinAgeMonths: tourney.lichessMinAgeMonths,
          lichessMinGames: tourney.lichessMinGames,
          minimumTrustScore: tourney.minimumTrustScore,
        };

        const evalResult = evaluateParticipantRules({
          chessComUser: finalChessComUser,
          chessComStats: chessStats || undefined,
          lichessUser: finalLichessUser,
          lichessStats: lichessStats || undefined,
          rules,
        });

        const participantValues = {
          tournamentId: claim.tournamentId,
          telegramUsername: claim.telegramUsername || matchedParticipant?.telegramUsername,
          rawChessComUser: finalChessComUser || null,
          rawLichessUser: finalLichessUser || null,
          chessComVerified: chessStats ? true : false,
          chessComCurrentRating: chessStats?.currentRating || null,
          chessComPeakRating: chessStats?.peakRating || null,
          chessComPeakDate: chessStats?.peakDate || null,
          chessComGamesCount: chessStats?.gamesCount || null,
          chessComJoinedAt: chessStats?.joinedAt || null,
          chessComLastPlayedAt: chessStats?.lastPlayedAt || null,
          chessComRd: chessStats?.rd || null,
          chessComProv: chessStats?.prov || false,
          chessComClosed: chessStats?.isClosed ? true : false,
          lichessVerified: lichessStats ? true : false,
          lichessCurrentRating: lichessStats?.currentRating || null,
          lichessPeakRating: lichessStats?.peakRating || null,
          lichessPeakDate: lichessStats?.peakDate || null,
          lichessGamesCount: lichessStats?.gamesCount || null,
          lichessJoinedAt: lichessStats?.joinedAt || null,
          lichessLastPlayedAt: lichessStats?.lastPlayedAt || null,
          lichessRd: lichessStats?.rd || null,
          lichessProv: lichessStats?.prov || false,
          lichessTosViolation: lichessStats?.tosViolation ? true : false,
          systemVerdict: evalResult.systemVerdict || 'ELIGIBLE',
          rejectionReasons: evalResult.rejectionReasons || [],
          organizerStatus: 'APPROVED' as const,
          organizerNotes: `Approved from claim appeal (${claim.claimType}): ${claim.notes || 'No notes'}`,
          confirmedAt: new Date().toISOString(),
        };

        if (matchedParticipant) {
          // UPDATE existing candidate record in place!
          await db
            .update(participants)
            .set(participantValues)
            .where(eq(participants.id, matchedParticipant.id));
        } else {
          // INSERT new candidate record (only allowed for UNLISTED_REGISTERED)
          await db.insert(participants).values({
            ...participantValues,
            submittedAt: claim.createdAt,
          });
        }
      }
    }

    return {
      success: true,
      message: `Claim ${claimId} status updated to ${newStatus}`,
    };
  } catch (err: any) {
    if (err.statusCode) throw err;
    throw createError({
      statusCode: 500,
      statusMessage: err.message || 'Failed to update claim status',
    });
  }
});
