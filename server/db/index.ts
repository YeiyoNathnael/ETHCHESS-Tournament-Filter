import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema';

function getDatabaseConfig() {
  let dbUrl = process.env.TURSO_DATABASE_URL || process.env.NUXT_TURSO_DATABASE_URL;
  let dbToken = process.env.TURSO_AUTH_TOKEN || process.env.NUXT_TURSO_AUTH_TOKEN;

  // Try reading Nuxt runtimeConfig if inside Nitro request or server context
  try {
    const config = useRuntimeConfig();
    if (config?.tursoDatabaseUrl && config.tursoDatabaseUrl !== 'file:local.db') {
      dbUrl = config.tursoDatabaseUrl;
    }
    if (config?.tursoAuthToken) {
      dbToken = config.tursoAuthToken;
    }
  } catch {
    // Outside Nitro context (e.g. CLI or standalone test)
  }

  const finalUrl = dbUrl && dbUrl.trim() ? dbUrl.trim() : 'file:local.db';
  const finalToken = dbToken && dbToken.trim() ? dbToken.trim() : undefined;

  return { url: finalUrl, authToken: finalToken };
}

const dbConfig = getDatabaseConfig();
if (dbConfig.authToken) {
  console.log(`[DB] Connected to Turso Remote Cloud Database: ${dbConfig.url}`);
} else {
  console.log(`[DB] Connected to SQLite Local Database: ${dbConfig.url}`);
}

export const client = createClient(dbConfig);
export const db = drizzle(client, { schema });

// Ensure database tables exist automatically
let initPromise: Promise<void> | null = null;

export async function ensureTablesExist() {
  if (!initPromise) {
    initPromise = (async () => {
      await client.execute(`
        CREATE TABLE IF NOT EXISTS tournaments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          description TEXT,
          image_url TEXT,
          event_date TEXT,
          location TEXT,
          time_format TEXT NOT NULL DEFAULT 'rapid',
          chess_com_max_rating INTEGER NOT NULL DEFAULT 1500,
          chess_com_max_peak INTEGER NOT NULL DEFAULT 1500,
          chess_com_min_age_months INTEGER NOT NULL DEFAULT 3,
          chess_com_min_games INTEGER NOT NULL DEFAULT 30,
          lichess_max_rating INTEGER NOT NULL DEFAULT 1500,
          lichess_max_peak INTEGER NOT NULL DEFAULT 1500,
          lichess_min_age_months INTEGER NOT NULL DEFAULT 3,
          lichess_min_games INTEGER NOT NULL DEFAULT 30,
          minimum_trust_score INTEGER NOT NULL DEFAULT 65,
          created_at TEXT NOT NULL
        );
      `);

      await client.execute(`
        CREATE TABLE IF NOT EXISTS participants (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          tournament_id INTEGER NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
          telegram_username TEXT,
          raw_chess_com_user TEXT,
          raw_lichess_user TEXT,
          chess_com_verified INTEGER NOT NULL DEFAULT 0,
          chess_com_current_rating INTEGER,
          chess_com_peak_rating INTEGER,
          chess_com_peak_date TEXT,
          chess_com_games_count INTEGER,
          chess_com_joined_at TEXT,
          chess_com_last_played_at TEXT,
          chess_com_rd INTEGER,
          chess_com_prov INTEGER,
          chess_com_closed INTEGER,
          lichess_verified INTEGER NOT NULL DEFAULT 0,
          lichess_current_rating INTEGER,
          lichess_peak_rating INTEGER,
          lichess_peak_date TEXT,
          lichess_games_count INTEGER,
          lichess_joined_at TEXT,
          lichess_last_played_at TEXT,
          lichess_rd INTEGER,
          lichess_prov INTEGER,
          lichess_tos_violation INTEGER,
          system_verdict TEXT NOT NULL,
          rejection_reasons TEXT NOT NULL,
          organizer_status TEXT NOT NULL DEFAULT 'PENDING',
          organizer_notes TEXT,
          confirmed_at TEXT,
          submitted_at TEXT
        );
      `);

      await client.execute(`
        CREATE TABLE IF NOT EXISTS participant_claims (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          tournament_id INTEGER NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
          claim_type TEXT NOT NULL,
          telegram_username TEXT NOT NULL,
          chess_com_user TEXT,
          lichess_user TEXT,
          notes TEXT,
          status TEXT NOT NULL DEFAULT 'PENDING',
          created_at TEXT NOT NULL
        );
      `);

      // Safe column migration for existing tables (ALTER TABLE IF NOT EXISTS columns)
      const alters = [
        'ALTER TABLE participants ADD COLUMN chess_com_peak_date TEXT;',
        'ALTER TABLE participants ADD COLUMN chess_com_last_played_at TEXT;',
        'ALTER TABLE participants ADD COLUMN chess_com_rd INTEGER;',
        'ALTER TABLE participants ADD COLUMN chess_com_prov INTEGER;',
        'ALTER TABLE participants ADD COLUMN lichess_peak_date TEXT;',
        'ALTER TABLE participants ADD COLUMN lichess_last_played_at TEXT;',
        'ALTER TABLE participants ADD COLUMN lichess_rd INTEGER;',
        'ALTER TABLE participants ADD COLUMN lichess_prov INTEGER;',
        // Legacy columns that may have NOT NULL DEFAULT 0 — add if missing
        'ALTER TABLE participants ADD COLUMN chess_com_joined_at TEXT;',
        'ALTER TABLE participants ADD COLUMN lichess_joined_at TEXT;',
        // Ban flag columns: nullable (no default) — can't ALTER existing NOT NULL DEFAULT 0,
        // but adding as nullable is safe if column doesn't exist yet
        'ALTER TABLE participants ADD COLUMN chess_com_closed INTEGER;',
        'ALTER TABLE participants ADD COLUMN lichess_tos_violation INTEGER;',
        'ALTER TABLE tournaments ADD COLUMN minimum_trust_score INTEGER NOT NULL DEFAULT 65;',
      ];

      for (const q of alters) {
        try {
          await client.execute(q);
        } catch {
          // Column already exists — ignore
        }
      }
    })().catch((err) => {
      initPromise = null;
      console.error('Failed to initialize database tables:', err);
      throw err;
    });
  }
  return initPromise;
}

/**
 * Resets database state cleanly by deleting all test rows in tournaments and participants tables.
 */
export async function resetDatabase() {
  await ensureTablesExist();
  await client.execute('DELETE FROM participants;');
  await client.execute('DELETE FROM tournaments;');
  try {
    await client.execute("DELETE FROM sqlite_sequence WHERE name IN ('tournaments', 'participants');");
  } catch {
    // Ignore error if sqlite_sequence does not exist
  }
}
