import { defineEventHandler, createError, getCookie } from 'h3';
import { db, ensureTablesExist } from '~/server/db';
import { tournaments, participants } from '~/server/db/schema';
import { eq, desc } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  await ensureTablesExist();

  const idParam = event.context.params?.id;
  const id = Number(idParam);

  if (!idParam || isNaN(id)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid tournament ID',
    });
  }

  const method = event.node.req.method;

  if (method === 'DELETE') {
    const session = getCookie(event, 'organizer_session');
    if (session !== 'true') {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized: Organizer session required',
      });
    }
  }

  if (method === 'GET') {
    try {
      const foundTournaments = await db.select().from(tournaments).where(eq(tournaments.id, id));

      if (foundTournaments.length === 0) {
        throw createError({
          statusCode: 404,
          statusMessage: 'Tournament not found',
        });
      }

      const tournament = foundTournaments[0];

      const participantList = await db
        .select()
        .from(participants)
        .where(eq(participants.tournamentId, id))
        .orderBy(desc(participants.id));

      return {
        success: true,
        tournament,
        participants: participantList,
      };
    } catch (error: any) {
      if (error.statusCode) throw error;
      throw createError({
        statusCode: 500,
        statusMessage: `Failed to fetch tournament details: ${error.message}`,
      });
    }
  }

  if (method === 'DELETE') {
    try {
      const foundTournaments = await db.select().from(tournaments).where(eq(tournaments.id, id));

      if (foundTournaments.length === 0) {
        throw createError({
          statusCode: 404,
          statusMessage: 'Tournament not found',
        });
      }

      // Explicitly delete cascade participants
      await db.delete(participants).where(eq(participants.tournamentId, id));

      // Delete tournament
      await db.delete(tournaments).where(eq(tournaments.id, id));

      return {
        success: true,
        message: `Tournament ${id} and associated participants successfully deleted`,
      };
    } catch (error: any) {
      if (error.statusCode) throw error;
      throw createError({
        statusCode: 500,
        statusMessage: `Failed to delete tournament: ${error.message}`,
      });
    }
  }

  throw createError({
    statusCode: 405,
    statusMessage: 'Method Not Allowed',
  });
});
