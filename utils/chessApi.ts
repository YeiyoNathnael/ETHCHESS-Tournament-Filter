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

const HTTP_HEADERS = {
  'User-Agent': 'ETHCHESS-TourneyFilter/1.0 (contact@ethchess.org; +https://ethchess.org)',
  Accept: 'application/json',
};

/**
 * Fetches user profile and game statistics from Chess.com public API.
 * Returns joinedAt as ISO date string. Age in months is calculated externally.
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

  try {
    const cleanUser = encodeURIComponent(username.trim().toLowerCase());
    const normFormat = (timeFormat || 'rapid').toLowerCase();

    // Fetch profile
    const profileRes = await fetch(`https://api.chess.com/pub/player/${cleanUser}`, {
      headers: HTTP_HEADERS,
      signal: AbortSignal.timeout(6000),
    });

    if (!profileRes.ok) {
      return defaultResult;
    }

    const profileData = await profileRes.json();

    // Chess.com returns joined as Unix seconds — convert to ISO date string
    const joinedUnixSec = profileData.joined || 0;
    const joinedAt = joinedUnixSec > 0 ? new Date(joinedUnixSec * 1000).toISOString() : '';

    const isClosed = profileData.status
      ? profileData.status.toLowerCase().includes('closed') ||
        profileData.status.toLowerCase().includes('fair_play')
      : false;

    // Fetch stats
    const statsRes = await fetch(`https://api.chess.com/pub/player/${cleanUser}/stats`, {
      headers: HTTP_HEADERS,
      signal: AbortSignal.timeout(6000),
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
  } catch (error: any) {
    // Quiet handling for network timeouts or API rate limits
    return defaultResult;
  }
}

/**
 * Fetches user profile and exact calculated rating history from Lichess public API.
 * Returns joinedAt as ISO date string. Age in months is calculated externally.
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
    tosViolation: false,
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

  try {
    const cleanUser = encodeURIComponent(username.trim());
    const normFormat = (timeFormat || 'rapid').toLowerCase();

    // Fetch profile
    const profileRes = await fetch(`https://lichess.org/api/user/${cleanUser}`, {
      headers: HTTP_HEADERS,
      signal: AbortSignal.timeout(6000),
    });

    if (!profileRes.ok) {
      return defaultResult;
    }

    const profileData = await profileRes.json();

    // Lichess returns createdAt as Unix ms — convert to ISO date string
    const createdAtMs = profileData.createdAt || 0;
    const joinedAt = createdAtMs > 0 ? new Date(createdAtMs).toISOString() : '';

    const tosViolation = !!profileData.tosViolation;

    const perfData = profileData.perfs?.[normFormat];
    let currentRating: number | null = null;
    let gamesCount = 0;
    let rd: number | undefined = undefined;
    let prov = false;
    let lastPlayedAt: string | undefined = profileData.seenAt ? new Date(profileData.seenAt).toISOString() : undefined;

    if (perfData) {
      if (typeof perfData.rating === 'number') {
        currentRating = perfData.rating;
      }
      if (typeof perfData.games === 'number') {
        gamesCount = perfData.games;
      }
      if (typeof perfData.rd === 'number') {
        rd = perfData.rd;
      }
      prov = perfData.prov === true;
    }

    let peakRating: number | null = currentRating;
    let peakDate: string | undefined = undefined;

    // Fetch rating history for exact historical rapid peak
    try {
      const historyRes = await fetch(`https://lichess.org/api/user/${cleanUser}/rating-history`, {
        headers: HTTP_HEADERS,
        signal: AbortSignal.timeout(6000),
      });

      if (historyRes.ok) {
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
            if (peakRating === null || historicalPeak > peakRating) {
              peakRating = historicalPeak;
              const peakPt = perfHistory.points.find((pt: any[]) => pt[3] === historicalPeak);
              if (peakPt) {
                // pt is [year, month (0-indexed), day, rating]
                peakDate = new Date(peakPt[0], peakPt[1], peakPt[2]).toISOString();
              }
            }
          }
        }
      }
    } catch (histError) {
      console.warn(`Could not fetch Lichess rating history for ${username}:`, histError);
    }

    return {
      verified: true,
      currentRating,
      peakRating,
      peakDate,
      gamesCount,
      joinedAt,
      rawUsername: username,
      tosViolation,
      rd,
      prov,
      lastPlayedAt,
    };
  } catch (error: any) {
    // Quiet handling for network timeouts or API rate limits
    return defaultResult;
  }
}
