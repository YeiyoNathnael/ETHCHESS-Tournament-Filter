import { defineEventHandler, createError } from 'h3';
import { db, ensureTablesExist } from '~/server/db';
import { participants } from '~/server/db/schema';
import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  await ensureTablesExist();

  const method = event.node.req.method;
  const idParam = event.context.params?.id;
  const id = Number(idParam);

  if (!idParam || isNaN(id)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid participant ID',
    });
  }

  if (method === 'DELETE') {
    try {
      const existing = await db.select().from(participants).where(eq(participants.id, id));
      if (existing.length === 0) {
        throw createError({
          statusCode: 404,
          statusMessage: 'Participant not found',
        });
      }

      await db.delete(participants).where(eq(participants.id, id));
      return { success: true, message: `Participant ${id} deleted successfully` };
    } catch (err: any) {
      if (err.statusCode) throw err;
      throw createError({
        statusCode: 500,
        statusMessage: err.message || 'Failed to delete participant',
      });
    }
  }

  throw createError({
    statusCode: 405,
    statusMessage: 'Method Not Allowed',
  });
});
