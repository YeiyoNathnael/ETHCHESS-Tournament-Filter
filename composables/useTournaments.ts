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
  minimumTrustScore: 65,
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
      minimumTrustScore: dbT.minimumTrustScore ?? 65,
    },
    status: 'UPCOMING',
    createdAt: dbT.createdAt || new Date().toISOString(),
  };
}

function mapDbParticipantToFrontend(dbP: any, tournamentRules?: QualificationRules): Participant {
  const p: Participant = {
    id: String(dbP.id),
    tournamentId: String(dbP.tournamentId),
    telegramHandle: dbP.telegramUsername || dbP.telegramHandle || '',
    chessComUsername: dbP.rawChessComUser || dbP.chessComUsername || '',
    chessComRating: dbP.chessComCurrentRating ?? dbP.chessComRating ?? null,
    chessComPeakRating: dbP.chessComPeakRating ?? null,
    chessComPeakDate: dbP.chessComPeakDate ?? undefined,
    chessComGamesCount: dbP.chessComGamesCount ?? 0,
    chessComJoinedAt: dbP.chessComJoinedAt ?? '',
    chessComLastPlayedAt: dbP.chessComLastPlayedAt ?? undefined,
    chessComRd: dbP.chessComRd ?? undefined,
    chessComProv: dbP.chessComProv ?? undefined,
    chessComClosed: dbP.chessComClosed ?? undefined,
    lichessUsername: dbP.rawLichessUser || dbP.lichessUsername || '',
    lichessRating: dbP.lichessCurrentRating ?? dbP.lichessRating ?? null,
    lichessPeakRating: dbP.lichessPeakRating ?? null,
    lichessPeakDate: dbP.lichessPeakDate ?? undefined,
    lichessGamesCount: dbP.lichessGamesCount ?? 0,
    lichessJoinedAt: dbP.lichessJoinedAt ?? '',
    lichessLastPlayedAt: dbP.lichessLastPlayedAt ?? undefined,
    lichessRd: dbP.lichessRd ?? undefined,
    lichessProv: dbP.lichessProv ?? undefined,
    lichessTosViolation: dbP.lichessTosViolation ?? undefined,
    verdict: dbP.systemVerdict || dbP.verdict || 'ELIGIBLE',
    rejectionReasons: typeof dbP.rejectionReasons === 'string'
      ? JSON.parse(dbP.rejectionReasons)
      : (Array.isArray(dbP.rejectionReasons) ? dbP.rejectionReasons : []),
    manualOverride: dbP.organizerStatus === 'APPROVED' || dbP.manualOverride === true,
    status: dbP.organizerStatus || dbP.status || 'PENDING',
    submittedAt: dbP.submittedAt || undefined,
    verifiedAt: dbP.confirmedAt || dbP.verifiedAt || undefined,
  };

  const tourney = tournaments.value.find((t) => String(t.id) === String(p.tournamentId));
  const rules = tournamentRules || tourney?.rules || defaultRules;
  return evaluateParticipant(p, rules);
}

