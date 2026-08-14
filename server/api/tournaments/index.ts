import { defineEventHandler, readBody, createError, getCookie } from 'h3';
import { db, ensureTablesExist } from '~/server/db';
import { tournaments } from '~/server/db/schema';
import { desc } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  await ensureTablesExist();
  const method = event.node.req.method;

  if (method === 'POST') {
    const session = getCookie(event, 'organizer_session');
    if (session !== 'true') {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized: Organizer session required',
      });
    }
  }

  // GET /api/tournaments - List all tournaments
  if (method === 'GET') {
    try {
      const allTournaments = await db
        .select()
        .from(tournaments)
        .orderBy(desc(tournaments.createdAt));

      return {
        success: true,
        tournaments: allTournaments,
      };
    } catch (error: any) {
      throw createError({
        statusCode: 500,
        statusMessage: `Failed to fetch tournaments: ${error.message}`,
      });
    }
  }

  // POST /api/tournaments - Create a new tournament
  if (method === 'POST') {
    try {
      const body = await readBody(event);

      if (!body.title) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Tournament title is required',
        });
      }

      const newTournament = {
        title: String(body.title).trim(),
        description: body.description ? String(body.description).trim() : null,
        imageUrl: body.imageUrl ? String(body.imageUrl).trim() : null,
        eventDate: body.eventDate ? String(body.eventDate).trim() : null,
        location: body.location ? String(body.location).trim() : null,
        timeFormat: (['blitz', 'rapid', 'bullet'].includes(body.timeFormat) ? body.timeFormat : 'rapid') as
          | 'blitz'
          | 'rapid'
          | 'bullet',
        chessComMaxRating: Number(body.chessComMaxRating) || 1500,
        chessComMaxPeak: Number(body.chessComMaxPeak) || 1500,
        chessComMinAgeMonths: Number(body.chessComMinAgeMonths) || 3,
        chessComMinGames: Number(body.chessComMinGames) || 30,
        lichessMaxRating: Number(body.lichessMaxRating) || 1500,
        lichessMaxPeak: Number(body.lichessMaxPeak) || 1500,
        lichessMinAgeMonths: Number(body.lichessMinAgeMonths) || 3,
        lichessMinGames: Number(body.lichessMinGames) || 30,
        createdAt: new Date().toISOString(),
      };

      const inserted = await db.insert(tournaments).values(newTournament).returning();

      return {
        success: true,
        tournament: inserted[0],
      };
    } catch (error: any) {
      if (error.statusCode) throw error;
      throw createError({
        statusCode: 500,
        statusMessage: `Failed to create tournament: ${error.message}`,
      });
    }
  }

  throw createError({
    statusCode: 405,
    statusMessage: 'Method Not Allowed',
  });
});
