<template>
  <div v-if="tournament" class="admin-tournament-page">
    <!-- Top Navigation Breadcrumb -->
    <div class="breadcrumb-bar">
      <NuxtLink to="/" class="back-link">
        <ArrowLeft :size="16" />
        <span>Back to Organizer Dashboard</span>
      </NuxtLink>
      <div class="header-right-actions">
        <button class="btn btn-outline btn-sm btn-delete" @click="isDeleteModalOpen = true">
          <Trash2 :size="14" />
          <span>Delete Event</span>
        </button>
        <NuxtLink :to="`/tournaments/${tournament.id}`" class="btn btn-outline btn-sm">
          <ExternalLink :size="14" />
          <span>View Public Roster Page</span>
        </NuxtLink>
        <button class="btn btn-primary btn-sm" @click="isDrawerOpen = true">
          <SlidersHorizontal :size="14" />
          <span>Tweak Qualification Rules</span>
        </button>
      </div>
    </div>

    <!-- Event Header Card -->
    <div class="event-header-card card">
      <div class="banner-strip">
        <img :src="tournament.coverImage" :alt="tournament.title" class="banner-bg" />
        <div class="overlay"></div>
        <div class="banner-content">
          <div class="meta-badges">
            <span class="badge badge-tc">{{ tournament.timeControl }}</span>
            <span class="badge badge-status">{{ tournament.status }}</span>
          </div>
          <h1 class="header-title">{{ tournament.title }}</h1>
          <p class="header-sub">{{ tournament.description }}</p>
        </div>
      </div>

      <!-- Quick Rule Pills & Stats -->
      <div class="event-summary-bar">
        <div class="summary-item">
          <Calendar :size="16" class="icon-jade" />
          <div>
            <div class="sub-label">Date & Time</div>
            <div class="val-text">{{ formatDate(tournament.date) }}</div>
          </div>
        </div>

        <div class="summary-item">
          <MapPin :size="16" class="icon-jade" />
          <div>
            <div class="sub-label">Location / Platform</div>
            <div class="val-text">{{ tournament.location }}</div>
          </div>
        </div>

        <div class="summary-item">
          <Sliders :size="16" class="icon-jade" />
          <div>
            <div class="sub-label">Active Rules Ceilings</div>
            <div class="val-text">
              Chess.com: ≤ {{ chessComSummaryMax }} ELO | Lichess: ≤ {{ lichessSummaryMax }} ELO
            </div>
          </div>
        </div>

        <div class="summary-item trust-summary-item">
          <Gauge :size="16" class="icon-jade" />
          <div>
            <div class="sub-label">Min Trust Threshold</div>
            <div class="val-text highlight-trust">≥ {{ tournament.rules?.minimumTrustScore ?? 65 }} / 100</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Participant Reviewer Table -->
    <ParticipantReviewer :tournament-id="tournament.id" />

    <!-- Toggleable CSV Intake & Submissions Management (Positioned at Bottom) -->
    <div class="csv-section margin-top">
      <div v-if="!showCsvUploader && participants.length > 0" class="csv-toggle-bar">
        <div class="csv-status-info">
          <FileCheck :size="18" class="icon-jade" />
          <div>
            <div class="status-title">Submissions File Management</div>
            <div class="status-sub">{{ participants.length }} candidates loaded from tournament response form.</div>
          </div>
        </div>
        <button class="btn btn-outline btn-sm" @click="showCsvUploader = true">
          <UploadCloud :size="14" />
          <span>Re-upload or Replace CSV File</span>
        </button>
      </div>

      <div v-else class="csv-box-wrap">
        <div v-if="participants.length > 0" class="csv-box-header">
          <span class="box-title">Upload / Update Form Responses CSV</span>
          <button class="btn-hide" @click="showCsvUploader = false">
            <X :size="14" /> Hide Uploader
          </button>
        </div>
        <CsvUploader :tournament-id="tournament.id" />
      </div>
    </div>

    <!-- Interactive Requirement Tweak Drawer -->
    <Teleport to="body">
      <div v-if="isDrawerOpen" class="drawer-backdrop" @click.self="isDrawerOpen = false">
        <div class="drawer-panel animate-drawer">
          <div class="drawer-header">
            <div class="drawer-title-wrap">
              <SlidersHorizontal :size="20" class="drawer-icon" />
              <div>
                <h3 class="drawer-title">Interactive Rules Tweak</h3>
                <p class="drawer-sub">Adjust qualification criteria to dynamically recalculate participant eligibility.</p>
              </div>
            </div>
            <button class="drawer-close" @click="isDrawerOpen = false">
              <X :size="20" />
            </button>
          </div>

          <!-- Drawer Platform Switcher Tabs -->
          <div class="drawer-tabs">
            <button
              class="drawer-tab-btn"
              :class="{ active: drawerTab === 'chessCom' }"
              @click="drawerTab = 'chessCom'"
            >
              <span>♟ Chess.com Rules</span>
            </button>
            <button
              class="drawer-tab-btn"
              :class="{ active: drawerTab === 'lichess' }"
              @click="drawerTab = 'lichess'"
            >
              <span>♞ Lichess Rules</span>
            </button>
          </div>

          <div class="drawer-body">
            <!-- Chess.com Controls -->
            <div v-if="drawerTab === 'chessCom'" class="tweak-stack">
              <div class="tweak-group">
                <div class="tweak-header">
                  <label class="tweak-label">Chess.com Max Active Rating (ELO)</label>
                  <span class="tweak-value">≤ {{ tempRules.chessCom.maxRating }}</span>
                </div>
                <input
                  v-model.number="tempRules.chessCom.maxRating"
                  type="range"
                  min="800"
                  max="2800"
                  step="25"
                  class="range-slider"
                />
                <span class="tweak-hint">Chess.com rating ceiling for this event.</span>
              </div>

              <div class="tweak-group">
                <div class="tweak-header">
                  <label class="tweak-label">Chess.com Max Peak Rating (ELO)</label>
                  <span class="tweak-value">≤ {{ tempRules.chessCom.maxPeakRating }}</span>
                </div>
                <input
                  v-model.number="tempRules.chessCom.maxPeakRating"
                  type="range"
                  min="900"
                  max="2900"
                  step="25"
                  class="range-slider"
                />
                <span class="tweak-hint">Filters historical Chess.com peaks.</span>
              </div>

              <div class="tweak-group">
                <div class="tweak-header">
                  <label class="tweak-label">Chess.com Min Games Played</label>
                  <span class="tweak-value">≥ {{ tempRules.chessCom.minGamesPlayed }}</span>
                </div>
                <input
                  v-model.number="tempRules.chessCom.minGamesPlayed"
                  type="range"
                  min="0"
                  max="300"
                  step="5"
                  class="range-slider"
                />
                <span class="tweak-hint">Ensures rating stability on Chess.com.</span>
              </div>

              <div class="tweak-group">
                <div class="tweak-header">
                  <label class="tweak-label">Chess.com Min Account Age (Months)</label>
                  <span class="tweak-value">≥ {{ tempRules.chessCom.minAccountAgeMonths }} months</span>
                </div>
                <input
                  v-model.number="tempRules.chessCom.minAccountAgeMonths"
                  type="range"
                  min="1"
                  max="24"
                  step="1"
                  class="range-slider"
                />
                <span class="tweak-hint">Filters new Chess.com accounts.</span>
              </div>
            </div>

            <!-- Lichess Controls -->
            <div v-else class="tweak-stack">
              <div class="tweak-group">
                <div class="tweak-header">
                  <label class="tweak-label">Lichess Max Active Rating (ELO)</label>
                  <span class="tweak-value">≤ {{ tempRules.lichess.maxRating }}</span>
                </div>
                <input
                  v-model.number="tempRules.lichess.maxRating"
                  type="range"
                  min="800"
                  max="2900"
                  step="25"
                  class="range-slider"
                />
                <span class="tweak-hint">Lichess rating ceiling for this event.</span>
              </div>

              <div class="tweak-group">
                <div class="tweak-header">
                  <label class="tweak-label">Lichess Max Peak Rating (ELO)</label>
                  <span class="tweak-value">≤ {{ tempRules.lichess.maxPeakRating }}</span>
                </div>
                <input
                  v-model.number="tempRules.lichess.maxPeakRating"
                  type="range"
                  min="900"
                  max="3000"
                  step="25"
                  class="range-slider"
                />
                <span class="tweak-hint">Filters historical Lichess peaks.</span>
              </div>

              <div class="tweak-group">
                <div class="tweak-header">
                  <label class="tweak-label">Lichess Min Games Played</label>
                  <span class="tweak-value">≥ {{ tempRules.lichess.minGamesPlayed }}</span>
                </div>
                <input
                  v-model.number="tempRules.lichess.minGamesPlayed"
                  type="range"
                  min="0"
                  max="300"
                  step="5"
                  class="range-slider"
                />
                <span class="tweak-hint">Ensures rating stability on Lichess.</span>
              </div>

              <div class="tweak-group">
                <div class="tweak-header">
                  <label class="tweak-label">Lichess Min Account Age (Months)</label>
                  <span class="tweak-value">≥ {{ tempRules.lichess.minAccountAgeMonths }} months</span>
                </div>
                <input
                  v-model.number="tempRules.lichess.minAccountAgeMonths"
                  type="range"
                  min="1"
                  max="24"
                  step="1"
                  class="range-slider"
                />
                <span class="tweak-hint">Filters new Lichess accounts.</span>
              </div>
            </div>

            <!-- Global Trust Score Threshold Slider -->
            <div class="tweak-group trust-tweak-group">
              <div class="tweak-header">
                <label class="tweak-label flex-label">
                  <Gauge :size="16" class="icon-jade" />
                  <span>Minimum Trust Score Threshold</span>
                </label>
                <span class="tweak-value trust-badge-val">≥ {{ tempRules.minimumTrustScore }} / 100</span>
              </div>
              <input
                v-model.number="tempRules.minimumTrustScore"
                type="range"
                min="0"
                max="100"
                step="5"
                class="range-slider"
              />
              <span class="tweak-hint">
                Candidates failing raw ceiling rules but having Trust Score ≥ {{ tempRules.minimumTrustScore }} are rescued to ELIGIBLE.
              </span>
            </div>
          </div>

          <div class="drawer-footer">
            <button class="btn btn-outline" @click="resetRules">Reset Defaults</button>
            <button class="btn btn-primary" @click="handleApplyRules">
              <Sparkles :size="16" />
              <span>Apply & Recalculate Eligibility</span>
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Delete Event Modal -->
    <Teleport to="body">
      <div v-if="isDeleteModalOpen" class="modal-backdrop" @click.self="isDeleteModalOpen = false">
        <div class="modal-content delete-modal-content">
          <div class="delete-modal-header">
            <div class="danger-icon-wrap">
              <AlertTriangle :size="24" />
            </div>
            <div>
              <h3 class="delete-modal-title">Delete Tournament Event</h3>
              <p class="delete-modal-sub">Are you sure you want to delete this tournament event? All associated participants will be deleted.</p>
            </div>
          </div>

          <div v-if="tournament" class="delete-target-info">
            <strong>{{ tournament.title }}</strong>
            <span>ID: {{ tournament.id }}</span>
          </div>

          <div class="delete-modal-actions">
            <button class="btn btn-outline" @click="isDeleteModalOpen = false">Cancel</button>
            <button class="btn btn-secondary btn-danger-confirm" @click="confirmDeleteTournament">
              <Trash2 :size="16" />
              <span>Permanently Delete</span>
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>

  <div v-else class="not-found-page card">
    <h2>Tournament Not Found</h2>
    <p>The requested tournament event ID does not exist.</p>
    <NuxtLink to="/" class="btn btn-primary margin-top">Return to Dashboard</NuxtLink>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useTournaments } from '~/composables/useTournaments';
