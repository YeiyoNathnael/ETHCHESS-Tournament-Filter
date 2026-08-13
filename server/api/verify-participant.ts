import { defineEventHandler, getQuery, createError } from 'h3';
import { fetchChessComUserStats, fetchLichessUserStats } from '~/utils/chessApi';

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const username = String(query.username || '').trim();
  const platform = String(query.platform || '').trim();
  const timeFormat = String(query.timeFormat || 'rapid').trim();

  if (!username || !platform) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Parameters "username" and "platform" are required',
    });
  }

  console.log(`[Verify-API] Querying ${platform} for user "${username}" (format: ${timeFormat})...`);

  if (platform === 'chessCom' || platform === 'chess_com' || platform === 'chess') {
    const stats = await fetchChessComUserStats(username, timeFormat);
    console.log(`[Verify-API] Chess.com "${username}": verified=${stats.verified}, rating=${stats.currentRating}, peak=${stats.peakRating}, rd=${stats.rd}, closed=${stats.isClosed}`);
    return { success: true, stats };
  } else if (platform === 'lichess') {
    const stats = await fetchLichessUserStats(username, timeFormat);
    console.log(`[Verify-API] Lichess "${username}": verified=${stats.verified}, rating=${stats.currentRating}, peak=${stats.peakRating}, rd=${stats.rd}, tosViolation=${stats.tosViolation}`);
    return { success: true, stats };
  }

  throw createError({
    statusCode: 400,
    statusMessage: `Unsupported platform: ${platform}`,
  });
});