export function useTournaments() {
  const allTournaments = computed(() => tournaments.value);

  const getTournament = (id: string) => {
    return tournaments.value.find((t) => String(t.id) === String(id));
  };

  const getParticipants = (tournamentId: string) => {
    return participantsMap.value[tournamentId] || [];
  };

  const fetchAllTournaments = async () => {
    try {
      const res = await $fetch<{ success: boolean; tournaments: any[] }>('/api/tournaments');
      if (res && res.success && Array.isArray(res.tournaments)) {
        tournaments.value = res.tournaments.map(mapDbTournamentToFrontend);
      }
    } catch (err) {
      console.warn('Could not fetch tournaments from database:', err);
    }
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
          const mappedParticipants = res.participants.map((p) => mapDbParticipantToFrontend(p, mappedTourney.rules));
          participantsMap.value[String(mappedTourney.id)] = mappedParticipants;
          participantsMap.value[id] = mappedParticipants;
        }
      }
    } catch (err) {
      console.warn(`Could not fetch tournament details from API for ID ${id}:`, err);
    }
  };

  // Automatically fetch tournaments from database on client mount
  if (typeof window !== 'undefined' && tournaments.value.length === 0) {
    fetchAllTournaments();
  }

  const createTournament = async (newTourney: Omit<Tournament, 'id' | 'createdAt'>): Promise<Tournament> => {
    try {
      const res = await $fetch<{ success: boolean; tournament: any }>('/api/tournaments', {
        method: 'POST',
        body: {
          title: newTourney.title,
          description: newTourney.description,
          imageUrl: newTourney.coverImage,
          eventDate: newTourney.date,
          location: newTourney.location,
          timeFormat: newTourney.timeControl.toLowerCase(),
          chessComMaxRating: newTourney.rules.chessCom?.maxRating ?? 1500,
          chessComMaxPeak: newTourney.rules.chessCom?.maxPeakRating ?? 1600,
          chessComMinGames: newTourney.rules.chessCom?.minGamesPlayed ?? 30,
          chessComMinAgeMonths: newTourney.rules.chessCom?.minAccountAgeMonths ?? 3,
          lichessMaxRating: newTourney.rules.lichess?.maxRating ?? 1500,
          lichessMaxPeak: newTourney.rules.lichess?.maxPeakRating ?? 1600,
          lichessMinGames: newTourney.rules.lichess?.minGamesPlayed ?? 30,
          lichessMinAgeMonths: newTourney.rules.lichess?.minAccountAgeMonths ?? 3,
        },
      });

      if (res && res.success && res.tournament) {
        const created = mapDbTournamentToFrontend(res.tournament);
        tournaments.value.unshift(created);
        participantsMap.value[created.id] = [];
        return created;
      }
    } catch (err) {
      console.error('Failed to persist tournament to database:', err);
    }

    const fallbackId = `ethchess-${newTourney.timeControl.toLowerCase()}-${Date.now().toString(36)}`;
    const fallback: Tournament = {
      ...newTourney,
      id: fallbackId,
      createdAt: new Date().toISOString(),
    };
    tournaments.value.unshift(fallback);
    participantsMap.value[fallbackId] = [];
    return fallback;
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

  const processCsvFile = async (tournamentId: string, csvText: string): Promise<Participant[]> => {
    if (!isNaN(Number(tournamentId))) {
      try {
        const res = await $fetch<{ success: boolean; participants: any[] }>(`/api/tournaments/${tournamentId}/process-csv`, {
          method: 'POST',
          body: { csvContent: csvText },
        });
        if (res && res.success && Array.isArray(res.participants)) {
          const tourney = getTournament(tournamentId);
          const mapped = res.participants.map((p) => mapDbParticipantToFrontend(p, tourney?.rules));
          participantsMap.value[tournamentId] = mapped;
          return mapped;
        }
      } catch (err) {
        console.warn(`Server process-csv API call failed for tournament ${tournamentId}:`, err);
      }
    }

    const tourney = getTournament(tournamentId);
    const parsed = parseCsvContent(csvText, tournamentId, tourney?.rules || defaultRules, tourney?.timeControl || 'Rapid');
    participantsMap.value[tournamentId] = parsed;
    verifyAllParticipants(tournamentId);
    return parsed;
  };

  const loadDefaultCsvData = (tournamentId: string, rawCsvText?: string): Participant[] => {
    const tourney = getTournament(tournamentId);
    const rules = tourney?.rules || defaultRules;
    const timeControl = tourney?.timeControl || 'Rapid';
    const csvContent = rawCsvText || defaultCSVRaw;
    const parsed = parseCsvContent(csvContent, tournamentId, rules, timeControl);
    participantsMap.value[tournamentId] = parsed;
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

  const deleteParticipant = async (tournamentId: string, participantId: string): Promise<boolean> => {
    if (!isNaN(Number(participantId))) {
      try {
        await $fetch(`/api/participants/${participantId}`, { method: 'DELETE' });
      } catch (err) {
        console.warn(`Could not delete participant ${participantId}:`, err);
      }
    }
    const list = participantsMap.value[tournamentId] || [];
    participantsMap.value[tournamentId] = list.filter((p) => String(p.id) !== String(participantId));
    return true;
  };

  const purgeRejectedParticipants = async (tournamentId: string): Promise<number> => {
    let purged = 0;
    if (!isNaN(Number(tournamentId))) {
      try {
        const res = await $fetch<{ success: boolean; purgedCount: number }>(`/api/tournaments/${tournamentId}/purge-rejected`, {
          method: 'POST',
        });
        if (res && res.success) {
          purged = res.purgedCount;
        }
      } catch (err) {
        console.warn(`Could not purge rejected participants for tournament ${tournamentId}:`, err);
      }
    }

    const list = participantsMap.value[tournamentId] || [];
    const remaining = list.filter((p) => p.status === 'APPROVED' || (p.verdict === 'ELIGIBLE' && p.status !== 'DISAPPROVED'));
    if (purged === 0) purged = list.length - remaining.length;
    participantsMap.value[tournamentId] = remaining;
    return purged;
  };

  return {
    tournaments: allTournaments,
    getTournament,
    getParticipants,
    fetchAllTournaments,
    fetchTournamentDetails,
    createTournament,
    deleteTournament,
    updateTournamentRules,
    setParticipants,
    processCsvFile,
    toggleManualOverride,
    updateParticipantStatus,
    deleteParticipant,
    purgeRejectedParticipants,
    loadDefaultCsvData,
    verifyAllParticipants,
    defaultRules,
  };
}
