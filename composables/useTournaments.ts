import { ref, computed } from 'vue';
import type { Tournament, Participant, QualificationRules, ParticipantStatus, TimeControl } from '~/types/tournament';
import { parseCsvContent } from '~/utils/csvParser';
import { evaluateParticipant, verifyParticipantLive } from '~/utils/verification';

const defaultCSVRaw = "";

const defaultRules: QualificationRules = {
  chessComMaxRating: 1500,
  chessComMaxPeak: 1600,
  chessComMinGames: 30,
  chessComMinAgeMonths: 3,
  lichessMaxRating: 1500,
  lichessMaxPeak: 1600,
  lichessMinGames: 30,
  lichessMinAgeMonths: 3,
};

const tournaments = ref<Tournament[]>([]);

// Map of participants by tournamentId
const participantsMap = ref<Record<string, Participant[]>>({});

function mapDbTournamentToFrontend(dbT: any): Tournament {
  const timeControlCapitalized = (dbT.timeFormat
    ? dbT.timeFormat.charAt(0).toUpperCase() + dbT.timeFormat.slice(1)
    : 'Rapid') as TimeControl;

  return {
    id: String(dbT.id),
    title: dbT.title,
    description: dbT.description || '',
    date: dbT.eventDate || new Date().toISOString(),
    location: dbT.location || 'Online',
    coverImage: dbT.imageUrl || 'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?q=80&w=1000&auto=format&fit=crop',
    timeControl: timeControlCapitalized,
    rules: {
      chessComMaxRating: dbT.chessComMaxRating ?? 1500,
      chessComMaxPeak: dbT.chessComMaxPeak ?? 1600,
      chessComMinGames: dbT.chessComMinGames ?? 30,
      chessComMinAgeMonths: dbT.chessComMinAgeMonths ?? 3,
      lichessMaxRating: dbT.lichessMaxRating ?? 1500,
      lichessMaxPeak: dbT.lichessMaxPeak ?? 1600,
      lichessMinGames: dbT.lichessMinGames ?? 30,
      lichessMinAgeMonths: dbT.lichessMinAgeMonths ?? 3,
    },
    status: 'UPCOMING',
    createdAt: dbT.createdAt || new Date().toISOString(),
  };
}

function mapDbParticipantToFrontend(dbP: any): Participant {
  return {
    id: String(dbP.id),
    tournamentId: String(dbP.tournamentId),
    telegramHandle: dbP.telegramUsername || '',
    chessComUsername: dbP.rawChessComUser || '',
    chessComRating: dbP.chessComCurrentRating ?? null,
    chessComPeakRating: dbP.chessComPeakRating ?? null,
    chessComGamesCount: dbP.chessComGamesCount ?? 0,
    chessComJoinedAt: dbP.chessComJoinedAt ?? '',
    chessComClosed: dbP.chessComClosed ?? false,
    lichessUsername: dbP.rawLichessUser || '',
    lichessRating: dbP.lichessCurrentRating ?? null,
    lichessPeakRating: dbP.lichessPeakRating ?? null,
    lichessGamesCount: dbP.lichessGamesCount ?? 0,
    lichessJoinedAt: dbP.lichessJoinedAt ?? '',
    lichessTosViolation: dbP.lichessTosViolation ?? false,
    verdict: dbP.systemVerdict || 'ELIGIBLE',
    rejectionReasons: typeof dbP.rejectionReasons === 'string'
      ? JSON.parse(dbP.rejectionReasons)
      : (Array.isArray(dbP.rejectionReasons) ? dbP.rejectionReasons : []),
    manualOverride: false,
    status: dbP.organizerStatus || 'PENDING',
    submittedAt: dbP.submittedAt || undefined,
    verifiedAt: dbP.confirmedAt || undefined,
  };
}