import { useToast } from '~/composables/useToast';
import CsvUploader from '~/components/CsvUploader.vue';
import ParticipantReviewer from '~/components/ParticipantReviewer.vue';
import {
  ArrowLeft,
  ExternalLink,
  SlidersHorizontal,
  Calendar,
  MapPin,
  Sliders,
  X,
  Sparkles,
  Trash2,
  AlertTriangle,
  FileCheck,
  UploadCloud
} from 'lucide-vue-next';

const route = useRoute();
const router = useRouter();
const tourneyId = computed(() => route.params.id as string);

const { getTournament, getParticipants, fetchTournamentDetails, updateTournamentRules, deleteTournament, defaultRules } = useTournaments();
const { addToast } = useToast();

onMounted(() => {
  if (tourneyId.value) {
    fetchTournamentDetails(tourneyId.value);
  }
});

const tournament = computed(() => getTournament(tourneyId.value));
const participants = computed(() => getParticipants(tourneyId.value));

const isDrawerOpen = ref(false);
const isDeleteModalOpen = ref(false);
const showCsvUploader = ref(false);
const drawerTab = ref<'chessCom' | 'lichess'>('chessCom');

const tempRules = reactive({
  minimumTrustScore: 65,
  chessCom: {
    maxRating: 1500,
    maxPeakRating: 1600,
    minGamesPlayed: 30,
    minAccountAgeMonths: 1,
  },
  lichess: {
    maxRating: 1500,
    maxPeakRating: 1600,
    minGamesPlayed: 30,
    minAccountAgeMonths: 3,
  },
});

