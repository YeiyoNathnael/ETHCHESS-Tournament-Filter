<template>
  <div class="public-tournament-page">
    <div v-if="pending" class="loading-state card">
      <Loader2 class="animate-spin" :size="32" />
      <span>Loading tournament details...</span>
    </div>

    <div v-else-if="!tournament" class="error-state card">
      <AlertCircle :size="36" class="text-terracotta" />
      <h2>Tournament Not Found</h2>
      <p>The requested tournament ID does not exist or has been removed.</p>
      <NuxtLink to="/" class="btn btn-primary mt-4">Return to Portal</NuxtLink>
    </div>

    <template v-else>
      <!-- Hero Event Banner -->
      <div class="event-hero-card card">
        <div class="hero-image-wrap">
          <img :src="tournament.coverImage" :alt="tournament.title" class="event-cover-img" />
          <div class="hero-overlay"></div>
          <span class="time-control-tag">{{ tournament.timeControl }}</span>
        </div>

        <div class="hero-content">
          <div class="header-badges">
            <span class="status-badge" :class="tournament.status.toLowerCase()">
              {{ tournament.status }}
            </span>
            <span class="location-badge">
              <MapPin :size="14" /> {{ tournament.location }}
            </span>
            <span class="date-badge">
              <Calendar :size="14" /> {{ tournament.date }}
            </span>
          </div>

          <h1 class="event-title">{{ tournament.title }}</h1>
          <p class="event-description">{{ tournament.description }}</p>

          <!-- Qualification Criteria Summary Box -->
          <div class="rules-summary-box">
            <div class="box-title">
              <ShieldCheck :size="18" /> Official Platform Qualification Criteria ({{ tournament.timeControl }})
            </div>
            
            <div class="platform-rules-columns">
              <div class="platform-rule-card chesscom">
                <div class="platform-card-header">
                  <span class="platform-badge chess">♟ Chess.com Requirements</span>
                </div>
                <div class="rule-details">
                  <div class="rule-detail-item">
                    <span class="rule-label">Max Active Rating:</span>
                    <span class="rule-val">≤ {{ chessRules.maxRating }} ELO</span>
                  </div>
                  <div class="rule-detail-item">
                    <span class="rule-label">Max Peak Ceiling:</span>
                    <span class="rule-val">≤ {{ chessRules.maxPeakRating }} ELO</span>
                  </div>
                  <div class="rule-detail-item">
                    <span class="rule-label">Min Games Played:</span>
                    <span class="rule-val">≥ {{ chessRules.minGamesPlayed }} games</span>
                  </div>
                  <div class="rule-detail-item">
                    <span class="rule-label">Min Account Age:</span>
                    <span class="rule-val">≥ {{ chessRules.minAccountAgeDays }} days</span>
                  </div>
                </div>
              </div>

              <div class="platform-rule-card lichess">
                <div class="platform-card-header">
                  <span class="platform-badge lichess">♞ Lichess Requirements</span>
                </div>
                <div class="rule-details">
                  <div class="rule-detail-item">
                    <span class="rule-label">Max Active Rating:</span>
                    <span class="rule-val">≤ {{ lichessRules.maxRating }} ELO</span>
                  </div>
                  <div class="rule-detail-item">
                    <span class="rule-label">Max Peak Ceiling:</span>
                    <span class="rule-val">≤ {{ lichessRules.maxPeakRating }} ELO</span>
                  </div>
                  <div class="rule-detail-item">
                    <span class="rule-label">Min Games Played:</span>
                    <span class="rule-val">≥ {{ lichessRules.minGamesPlayed }} games</span>
                  </div>
                  <div class="rule-detail-item">
                    <span class="rule-label">Min Account Age:</span>
                    <span class="rule-val">≥ {{ lichessRules.minAccountAgeDays }} days</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Approved Roster Section -->
      <div class="roster-section card">
        <div class="roster-header">
          <div>
            <h2 class="roster-title">
              <Users :size="22" /> Official Approved Roster
            </h2>
            <p class="roster-sub">
              Below is the live list of confirmed participants approved by ETHCHESS organizers.
            </p>
          </div>

          <div class="count-pill">
            <CheckCircle2 :size="18" />
            <span>{{ approvedParticipants.length }} Confirmed Players</span>
          </div>
        </div>

        <div v-if="approvedParticipants.length === 0" class="empty-roster">
          <Trophy :size="48" class="empty-icon" />
          <p>No confirmed players registered yet. Check back soon!</p>
        </div>

        <div v-else class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Rank #</th>
                <th>Telegram Handle</th>
                <th>Chess.com Inspection</th>
                <th>Lichess Inspection</th>
                <th>Verified Rating</th>
                <th>Trust Index</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(p, idx) in approvedParticipants" :key="p.id">
                <td class="font-mono text-muted rank-col">#{{ idx + 1 }}</td>
                <td>
                  <span v-if="p.telegramHandle" class="tg-handle">
                    {{ p.telegramHandle.startsWith('@') ? p.telegramHandle : `@${p.telegramHandle}` }}
                  </span>
                  <span v-else class="text-muted">—</span>
                </td>
                <td>
                  <a
                    v-if="p.chessComUsername"
                    :href="`https://www.chess.com/member/${p.chessComUsername}`"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="platform-pill chesscom"
                  >
                    <span>♟ {{ p.chessComUsername }}</span>
                    <ExternalLink :size="12" />
                  </a>
                  <span v-else class="text-muted">—</span>
                </td>
                <td>
                  <a
                    v-if="p.lichessUsername"
                    :href="`https://lichess.org/@/${p.lichessUsername}`"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="platform-pill lichess"
                  >
                    <span>♞ {{ p.lichessUsername }}</span>
                    <ExternalLink :size="12" />
                  </a>
                  <span v-else class="text-muted">—</span>
                </td>
                <td>
                  <div class="ratings-cell">
                    <span v-if="p.chessComRating" class="rating-chip chess">
                      Chess.com: {{ p.chessComRating }} ELO
                    </span>
                    <span v-if="p.lichessRating" class="rating-chip lichess">
                      Lichess: {{ p.lichessRating }} ELO
                    </span>
                  </div>
                </td>
                <td>
                  <span v-if="p.trustScore !== undefined && p.trustScore !== null" class="trust-score-public-badge" :class="getTrustBadgeClass(p.trustScore)" :title="p.trustDetails?.explanation || 'ETHCHESS Statistical Trust Score'">
                    <Gauge :size="12" /> {{ p.trustScore }}/100
                  </span>
                  <span v-else class="text-muted">—</span>
                </td>
                <td>
                  <span class="badge badge-eligible">
                    <CheckCircle2 :size="14" /> Confirmed Approved
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useTournaments } from '~/composables/useTournaments';
import {
  Calendar,
  MapPin,
  Users,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  Loader2,
  AlertCircle,
  Trophy,
  Gauge,
} from 'lucide-vue-next';