export function useTournaments() {
  const allTournaments = computed(() => tournaments.value);

  const getTournament = (id: string) => {
    return tournaments.value.find((t) => String(t.id) === String(id));
  };

  const getParticipants = (tournamentId: string) => {
    return participantsMap.value[tournamentId] || [];
  };

  const fetchTournamentDetails = async (id: string) => {
    try {
      const res = await $fetch<{
        success: boolean;
        tournament: any;
        participants: any[];
      }>(`/api/tournaments/${id}`);

      if (res && res.success && res.tournament) {
        const mappedTourney = mapDbTournamentToFrontend(res.tournament);
        const existingIdx = tournaments.value.findIndex(
          (t) => String(t.id) === String(mappedTourney.id) || String(t.id) === String(id)
        );
        if (existingIdx !== -1) {
          tournaments.value[existingIdx] = mappedTourney;
        } else {
          tournaments.value.unshift(mappedTourney);
        }

        if (res.participants) {
          const mappedParticipants = res.participants.map(mapDbParticipantToFrontend);
          participantsMap.value[String(mappedTourney.id)] = mappedParticipants;
          participantsMap.value[id] = mappedParticipants;
        }
      }
    } catch (err) {
      console.warn(`Could not fetch tournament details from API for ID ${id}:`, err);
    }
  };

  const createTournament = (newTourney: Omit<Tournament, 'id' | 'createdAt'>): Tournament => {
    const id = `ethchess-${newTourney.timeControl.toLowerCase()}-${Date.now().toString(36)}`;
    const tournament: Tournament = {
      ...newTourney,
      id,
      createdAt: new Date().toISOString(),
    };
    tournaments.value.unshift(tournament);
    participantsMap.value[id] = [];
    return tournament;
  };

  const deleteTournament = async (id: string) => {
    try {
      await $fetch(`/api/tournaments/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.warn(`API error deleting tournament ${id}:`, err);
    }
    tournaments.value = tournaments.value.filter((t) => String(t.id) !== String(id));
    delete participantsMap.value[id];
  };

  const updateTournamentRules = (tournamentId: string, newRules: QualificationRules) => {
    const tourney = getTournament(tournamentId);
    if (!tourney) return;
    tourney.rules = { ...newRules };

    // Re-evaluate all participants under new rules
    const existing = participantsMap.value[tournamentId] || [];
    participantsMap.value[tournamentId] = existing.map((p) => evaluateParticipant(p, newRules));
  };

  const setParticipants = (tournamentId: string, newParticipants: Participant[]) => {
    participantsMap.value[tournamentId] = newParticipants;
  };

  const toggleManualOverride = async (tournamentId: string, participantId: string): Promise<Participant | undefined> => {
    const list = participantsMap.value[tournamentId];
    if (!list) return;

    const p = list.find((item) => String(item.id) === String(participantId));
    if (p) {
      p.manualOverride = !p.manualOverride;
      if (p.manualOverride) {
        p.status = 'APPROVED';
      } else {
        p.status = p.verdict === 'ELIGIBLE' ? 'PENDING' : 'DISAPPROVED';
      }

      // API Sync if numeric ID
      if (!isNaN(Number(participantId))) {
        try {
          await $fetch(`/api/participants/${participantId}/status`, {
            method: 'PATCH',
            body: { organizerStatus: p.status },
          });
        } catch (err) {
          console.warn(`Could not sync override for participant ${participantId}:`, err);
        }
      }
      return p;
    }
  };

  const updateParticipantStatus = async (
    tournamentId: string,
    participantId: string,
    status: ParticipantStatus
  ): Promise<Participant | undefined> => {
    const list = participantsMap.value[tournamentId];
    if (!list) return;

    const p = list.find((item) => String(item.id) === String(participantId));
    if (p) {
      p.status = status;

      // API Sync if numeric ID
      if (!isNaN(Number(participantId))) {
        try {
          await $fetch(`/api/participants/${participantId}/status`, {
            method: 'PATCH',
            body: { organizerStatus: status },
          });
        } catch (err) {
          console.warn(`Could not sync status for participant ${participantId}:`, err);
        }
      }
      return p;
    }
  };

  const loadDefaultCsvData = (tournamentId: string, rawCsvText?: string): Participant[] => {
    const tourney = getTournament(tournamentId);
    const rules = tourney?.rules || defaultRules;
    const timeControl = tourney?.timeControl || 'Rapid';
    const csvContent = rawCsvText || defaultCSVRaw;
    const parsed = parseCsvContent(csvContent, tournamentId, rules, timeControl);
    participantsMap.value[tournamentId] = parsed;

    // Trigger background live verification for the exact time control!
    verifyAllParticipants(tournamentId);

    return parsed;
  };

  const verifyAllParticipants = async (
    tournamentId: string,
    onProgress?: (completed: number, total: number) => void
  ) => {
    const tourney = getTournament(tournamentId);
    if (!tourney) return;

    const list = [...(participantsMap.value[tournamentId] || [])];
    const total = list.length;
    let completed = 0;
    const chunkSize = 5;

    for (let i = 0; i < total; i += chunkSize) {
      const chunk = list.slice(i, i + chunkSize);
      const chunkResults = await Promise.all(
        chunk.map(async (item) => {
          if (!item) return item;
          item.isVerifying = true;
          const updated = await verifyParticipantLive(item, tourney.rules, tourney.timeControl.toLowerCase() as any);
          updated.isVerifying = false;
          return updated;
        })
      );

      for (let j = 0; j < chunkResults.length; j++) {
        if (chunkResults[j]) {
          list[i + j] = chunkResults[j]!;
        }
      }

      completed += chunkResults.length;
      participantsMap.value[tournamentId] = [...list];
      if (onProgress) {
        onProgress(completed, total);
      }
    }
  };

  return {
    tournaments: allTournaments,
    getTournament,
    getParticipants,
    fetchTournamentDetails,
    createTournament,
    deleteTournament,
    updateTournamentRules,
    setParticipants,
    toggleManualOverride,
    updateParticipantStatus,
    loadDefaultCsvData,
    verifyAllParticipants,
    defaultRules,
  };
}
