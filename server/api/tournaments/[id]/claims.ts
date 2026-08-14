import { defineEventHandler, readBody, createError } from 'h3';
import { db, ensureTablesExist } from '~/server/db';
import { participantClaims, tournaments } from '~/server/db/schema';
import { eq, desc } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  await ensureTablesExist();

  const method = event.node.req.method;
  const idParam = event.context.params?.id;
  const tournamentId = Number(idParam);

  if (isNaN(tournamentId) || tournamentId <= 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid tournament ID',
    });
  }

  // GET: Fetch all claims for this tournament
  if (method === 'GET') {
    try {
      const claims = await db
        .select()
        .from(participantClaims)
        .where(eq(participantClaims.tournamentId, tournamentId))
        .orderBy(desc(participantClaims.id));

      return { success: true, claims };
    } catch (err: any) {
      throw createError({
        statusCode: 500,
        statusMessage: err.message || 'Failed to fetch claims',
      });
    }
  }

  // POST: Public claim submission
  if (method === 'POST') {
    try {
      const body = await readBody(event);
      const { claimType, telegramUsername, chessComUser, lichessUser, notes } = body;

      if (!telegramUsername || !telegramUsername.trim()) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Telegram username is required',
        });
      }

      if (!claimType || (claimType !== 'MISSING_LICHESS' && claimType !== 'UNLISTED_REGISTERED')) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Invalid claimType',
        });
      }

      // Check tournament exists
      const tourney = await db.select().from(tournaments).where(eq(tournaments.id, tournamentId));
      if (tourney.length === 0) {
        throw createError({
          statusCode: 404,
          statusMessage: 'Tournament not found',
        });
      }

      const cleanTg = String(telegramUsername).replace(/^@/, '').trim();
      const cleanChess = chessComUser ? String(chessComUser).trim() : null;
      const cleanLichess = lichessUser ? String(lichessUser).trim() : null;

      const inserted = await db
        .insert(participantClaims)
        .values({
          tournamentId,
          claimType,
          telegramUsername: `@${cleanTg}`,
          chessComUser: cleanChess,
          lichessUser: cleanLichess,
          notes: notes ? String(notes).trim() : null,
          status: 'PENDING',
          createdAt: new Date().toISOString(),
        })
        .returning();

      return {
        success: true,
        message: 'Claim submitted successfully for organizer review.',
        claim: inserted[0],
      };
    } catch (err: any) {
      if (err.statusCode) throw err;
      throw createError({
        statusCode: 500,
        statusMessage: err.message || 'Failed to submit claim',
      });
    }
  }

  throw createError({
    statusCode: 405,
    statusMessage: 'Method Not Allowed',
  });
});
