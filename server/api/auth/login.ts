import { defineEventHandler, readBody, createError, setCookie } from 'h3';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const key = body?.key;

  const validKey = process.env.ORGANIZER_KEY || 'ethchess2026';

  if (!key || String(key).trim() !== validKey) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Invalid organizer passcode',
    });
  }

  setCookie(event, 'organizer_session', 'true', {
    maxAge: 60 * 60 * 24 * 7, // 7 days
    sameSite: 'lax',
    path: '/',
    httpOnly: false,
    secure: false,
  });

  return {
    success: true,
    message: 'Organizer session authenticated',
  };
});
