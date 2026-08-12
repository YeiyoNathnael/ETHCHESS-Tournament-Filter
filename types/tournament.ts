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
  minimumTrustScore?: number; // Default 65
  peakWindowMonths?: number;  // Default 24
  rejectProvisional?: boolean; // Default false
  // Fallbacks for compatibility
  maxRating?: number;
  maxPeakRating?: number;
  minGamesPlayed?: number;
  minAccountAgeMonths?: number;
}

export type ParticipantVerdict = 'ELIGIBLE' | 'REJECTED';
export type ParticipantStatus = 'PENDING' | 'APPROVED' | 'DISAPPROVED';

export interface TrustScoreDetails {
  score: number; // 0-100
  zScore: number;
  effectiveRating: number;
  effectiveRd: number;
  gameCountFactor: number;
  peakWeight: number;
  peakContribution: number;
  verdictBand: 'EXCELLENT' | 'GOOD' | 'BORDERLINE' | 'POOR' | 'REJECT';
  explanation: string;
  rd: number;
  gamesCount: number;
  lastPlayedAt?: string;
  isProvisional: boolean;
  platform: 'chessCom' | 'lichess' | 'combined';
}

export interface Participant {
  id: string;
  tournamentId: string;
  telegramHandle: string;
  chessComUsername: string;
  chessComRating: number | null;
  chessComPeakRating?: number | null;
  chessComPeakDate?: string;
  chessComGamesCount?: number;
  chessComJoinedAt?: string;
  chessComClosed?: boolean;
  chessComRd?: number;
  chessComProv?: boolean;
  chessComLastPlayedAt?: string;
  lichessUsername: string;
  lichessRating: number | null;
  lichessPeakRating?: number | null;
  lichessPeakDate?: string;
  lichessGamesCount?: number;
  lichessJoinedAt?: string;
  lichessTosViolation?: boolean;
  lichessRd?: number;
  lichessProv?: boolean;
  lichessLastPlayedAt?: string;
  verdict: ParticipantVerdict;
  trustScore?: number;
  trustDetails?: TrustScoreDetails;
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
