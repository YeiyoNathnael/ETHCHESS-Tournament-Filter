import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema';

const url = process.env.TURSO_DATABASE_URL || 'file:local.db';
const authToken = process.env.TURSO_AUTH_TOKEN;

export const client = createClient({
  url,
  authToken,
});

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
          chess_com_games_count INTEGER,
          chess_com_joined_at TEXT,
          chess_com_closed INTEGER NOT NULL DEFAULT 0,
          lichess_verified INTEGER NOT NULL DEFAULT 0,
          lichess_current_rating INTEGER,
          lichess_peak_rating INTEGER,
          lichess_games_count INTEGER,
          lichess_joined_at TEXT,
          lichess_tos_violation INTEGER NOT NULL DEFAULT 0,
          system_verdict TEXT NOT NULL,
          rejection_reasons TEXT NOT NULL,
          organizer_status TEXT NOT NULL DEFAULT 'PENDING',
          organizer_notes TEXT,
          confirmed_at TEXT,
          submitted_at TEXT
        );
      `);
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
