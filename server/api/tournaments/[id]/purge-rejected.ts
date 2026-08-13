import { defineEventHandler, createError } from 'h3';
import { db, ensureTablesExist } from '~/server/db';
import { participants } from '~/server/db/schema';
import { eq, and, or } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  await ensureTablesExist();

  const method = event.node.req.method;
  if (method !== 'POST' && method !== 'DELETE') {
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

  try {
    // Delete candidates where systemVerdict = 'REJECTED' OR organizerStatus = 'DISAPPROVED'
    // AND tournamentId = id AND organizerStatus != 'APPROVED'
    const deleted = await db
      .delete(participants)
      .where(
        and(
          eq(participants.tournamentId, id),
          or(
            eq(participants.systemVerdict, 'REJECTED'),
            eq(participants.organizerStatus, 'DISAPPROVED')
          )
        )
      )
      .returning();

    return {
      success: true,
      purgedCount: deleted.length,
      message: `Purged ${deleted.length} rejected candidates successfully.`,
    };
  } catch (err: any) {
    throw createError({
      statusCode: 500,
      statusMessage: err.message || 'Failed to purge rejected participants',
    });
  }
});
