export interface PlatformUserStats {
  verified: boolean;
  currentRating: number | null;
  peakRating: number | null;
  peakDate?: string;
  gamesCount: number;
  joinedAt: string; // ISO date string
  rawUsername: string;
  tosViolation?: boolean;
  isClosed?: boolean;
  rd?: number;
  prov?: boolean;
  lastPlayedAt?: string;
}

// ─── Rate Limiter ─────────────────────────────────────────────────────────────

/**
 * Lichess: strictly 1 request at a time (sequential). Any parallelism causes 429.
 * Chess.com: sequential is effectively unlimited; bursts cause 429s.
 * We enforce sequential execution for BOTH using a shared promise queue.
 */

let lichessQueue: Promise<void> = Promise.resolve();
let chessComQueue: Promise<void> = Promise.resolve();

/**
 * Wraps a task in a sequential queue. Only one task runs at a time per platform.
 * @param queue - reference to the platform's queue promise
 * @param delayMs - minimum gap between requests (ms)
 * @param task - the async work to perform
 */
function enqueue<T>(
  getQueue: () => Promise<void>,
  setQueue: (p: Promise<void>) => void,
  delayMs: number,
  task: () => Promise<T>
): Promise<T> {
  const result = getQueue().then(() => task()).finally(() => {
    // Enforce minimum gap before next request
    return new Promise<void>((resolve) => setTimeout(resolve, delayMs));
  });
  // Advance the queue (drop the T so queue is Promise<void>)
  setQueue(result.then(() => {}, () => {}));
  return result;
}

function enqueueChessCom<T>(task: () => Promise<T>): Promise<T> {
  return enqueue(
    () => chessComQueue,
    (p) => { chessComQueue = p; },
    650, // ~92 req/min ceiling, safe well under ~100
    task
  );
}

function enqueueLichess<T>(task: () => Promise<T>): Promise<T> {
  return enqueue(
    () => lichessQueue,
    (p) => { lichessQueue = p; },
    1100, // Lichess: strictly sequential, ~55 req/min
    task
  );
}

// ─── HTTP Headers ─────────────────────────────────────────────────────────────

const USER_AGENT = 'ETHCHESS-TourneyFilter/1.0 (contact@ethchess.org; +https://ethchess.org)';

const CHESS_COM_HEADERS: Record<string, string> = {
  'User-Agent': USER_AGENT,
  'Accept': 'application/json',
};

/**
 * Returns Lichess headers, injecting Bearer token if available.
 * Token is read from process.env so it works in server-side Nitro context.
 */
