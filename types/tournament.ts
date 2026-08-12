export type TimeControl = 'Blitz' | 'Rapid' | 'Bullet';

export interface PlatformRules {
  maxRating: number;
  maxPeakRating: number;
  minGamesPlayed: number;
  minAccountAgeMonths: number;
}

export interface QualificationRules {
  chessCom: PlatformRules;
  lichess: PlatformRules;
  // Fallbacks for compatibility
  maxRating?: number;
  maxPeakRating?: number;
  minGamesPlayed?: number;
  minAccountAgeMonths?: number;
}

export type ParticipantVerdict = 'ELIGIBLE' | 'REJECTED';
export type ParticipantStatus = 'PENDING' | 'APPROVED' | 'DISAPPROVED';

export interface Participant {
  id: string;
  tournamentId: string;
  telegramHandle: string;
  chessComUsername: string;
  chessComRating: number | null;
  chessComPeakRating?: number | null;
  chessComGamesCount?: number;
  chessComJoinedAt?: string;
  chessComClosed?: boolean;
  lichessUsername: string;
  lichessRating: number | null;
  lichessPeakRating?: number | null;
  lichessGamesCount?: number;
  lichessJoinedAt?: string;
  lichessTosViolation?: boolean;
  verdict: ParticipantVerdict;
  rejectionReasons: string[];
  manualOverride: boolean;
  status: ParticipantStatus;
  verifiedAt?: string;
  isVerifying?: boolean;
  timestamp?: string;
}

export interface Tournament {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  coverImage: string;
  timeControl: TimeControl;
  rules: QualificationRules;
  status: 'UPCOMING' | 'ONGOING' | 'COMPLETED';
  createdAt: string;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message: string;
  duration?: number;
}
