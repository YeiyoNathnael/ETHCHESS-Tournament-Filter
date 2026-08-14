import { defineEventHandler, readBody, createError, getCookie } from 'h3';
import { db, ensureTablesExist } from '~/server/db';
import { participants } from '~/server/db/schema';
import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  await ensureTablesExist();

  const session = getCookie(event, 'organizer_session');
  if (session !== 'true') {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized: Organizer session required',
    });
  }

  const method = event.node.req.method;
  if (method !== 'PATCH' && method !== 'PUT') {
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
      statusMessage: 'Invalid participant ID',
    });
  }

  try {
    const existing = await db.select().from(participants).where(eq(participants.id, id));
    if (existing.length === 0) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Participant not found',
      });
    }

    const body = await readBody(event);
    const updates: Record<string, any> = {};

    if (body.organizerStatus) {
      const validStatuses = ['APPROVED', 'DISAPPROVED', 'PENDING'];
      if (!validStatuses.includes(body.organizerStatus)) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Invalid organizerStatus value. Must be APPROVED, DISAPPROVED, or PENDING',
        });
      }
      updates.organizerStatus = body.organizerStatus;

      if (body.organizerStatus === 'APPROVED' || body.organizerStatus === 'DISAPPROVED') {
        updates.confirmedAt = new Date().toISOString();
      } else {
        updates.confirmedAt = null;
      }
    }

    if (body.organizerNotes !== undefined) {
      updates.organizerNotes = body.organizerNotes ? String(body.organizerNotes).trim() : null;
    }

    if (Object.keys(updates).length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'No update fields provided',
      });
    }

    const updated = await db
      .update(participants)
      .set(updates)
      .where(eq(participants.id, id))
      .returning();

    return {
      success: true,
      participant: updated[0],
    };
  } catch (error: any) {
    if (error.statusCode) throw error;
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to update participant status: ${error.message}`,
    });
  }
});