const route = useRoute();
const tournamentId = route.params.id as string;

const { tournaments, getParticipants, fetchTournamentDetails } = useTournaments();
const pending = ref(true);

onMounted(async () => {
  if (tournamentId) {
    pending.value = true;
    await fetchTournamentDetails(tournamentId);
    pending.value = false;
  }
});

const tournament = computed(() => {
  return tournaments.value.find((t) => String(t.id) === String(tournamentId));
});

const chessRules = computed(() => {
  const r = tournament.value?.rules;
  if (r?.chessCom) return r.chessCom;
  return {
    maxRating: r?.chessComMaxRating ?? r?.maxRating ?? 1500,
    maxPeakRating: r?.chessComMaxPeak ?? r?.maxPeakRating ?? 1600,
    minGamesPlayed: r?.chessComMinGames ?? r?.minGamesPlayed ?? 30,
    minAccountAgeDays: (r?.chessComMinAgeMonths ?? 3) * 30,
  };
});

const lichessRules = computed(() => {
  const r = tournament.value?.rules;
  if (r?.lichess) return r.lichess;
  return {
    maxRating: r?.lichessMaxRating ?? r?.maxRating ?? 1500,
    maxPeakRating: r?.lichessMaxPeak ?? r?.maxPeakRating ?? 1600,
    minGamesPlayed: r?.lichessMinGames ?? r?.minGamesPlayed ?? 30,
    minAccountAgeDays: (r?.lichessMinAgeMonths ?? 3) * 30,
  };
});

const approvedParticipants = computed(() => {
  return getParticipants(tournamentId).filter((p) => p.status === 'APPROVED');
});

function getTrustBadgeClass(score?: number) {
  if (score === undefined || score === null) return 'trust-na';
  if (score >= 90) return 'trust-excellent';
  if (score >= 70) return 'trust-good';
  if (score >= 50) return 'trust-borderline';
  if (score >= 30) return 'trust-poor';
  return 'trust-reject';
}
</script>

<style scoped>
.public-tournament-page {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.event-hero-card {
  padding: 0;
  overflow: hidden;
  border-radius: var(--radius-lg);
}

.hero-image-wrap {
  position: relative;
  height: 260px;
  width: 100%;
}

.event-cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.hero-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(15, 82, 87, 0.9) 0%, rgba(15, 82, 87, 0.3) 60%, transparent 100%);
}

