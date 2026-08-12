import { defineEventHandler, createError, readBody } from 'h3';
import { db, resetDatabase } from '~/server/db';
import { tournaments } from '~/server/db/schema';

export default defineEventHandler(async (event) => {
  const method = event.node.req.method;

  if (method !== 'POST') {
    throw createError({
      statusCode: 405,
      statusMessage: 'Method Not Allowed',
    });
  }

  try {
    const body = await readBody(event).catch(() => ({}));
    await resetDatabase();

    let createdSeed = null;

    // Optionally seed a clean default tournament if seed parameter is true
    if (body && body.seed) {
      const defaultTournament = {
        title: 'ETHCHESS Under 1500 Rapid Championship 2026',
        description: 'Official ETHCHESS Club amateur tournament for players rated under 1500 Rapid. Fair play automated screening, live rating verification, and cash prizes!',
        imageUrl: 'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?q=80&w=1000&auto=format&fit=crop',
        eventDate: '2026-08-25T15:00',
        location: 'ETHCHESS Club HQ & Lichess Swiss Arena',
        timeFormat: 'rapid' as const,
        chessComMaxRating: 1500,
        chessComMaxPeak: 1600,
        chessComMinAgeMonths: 3,
        chessComMinGames: 30,
        lichessMaxRating: 1500,
        lichessMaxPeak: 1600,
        lichessMinAgeMonths: 3,
        lichessMinGames: 30,
        createdAt: new Date().toISOString(),
      };

      const inserted = await db.insert(tournaments).values(defaultTournament).returning();
      createdSeed = inserted[0];
    }

    return {
      success: true,
      message: body && body.seed ? 'Database reset and seeded with clean tournament' : 'Database successfully reset to clean state',
      seedTournament: createdSeed,
    };
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to reset database: ${error.message}`,
    });
  }
});
