import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const tournaments = sqliteTable('tournaments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  description: text('description'),
  imageUrl: text('image_url'),
  eventDate: text('event_date'),
  location: text('location'),
  timeFormat: text('time_format').$type<'blitz' | 'rapid' | 'bullet'>().default('rapid').notNull(),
  chessComMaxRating: integer('chess_com_max_rating').default(1500).notNull(),
  chessComMaxPeak: integer('chess_com_max_peak').default(1500).notNull(),
  chessComMinAgeMonths: integer('chess_com_min_age_months').default(3).notNull(),
  chessComMinGames: integer('chess_com_min_games').default(30).notNull(),
  lichessMaxRating: integer('lichess_max_rating').default(1500).notNull(),
  lichessMaxPeak: integer('lichess_max_peak').default(1500).notNull(),
  lichessMinAgeMonths: integer('lichess_min_age_months').default(3).notNull(),
  lichessMinGames: integer('lichess_min_games').default(30).notNull(),
  minimumTrustScore: integer('minimum_trust_score').default(65).notNull(),
  createdAt: text('created_at').notNull(),
});

export const participants = sqliteTable('participants', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  tournamentId: integer('tournament_id').notNull().references(() => tournaments.id, { onDelete: 'cascade' }),
  telegramUsername: text('telegram_username'),
  rawChessComUser: text('raw_chess_com_user'),
  rawLichessUser: text('raw_lichess_user'),

  // Chess.com fields
  chessComVerified: integer('chess_com_verified', { mode: 'boolean' }).default(false).notNull(),
  chessComCurrentRating: integer('chess_com_current_rating'),
  chessComPeakRating: integer('chess_com_peak_rating'),
  chessComPeakDate: text('chess_com_peak_date'),
  chessComGamesCount: integer('chess_com_games_count'),
  chessComJoinedAt: text('chess_com_joined_at'),
  chessComLastPlayedAt: text('chess_com_last_played_at'),
  chessComRd: integer('chess_com_rd'),
  chessComProv: integer('chess_com_prov', { mode: 'boolean' }),
  chessComClosed: integer('chess_com_closed', { mode: 'boolean' }).default(false).notNull(),

  // Lichess fields
  lichessVerified: integer('lichess_verified', { mode: 'boolean' }).default(false).notNull(),
  lichessCurrentRating: integer('lichess_current_rating'),
  lichessPeakRating: integer('lichess_peak_rating'),
  lichessPeakDate: text('lichess_peak_date'),
  lichessGamesCount: integer('lichess_games_count'),
  lichessJoinedAt: text('lichess_joined_at'),
  lichessLastPlayedAt: text('lichess_last_played_at'),
  lichessRd: integer('lichess_rd'),
  lichessProv: integer('lichess_prov', { mode: 'boolean' }),
  lichessTosViolation: integer('lichess_tos_violation', { mode: 'boolean' }).default(false).notNull(),

  systemVerdict: text('system_verdict').$type<'ELIGIBLE' | 'REJECTED'>().notNull(),
  rejectionReasons: text('rejection_reasons', { mode: 'json' }).$type<string[]>().notNull(),
  organizerStatus: text('organizer_status').$type<'APPROVED' | 'DISAPPROVED' | 'PENDING'>().default('PENDING').notNull(),
  organizerNotes: text('organizer_notes'),
  confirmedAt: text('confirmed_at'),
  submittedAt: text('submitted_at'),
});

export type Tournament = typeof tournaments.$inferSelect;
export type NewTournament = typeof tournaments.$inferInsert;
export type Participant = typeof participants.$inferSelect;
export type NewParticipant = typeof participants.$inferInsert;