.time-control-tag {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: var(--color-terracotta);
  color: white;
  font-weight: 800;
  font-size: 0.85rem;
  padding: 0.35rem 0.85rem;
  border-radius: var(--radius-full);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  box-shadow: var(--shadow-md);
}

.hero-content {
  padding: 2rem;
  margin-top: -3rem;
  position: relative;
  z-index: 10;
}

.header-badges {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 0.75rem;
}

.status-badge {
  font-size: 0.75rem;
  font-weight: 800;
  padding: 0.2rem 0.6rem;
  border-radius: var(--radius-sm);
  text-transform: uppercase;
}

.status-badge.upcoming {
  background: var(--color-terracotta);
  color: white;
}

.status-badge.ongoing {
  background: var(--color-jade-bright);
  color: white;
}

.location-badge,
.date-badge {
  color: var(--color-cream-accent);
  font-size: 0.85rem;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.event-title {
  font-size: 2.2rem;
  font-weight: 800;
  color: var(--color-jade-deep);
  margin-bottom: 0.5rem;
  line-height: 1.2;
}

.event-description {
  font-size: 1rem;
  color: var(--color-text-muted);
  max-width: 800px;
  line-height: 1.6;
}

.rules-summary-box {
  background: white;
  border: 1px solid var(--color-cream-border);
  border-radius: var(--radius-md);
  padding: 1.25rem;
  margin-top: 1.5rem;
  box-shadow: var(--shadow-sm);
}

.box-title {
  font-weight: 800;
  color: var(--color-jade-deep);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1rem;
  margin-bottom: 1rem;
}

.platform-rules-columns {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
}

.platform-rule-card {
  background: var(--color-cream-bg);
  border: 1px solid var(--color-cream-border);
  border-radius: var(--radius-sm);
  padding: 1rem;
}

.platform-rule-card.chesscom {
  border-top: 3px solid #7FA650;
}

.platform-rule-card.lichess {
  border-top: 3px solid #000000;
}

.platform-card-header {
  margin-bottom: 0.75rem;
}

.platform-badge {
  font-size: 0.8rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.platform-badge.chess {
  color: #5D8034;
}

.platform-badge.lichess {
  color: #1A1A1A;
}

.rule-details {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.rule-detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.825rem;
}

.rule-label {
  color: var(--color-text-muted);
  font-weight: 500;
}

.rule-val {
  font-weight: 700;
  color: var(--color-jade-deep);
}

.rank-col {
  font-weight: 800;
  color: var(--color-jade-deep);
  width: 60px;
}

.rating-chip.chess {
  background: #F0FDF4;
  color: #15803D;
  border: 1px solid #BBF7D0;
}

.rating-chip.lichess {
  background: #F8FAFC;
  color: #334155;
  border: 1px solid #E2E8F0;
}

.roster-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.roster-title {
  font-size: 1.4rem;
  font-weight: 800;
  color: var(--color-jade-deep);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.roster-sub {
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

.count-pill {
  background: var(--color-success-bg);
  color: var(--color-success-text);
  font-weight: 700;
  font-size: 0.9rem;
  padding: 0.5rem 1rem;
  border-radius: var(--radius-full);
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.empty-roster {
  text-align: center;
  padding: 3rem 1rem;
  color: var(--color-text-muted);
}

.empty-icon {
  margin: 0 auto 1rem auto;
  opacity: 0.4;
  color: var(--color-jade-deep);
}

.tg-handle {
  font-weight: 700;
  color: var(--color-jade-deep);
}

.ratings-cell {
  display: flex;
  gap: 0.35rem;
}

.rating-chip {
  background: var(--color-jade-light);
  color: var(--color-jade-deep);
  font-weight: 700;
  font-size: 0.75rem;
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
}

.trust-score-public-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.78rem;
  font-weight: 800;
  padding: 0.2rem 0.55rem;
  border-radius: var(--radius-full);
  border: 1px solid transparent;
}

.trust-score-public-badge.trust-excellent {
  background: #E6F7F0;
  color: #0E7B4E;
  border-color: #A2E2C7;
}

.trust-score-public-badge.trust-good {
  background: #EBF5FF;
  color: #1D4ED8;
  border-color: #BFDBFE;
}

.trust-score-public-badge.trust-borderline {
  background: #FEF3C7;
  color: #D97706;
  border-color: #FDE68A;
}

.trust-score-public-badge.trust-poor {
  background: #FFEDD5;
  color: #C2410C;
  border-color: #FDBA74;
}

.trust-score-public-badge.trust-reject {
  background: #FDE8E6;
  color: #C82A2A;
  border-color: #F87171;
}
</style>