const chessComSummaryMax = computed(() => tournament.value?.rules?.chessCom?.maxRating ?? tournament.value?.rules?.chessComMaxRating ?? 1500);
const lichessSummaryMax = computed(() => tournament.value?.rules?.lichess?.maxRating ?? tournament.value?.rules?.lichessMaxRating ?? 1500);

watch(
  tournament,
  (newVal) => {
    if (newVal) {
      tempRules.minimumTrustScore = newVal.rules.minimumTrustScore ?? 65;
      const c = newVal.rules.chessCom || {
        maxRating: newVal.rules.chessComMaxRating ?? 1500,
        maxPeakRating: newVal.rules.chessComMaxPeak ?? 1600,
        minGamesPlayed: newVal.rules.chessComMinGames ?? 30,
        minAccountAgeMonths: newVal.rules.chessComMinAgeMonths ?? 3,
      };
      const l = newVal.rules.lichess || {
        maxRating: newVal.rules.lichessMaxRating ?? 1500,
        maxPeakRating: newVal.rules.lichessMaxPeak ?? 1600,
        minGamesPlayed: newVal.rules.lichessMinGames ?? 30,
        minAccountAgeMonths: newVal.rules.lichessMinAgeMonths ?? 3,
      };
      tempRules.chessCom = { ...c };
      tempRules.lichess = { ...l };
    }
  },
  { immediate: true }
);