function getLichessHeaders(): Record<string, string> {
  const token = process.env.LICHESS_TOKEN || process.env.NUXT_LICHESS_TOKEN || '';
  const headers: Record<string, string> = {
    'User-Agent': USER_AGENT,
    'Accept': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// ─── Chess.com ────────────────────────────────────────────────────────────────

/**
 * Fetches user profile and game statistics from Chess.com public API.
 * Returns joinedAt as ISO date string. Age in months is calculated externally.
 * Requests are queued to ensure sequential execution (~650ms between requests).
 */
export async function fetchChessComUserStats(
  username: string,
  timeFormat: string = 'rapid'
): Promise<PlatformUserStats> {
  const defaultResult: PlatformUserStats = {
    verified: false,
    currentRating: null,
    peakRating: null,
    gamesCount: 0,
    joinedAt: '',
    rawUsername: username,
    // isClosed intentionally omitted — undefined means "API call failed, no info"
  };

  if (!username) return defaultResult;

  // If executing in browser, proxy through Nuxt API endpoint to bypass CORS
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch(`/api/verify-participant?username=${encodeURIComponent(username.trim())}&platform=chessCom&timeFormat=${encodeURIComponent(timeFormat)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.stats) return data.stats;
      }
    } catch {
      // Fall through to direct fetch if proxy fails
    }
  }

  return enqueueChessCom(async () => {
    try {
      const cleanUser = encodeURIComponent(username.trim().toLowerCase());
      const normFormat = (timeFormat || 'rapid').toLowerCase();

      // Fetch profile
      const profileRes = await fetch(`https://api.chess.com/pub/player/${cleanUser}`, {
        headers: CHESS_COM_HEADERS,
        signal: AbortSignal.timeout(8000),
      });

      if (!profileRes.ok) {
        return defaultResult;
      }

      const profileData = await profileRes.json();

      // Chess.com returns joined as Unix seconds — convert to ISO date string
      const joinedUnixSec = profileData.joined || 0;
      const joinedAt = joinedUnixSec > 0 ? new Date(joinedUnixSec * 1000).toISOString() : '';

      const statusLower = (profileData.status || '').toLowerCase();
      const isClosed =
        statusLower.includes('closed') ||
        statusLower.includes('fair_play') ||
        statusLower.includes('violation') ||
        statusLower.includes('abuse') ||
        statusLower.includes('banned');

      // Fetch stats (sequential via same queue — already inside enqueueChessCom)
      const statsRes = await fetch(`https://api.chess.com/pub/player/${cleanUser}/stats`, {
        headers: CHESS_COM_HEADERS,
        signal: AbortSignal.timeout(8000),
      });

      let currentRating: number | null = null;
      let peakRating: number | null = null;
      let peakDate: string | undefined = undefined;
      let gamesCount = 0;
      let rd: number | undefined = undefined;
      let lastPlayedAt: string | undefined = undefined;

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        const formatKey = `chess_${normFormat}`;
        const formatStats = statsData[formatKey];

        if (formatStats) {
          if (typeof formatStats.last?.rating === 'number') {
            currentRating = formatStats.last.rating;
          }
          if (typeof formatStats.last?.rd === 'number') {
            rd = formatStats.last.rd;
          }
          if (typeof formatStats.last?.date === 'number' && formatStats.last.date > 0) {
            lastPlayedAt = new Date(formatStats.last.date * 1000).toISOString();
          }
          if (typeof formatStats.best?.rating === 'number') {
            peakRating = formatStats.best.rating;
          }
          if (typeof formatStats.best?.date === 'number' && formatStats.best.date > 0) {
            peakDate = new Date(formatStats.best.date * 1000).toISOString();
          }
          if (formatStats.record) {
            const win = formatStats.record.win || 0;
            const loss = formatStats.record.loss || 0;
            const draw = formatStats.record.draw || 0;
            gamesCount = win + loss + draw;
          }
        }
      }

      // If peak not explicitly set, fall back to current rating
      if (peakRating === null && currentRating !== null) {
        peakRating = currentRating;
      }

      return {
        verified: true,
        currentRating,
        peakRating,
        peakDate,
        gamesCount,
        joinedAt,
        rawUsername: username,
        isClosed,
        rd,
        prov: (rd ?? 0) > 80,
        lastPlayedAt,
      };
    } catch {
      return defaultResult;
    }
  });
}

/**
 * Bulk fetches Chess.com user stats in parallel chunks of 5 with a 150ms gap.
 * Allows 200 Chess.com users to be fetched in ~6-8 seconds instead of 140+ seconds.
 */
