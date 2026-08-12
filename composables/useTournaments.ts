import { ref, computed } from 'vue';
import type { Tournament, Participant, QualificationRules, ParticipantStatus, TimeControl } from '~/types/tournament';
import { parseCsvContent } from '~/utils/csvParser';
import { evaluateParticipant, verifyParticipantLive } from '~/utils/verification';

const defaultCSVRaw = `Timestamp,Telegram Username (@), chess.com Username,chess.com Rapid Rating,lichess username,lichess rapid rating
8/4/2026 2:07:02,Oo_shii,Ooshiii,1005,Ooshiii,1054
8/4/2026 2:24:11,@Luel123qwe,1u3l,1235,Luel0,1207
8/4/2026 2:27:12,@Biniyam_girma_1,biniyam_girma,958,Binyam123,1332
8/4/2026 2:52:25,ab2345111,NOTDEFINETLYHIKARU,746,eysoii,1500
8/4/2026 3:04:02,TonyG30,ToleraG,1255,Tolera,1500
8/4/2026 3:24:36,@Mintesnot4,Mintesnotking,1179,Mintesnot_tal,1457
8/4/2026 3:33:31,@Ba12,demulet,1123,N/A,N/A
8/4/2026 5:14:24,@M1L2P3PLM0,Sofimalt,1023,Sofimalt,1480
8/4/2026 6:18:53,@insideon,Trigan_defense,1521,whabe124,1751
8/4/2026 7:07:22,@hat321,Avatardave10,Not rated,Avatardave,780
8/4/2026 7:17:30,abg47197,AG47AG,1172,None,None
8/4/2026 7:30:43,@goldquokka,Drunkkcatt ,869,Unipain ,1376
8/4/2026 7:45:17,@dawa_sonny,dawa_sonny,1200,dawa_sonny,1290
8/4/2026 7:50:21,@kmnzmn,kmnzmn,1200,kmnzmn,1500 unrated
8/4/2026 8:23:59,@HAKARIIIIII,EPicassoo,1127,EYYUX,1088
8/4/2026 9:38:14,@kena_bar,kenesabergene,1595,kent_bar2024,1716
8/4/2026 10:02:11,@amesi14,amesi18,1500,amesi14,1400
8/4/2026 10:34:47,@Anon_Gambit,@Anonymous_Is_4Chan,700,@QuarkBrust7,1000
8/4/2026 10:46:43,Czar_alazar,Furgoplayz4u,727,furgoplayz4fun,1500
8/4/2026 13:01:11,@Tekmich21,Techmich21,588,Techmich21,"New acc, i dont have lichess"
8/4/2026 13:13:16,Danielslemu2,Danielalemu,1000,Danielalemu,1000
8/4/2026 13:42:48,@VENOMtheGOAT,ThegoatVENOM,1300,theGOATvenom,1383
8/5/2026 13:22:32,Meezomunchdown,Meezomunchdown,720,Meezomunchdown,1300
8/5/2026 16:07:22,@kidusyaredz,xokds,1180,x0kds,1044
8/7/2026 9:04:47,Sami_o0x,Sami_o0x,1100,Sami_o0x,1200
8/7/2026 9:18:50,@Luel123qwe,1u3l,1300,Luel0,1207
8/7/2026 9:18:54,@sohailu,sohailu,1450,sohailu,1560
8/7/2026 9:23:33,@Danielalemu2,daniel_alemu,1000,daniel_alemu,1000
8/7/2026 10:16:14,@edi_prooJ,kala43,1018,I don't have,I don't have
8/7/2026 10:21:18,@kenopl,kenenisa_g,701,keno47,1283
8/7/2026 10:58:52,@Ineffable333,Asantije,1149,Asantije,1236
8/7/2026 11:23:05,@NocturnalSketches,Amanueleo,1100,Amanueleo,1500
8/7/2026 11:35:39,@PhantomT09,Suresmith,1020,TAKI00,1272
8/7/2026 11:59:56,@alle_gobe,Kavd0,1185,Kavd0,1296
8/7/2026 12:29:59,@Dagikos12,BotexDagi ,1400,botexdagi,1800
8/7/2026 13:57:21,@insideon,Trigan_defense,1534,whabe124,1751
8/7/2026 14:11:55,@Mikezgooner,MikeHabesha,940,MichaelEkubay,1246
8/8/2026 8:02:59,@realize_lie,Firomsa-T,1200,firomsa-t,1600
8/8/2026 11:28:29,@NABD2015,NEBYOU2015,1196,NEBIYOU2015,1290
8/10/2026 5:39:31,@Lualotos,@LUal_1,1566,@Lualchelsea,1480
8/10/2026 6:28:21,@meet_abel,abelashine,1200,1800,1800
8/10/2026 12:30:31,@Lonezephyr,Chifa137,2006,Theyla9,1990
8/10/2026 13:01:40,@Do3_42,Yedidya_Getamesay,420,YedidyaG,1605
8/10/2026 13:35:47,@back_stronger_better ,P3p007,1490,Pep777,1825
8/10/2026 15:01:00,Ambaye Tiumelisan,Praise-Him,1534,Kingsback,1500`;

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