function resetRules() {
  tempRules.minimumTrustScore = 65;
  tempRules.chessCom = {
    maxRating: 1500,
    maxPeakRating: 1600,
    minGamesPlayed: 30,
    minAccountAgeMonths: 3,
  };
  tempRules.lichess = {
    maxRating: 1500,
    maxPeakRating: 1600,
    minGamesPlayed: 30,
    minAccountAgeMonths: 3,
  };
}

function confirmDeleteTournament() {
  if (!tournament.value) return;
  const title = tournament.value.title;
  const id = tournament.value.id;
  deleteTournament(id);
  addToast('Tournament Deleted', `Successfully deleted "${title}".`, 'info');
  isDeleteModalOpen.value = false;
  router.push('/');
}

function handleApplyRules() {
  if (!tournament.value) return;

  const finalRules: QualificationRules = {
    minimumTrustScore: tempRules.minimumTrustScore,
    chessCom: { ...tempRules.chessCom },
    lichess: { ...tempRules.lichess },
    chessComMaxRating: tempRules.chessCom.maxRating,
    chessComMaxPeak: tempRules.chessCom.maxPeakRating,
    chessComMinGames: tempRules.chessCom.minGamesPlayed,
    chessComMinAgeMonths: tempRules.chessCom.minAccountAgeMonths || 3,
    lichessMaxRating: tempRules.lichess.maxRating,
    lichessMaxPeak: tempRules.lichess.maxPeakRating,
    lichessMinGames: tempRules.lichess.minGamesPlayed,
    lichessMinAgeMonths: tempRules.lichess.minAccountAgeMonths || 3,
  };

  updateTournamentRules(tournament.value.id, finalRules);

  addToast(
    'Rules Recalculated!',
    `Updated tournament qualification criteria for Chess.com and Lichess. All participant verdicts re-evaluated.`,
    'success'
  );

  isDrawerOpen.value = false;
}

function formatDate(isoStr: string): string {
  try {
    return new Date(isoStr).toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return isoStr;
  }
}
</script>

<style scoped>
.admin-tournament-page {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.breadcrumb-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-weight: 700;
  font-size: 0.9rem;
  color: var(--color-jade-deep);
}