export async function fetchChessComUsersBulk(
  usernames: string[],
  timeFormat: string = 'rapid'
): Promise<Map<string, PlatformUserStats>> {
  const result = new Map<string, PlatformUserStats>();
  if (!usernames || usernames.length === 0) return result;

  const unique = Array.from(new Set(usernames.map((u) => u.trim()).filter(Boolean)));
  const chunkSize = 5;

  for (let i = 0; i < unique.length; i += chunkSize) {
    const chunk = unique.slice(i, i + chunkSize);
    await Promise.all(
      chunk.map(async (username) => {
        try {
          const cleanUser = encodeURIComponent(username.trim().toLowerCase());
          const profileRes = await fetch(`https://api.chess.com/pub/player/${cleanUser}`, {
            headers: {
              'User-Agent': 'ETHCHESS-TourneyFilter/1.0 (contact@ethchess.org)',
            },
            signal: AbortSignal.timeout(8000),
          });

          if (!profileRes.ok) {
            const isClosed = profileRes.status === 404 || profileRes.status === 410;
            result.set(username.toLowerCase(), {
              verified: false,
              currentRating: null,
              peakRating: null,
              gamesCount: 0,
              joinedAt: '',
              rawUsername: username,
              isClosed: isClosed ? true : undefined,
            });
            return;
          }

          const profileData = await profileRes.json();
          const isClosed = profileData.status === 'closed' || profileData.status === 'closed:fair_play_violations';
          const joinedAtMs = (profileData.joined || 0) * 1000;
          const joinedAt = joinedAtMs > 0 ? new Date(joinedAtMs).toISOString() : '';

          let currentRating: number | null = null;
          let peakRating: number | null = null;
          let peakDate: string | undefined = undefined;
          let gamesCount = 0;
          let rd: number | undefined = undefined;
          let lastPlayedAt: string | undefined = undefined;

          try {
            const statsRes = await fetch(`https://api.chess.com/pub/player/${cleanUser}/stats`, {
              headers: {
                'User-Agent': 'ETHCHESS-TourneyFilter/1.0 (contact@ethchess.org)',
              },
              signal: AbortSignal.timeout(8000),
            });

            if (statsRes.ok) {
              const statsData = await statsRes.json();
              const normFormat = (timeFormat || 'rapid').toLowerCase();
              const key = `chess_${normFormat}`;
              const perfData = statsData[key];

              if (perfData) {
                if (typeof perfData.last?.rating === 'number') currentRating = perfData.last.rating;
                if (typeof perfData.best?.rating === 'number') peakRating = perfData.best.rating;
                if (typeof perfData.best?.date === 'number' && perfData.best.date > 0) {
                  peakDate = new Date(perfData.best.date * 1000).toISOString();
                }
                if (typeof perfData.last?.date === 'number' && perfData.last.date > 0) {
                  lastPlayedAt = new Date(perfData.last.date * 1000).toISOString();
                }
                if (typeof perfData.last?.rd === 'number') rd = perfData.last.rd;

                const record = perfData.record;
                if (record) {
                  gamesCount = (record.win || 0) + (record.loss || 0) + (record.draw || 0);
                }
              }
            }
          } catch {
            // Stats fetch optional
          }

          result.set(username.toLowerCase(), {
            verified: true,
            currentRating,
            peakRating: peakRating ?? currentRating,
            peakDate,
            gamesCount,
            joinedAt,
            rawUsername: username,
            isClosed,
            rd,
            prov: (rd ?? 0) > 80,
            lastPlayedAt,
          });
        } catch {
          // Failed fetch
        }
      })
    );

    if (i + chunkSize < unique.length) {
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  }

  return result;
}

// ─── Lichess ──────────────────────────────────────────────────────────────────

/**
 * Extracts PlatformUserStats from a raw Lichess user profile JSON object.
 * Used by both single-user and bulk fetch paths.
 */
function parseLichessProfile(profileData: any, username: string, timeFormat: string): Omit<PlatformUserStats, 'peakRating' | 'peakDate'> & { peakRating: number | null } {
  const createdAtMs = profileData.createdAt || 0;
  const joinedAt = createdAtMs > 0 ? new Date(createdAtMs).toISOString() : '';

  const tosViolation = !!profileData.tosViolation || !!profileData.disabled || !!profileData.closed;

  const normFormat = (timeFormat || 'rapid').toLowerCase();
  const perfData = profileData.perfs?.[normFormat];
  let currentRating: number | null = null;
  let gamesCount = 0;
  let rd: number | undefined = undefined;
  let prov = false;
  let lastPlayedAt: string | undefined = profileData.seenAt
    ? new Date(profileData.seenAt).toISOString()
    : undefined;

  if (perfData) {
    if (typeof perfData.rating === 'number') currentRating = perfData.rating;
    if (typeof perfData.games === 'number') gamesCount = perfData.games;
    if (typeof perfData.rd === 'number') rd = perfData.rd;
    prov = perfData.prov === true;
  }

  return {
    verified: true,
    currentRating,
    peakRating: currentRating, // will be overridden by rating-history if available
    gamesCount,
    joinedAt,
    rawUsername: username,
    tosViolation,
    rd,
    prov,
    lastPlayedAt,
  };
}

/**
 * Fetches rating history for a single Lichess user and calculates peak rating.
 * This is always a separate sequential request.
 */
async function fetchLichessRatingHistory(
  username: string,
  timeFormat: string,
  baseStats: PlatformUserStats
): Promise<PlatformUserStats> {
  return enqueueLichess(async () => {
    try {
      const cleanUser = encodeURIComponent(username.trim());
      const historyRes = await fetch(`https://lichess.org/api/user/${cleanUser}/rating-history`, {
        headers: getLichessHeaders(),
        signal: AbortSignal.timeout(8000),
      });

      if (!historyRes.ok) return baseStats;

      const historyData = await historyRes.json();
      const perfHistory = historyData.find(
        (h: any) => h.name && h.name.toLowerCase() === timeFormat.toLowerCase()
      );

      if (perfHistory && Array.isArray(perfHistory.points) && perfHistory.points.length > 0) {
        const ratings = perfHistory.points
          .map((pt: any[]) => pt[3])
          .filter((r: any) => typeof r === 'number');

        if (ratings.length > 0) {
          const historicalPeak = Math.max(...ratings);
          if (baseStats.peakRating === null || historicalPeak > (baseStats.peakRating ?? 0)) {
            const peakPt = perfHistory.points.find((pt: any[]) => pt[3] === historicalPeak);
            const peakDate = peakPt
              ? new Date(peakPt[0], peakPt[1], peakPt[2]).toISOString()
              : undefined;
            return { ...baseStats, peakRating: historicalPeak, peakDate };
          }
        }
      }
    } catch {
      // Rating history unavailable — return base stats
    }
    return baseStats;
  });
}

/**
 * Bulk fetches up to 300 Lichess user profiles in a SINGLE POST /api/users request.
 * This is the preferred method for server-side batch processing — one request vs N requests.
 * Returns a Map from lowercase username -> PlatformUserStats (without peak history).
 *
 * NOTE: Does NOT include rating history (peak). Call fetchLichessRatingHistory per-user after.
 */
export async function fetchLichessUsersBulk(
  usernames: string[],
  timeFormat: string = 'rapid'
): Promise<Map<string, PlatformUserStats>> {
  const result = new Map<string, PlatformUserStats>();
  if (usernames.length === 0) return result;

  // POST /api/users accepts up to 300 usernames as newline-separated plain text
  const chunks: string[][] = [];
  for (let i = 0; i < usernames.length; i += 300) {
    chunks.push(usernames.slice(i, i + 300));
  }

  for (const chunk of chunks) {
    await enqueueLichess(async () => {
      try {
        const res = await fetch('https://lichess.org/api/users', {
          method: 'POST',
          headers: {
            ...getLichessHeaders(),
            'Content-Type': 'text/plain',
          },
          body: chunk.join(','),
          signal: AbortSignal.timeout(15000),
        });

        if (!res.ok) return;

        const users: any[] = await res.json();
        for (const user of users) {
          if (!user?.id) continue;
          const parsed = parseLichessProfile(user, user.username ?? user.id, timeFormat);
          result.set(user.id.toLowerCase(), parsed);
        }
      } catch {
        // Bulk fetch failed — individual fallback will be used
      }
    });
  }

  return result;
}

/**
 * Fetches user profile and exact calculated rating history from Lichess public API.
 * Single-user path — uses sequential rate limiter (1 request at a time).
 */
export async function fetchLichessUserStats(
  username: string,
  timeFormat: string = 'rapid'
): Promise<PlatformUserStats> {
  const defaultResult: PlatformUserStats = {
    verified: false,
    currentRating: null,
    peakRating: null,
    gamesCount: 0,
    joinedAt: '',
    rawUsername: username,
    // tosViolation intentionally omitted — undefined means "API call failed, no info"
  };

  if (!username) return defaultResult;

  // If executing in browser, proxy through Nuxt API endpoint to bypass CORS
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch(`/api/verify-participant?username=${encodeURIComponent(username.trim())}&platform=lichess&timeFormat=${encodeURIComponent(timeFormat)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.stats) return data.stats;
      }
    } catch {
      // Fall through to direct fetch if proxy fails
    }
  }

  // Step 1: Fetch profile sequentially
  const baseStats = await enqueueLichess(async () => {
    try {
      const cleanUser = encodeURIComponent(username.trim());
      const profileRes = await fetch(`https://lichess.org/api/user/${cleanUser}`, {
        headers: getLichessHeaders(),
        signal: AbortSignal.timeout(8000),
      });

      if (!profileRes.ok) return defaultResult;

      const profileData = await profileRes.json();
      return parseLichessProfile(profileData, username, timeFormat) as PlatformUserStats;
    } catch {
      return defaultResult;
    }
  });

  if (!baseStats.verified) return baseStats;

  // Step 2: Fetch rating history sequentially (separate request)
  return fetchLichessRatingHistory(username, timeFormat, baseStats);
}