.back-link:hover {
  color: var(--color-jade-bright);
}

.header-right-actions {
  display: flex;
  gap: 0.5rem;
}

.event-header-card {
  padding: 0;
  overflow: hidden;
}

.banner-strip {
  position: relative;
  height: 320px;
  overflow: hidden;
}

.banner-bg {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(0deg, rgba(15, 82, 87, 0.9) 0%, rgba(15, 82, 87, 0.4) 100%);
}

.banner-content {
  position: absolute;
  bottom: 1.25rem;
  left: 1.5rem;
  right: 1.5rem;
  color: white;
}

.meta-badges {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.badge-tc {
  background: var(--color-terracotta);
  color: white;
  padding: 0.2rem 0.6rem;
  border-radius: var(--radius-full);
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
}

.badge-status {
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(4px);
  color: var(--color-cream-accent);
  padding: 0.2rem 0.6rem;
  border-radius: var(--radius-full);
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
}

.header-title {
  font-size: 1.6rem;
  font-weight: 800;
  line-height: 1.2;
  color: white;
}

.header-sub {
  font-size: 0.875rem;
  color: var(--color-jade-light);
  margin-top: 0.25rem;
}

.event-summary-bar {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
  padding: 1.25rem 1.5rem;
  background: var(--color-cream-card);
}

.summary-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.icon-jade {
  color: var(--color-terracotta);
  flex-shrink: 0;
}

.sub-label {
  font-size: 0.725rem;
  font-weight: 700;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.val-text {
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--color-jade-deep);
}

/* Tweak Drawer Styling */
.drawer-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 82, 87, 0.4);
  backdrop-filter: blur(4px);
  z-index: 500;
  display: flex;
  justify-content: flex-end;
}

.drawer-panel {
  width: 100%;
  max-width: 480px;
  height: 100%;
  background: white;
  display: flex;
  flex-direction: column;
  box-shadow: -8px 0 32px rgba(15, 82, 87, 0.2);
}

.drawer-header {
  padding: 1.5rem;
  border-bottom: 1px solid var(--color-cream-border);
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  background: var(--color-jade-deep);
  color: white;
}

.drawer-title-wrap {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.drawer-icon {
  color: var(--color-cream-accent);
}

.drawer-title {
  font-size: 1.2rem;
  font-weight: 800;
  color: var(--color-cream-accent);
}

.drawer-sub {
  font-size: 0.8rem;
  color: var(--color-jade-border);
}

.drawer-close {
  background: transparent;
  border: none;
  color: white;
  cursor: pointer;
  padding: 0.25rem;
}

.drawer-body {
  padding: 1.5rem;
  overflow-y: auto;
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.tweak-group {
  background: var(--color-cream-bg);
  padding: 1rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-cream-border);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.tweak-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.tweak-label {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--color-jade-deep);
}

.tweak-value {
  font-size: 0.85rem;
  font-weight: 800;
  color: var(--color-terracotta);
}

.range-slider {
  width: 100%;
  accent-color: var(--color-jade-deep);
  cursor: pointer;
}

.tweak-hint {
  font-size: 0.725rem;
  color: var(--color-text-muted);
}

.drawer-footer {
  padding: 1.25rem 1.5rem;
  border-top: 1px solid var(--color-cream-border);
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  background: var(--color-cream-bg);
}

.animate-drawer {
  animation: slideDrawer 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes slideDrawer {
  from {
    transform: translateX(100%);
  }
  to {
    transform: translateX(0);
  }
}

.btn-delete {
  border-color: var(--color-danger-text);
  color: var(--color-danger-text);
}

.btn-delete:hover {
  background: var(--color-danger-bg);
}

.drawer-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  background: var(--color-jade-dark);
  padding: 0.5rem;
  gap: 0.5rem;
}

.drawer-tab-btn {
  padding: 0.5rem;
  border: none;
  background: transparent;
  color: var(--color-jade-border);
  font-family: var(--font-family-base);
  font-size: 0.825rem;
  font-weight: 700;
  cursor: pointer;
  border-radius: var(--radius-sm);
  transition: all 0.2s ease;
}

.drawer-tab-btn.active {
  background: white;
  color: var(--color-jade-deep);
  box-shadow: var(--shadow-sm);
}

.tweak-stack {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.margin-top {
  margin-top: 1rem;
}
</style>
