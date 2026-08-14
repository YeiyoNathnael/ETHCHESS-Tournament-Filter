<template>
  <div class="public-page-wrapper">
    <!-- Standalone Image-2 Inspired Header (No Admin Links) -->
    <PublicNavbar :tournament-id="tournamentId" @open-claim="openStep1Modal" />

    <main class="public-main-content">
      <!-- Loading Skeleton -->
      <div v-if="pending" class="container py-12">
        <div class="skeleton-banner animate-pulse"></div>
        <div class="skeleton-card animate-pulse mt-6"></div>
      </div>

      <!-- Error State -->
      <div v-else-if="error || !tournament" class="container py-12">
        <div class="error-card">
          <AlertCircle :size="48" class="text-terracotta mb-4" />
          <h2>Tournament Not Found</h2>
          <p>The public roster link you accessed could not be loaded or may no longer exist.</p>
        </div>
      </div>

      <!-- Tournament Roster View -->
      <div v-else class="container py-6">
        <!-- Hero Header Card -->
        <div class="public-hero-card">
          <div class="hero-card-grid">
            <div class="hero-image-box">
              <img
                :src="tournament.coverImage || tournament.imageUrl || 'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?auto=format&fit=crop&q=80&w=1200'"
                :alt="tournament.title"
                class="hero-img"
              />
              <div class="hero-badge-wrap">
                <span class="time-format-chip" :class="tournament.timeControl.toLowerCase()">
                  {{ tournament.timeControl }}
                </span>
                <span class="roster-count-chip">
                  <Users :size="13" />
                  {{ approvedParticipants.length }} Confirmed
                </span>
              </div>
            </div>

            <div class="hero-content">
              <h1 class="event-title">{{ tournament.title }}</h1>
              <p v-if="tournament.description" class="event-desc">{{ tournament.description }}</p>

              <div class="event-meta-grid">
                <div class="meta-item">
                  <Calendar :size="16" class="icon-jade" />
                  <span>{{ formatDate(tournament.date) }}</span>
                </div>
                <div class="meta-item">
                  <MapPin :size="16" class="icon-jade" />
                  <span>{{ tournament.location || 'Online' }}</span>
                </div>
                <div class="meta-item">
                  <ShieldCheck :size="16" class="icon-jade" />
                  <span>Fair Play Verified Roster</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Qualification Rules Breakdown Box -->
        <div id="rules" class="rules-breakdown-card">
          <div class="rules-card-header">
            <ShieldCheck :size="20" class="icon-jade" />
            <h3 class="rules-card-title">Official Qualification Limits</h3>
          </div>

          <div class="rules-platform-grid">
            <!-- Chess.com Criteria -->
            <div class="platform-rules-box chesscom">
              <div class="pr-title-row">
                <IconChessCom :size="18" />
                <h4>Chess.com Requirements</h4>
              </div>
              <div class="pr-metrics">
                <div class="pr-metric">
                  <span class="lbl">Max Rating:</span>
                  <span class="val">≤ {{ tournament.rules?.chessComMaxRating ?? 1200 }} ELO</span>
                </div>
                <div class="pr-metric">
                  <span class="lbl">Max Peak:</span>
                  <span class="val">≤ {{ tournament.rules?.chessComMaxPeak ?? 1200 }} ELO</span>
                </div>
                <div class="pr-metric">
                  <span class="lbl">Min Games:</span>
                  <span class="val">≥ {{ tournament.rules?.chessComMinGames ?? 30 }} games</span>
                </div>
                <div class="pr-metric">
                  <span class="lbl">Min Account Age:</span>
                  <span class="val">≥ {{ tournament.rules?.chessComMinAgeMonths ?? 3 }} months</span>
                </div>
              </div>
            </div>

            <!-- Lichess Criteria -->
            <div class="platform-rules-box lichess">
              <div class="pr-title-row">
                <IconLichess :size="18" />
                <h4>Lichess Requirements</h4>
              </div>
              <div class="pr-metrics">
                <div class="pr-metric">
                  <span class="lbl">Max Rating:</span>
                  <span class="val">≤ {{ tournament.rules?.lichessMaxRating ?? 1500 }} ELO</span>
                </div>
                <div class="pr-metric">
                  <span class="lbl">Max Peak:</span>
                  <span class="val">≤ {{ tournament.rules?.lichessMaxPeak ?? 1500 }} ELO</span>
                </div>
                <div class="pr-metric">
                  <span class="lbl">Min Games:</span>
                  <span class="val">≥ {{ tournament.rules?.lichessMinGames ?? 30 }} games</span>
                </div>
                <div class="pr-metric">
                  <span class="lbl">Min Account Age:</span>
                  <span class="val">≥ {{ tournament.rules?.lichessMinAgeMonths ?? 3 }} months</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Missing Handle / Unlisted Appeal Callout Banner -->
        <div class="appeal-callout-banner">
          <div class="appeal-banner-left">
            <HelpCircle :size="24" class="icon-terracotta" />
            <div>
              <h4 class="appeal-banner-title">Registered but can't find your handle on this roster?</h4>
              <p class="appeal-banner-desc">
                If you didn't provide your Lichess account, or are truly U1500 Lichess & U1200 Chess.com and registered, submit a resolution request for organizer review.
              </p>
            </div>
          </div>
          <button class="btn btn-appeal-action" @click="openStep1Modal">
            <Send :size="15" />
            <span>Submit Handle Resolution</span>
          </button>
        </div>

        <!-- Confirmed Roster Section -->
        <div id="roster" class="roster-section">
          <div class="roster-section-header">
            <div>
              <h2 class="roster-title">Official Competitor Roster</h2>
              <p class="roster-sub">List of player handles confirmed by organizers to compete.</p>
            </div>

            <!-- Search Filter Input -->
            <div class="search-input-wrap">
              <Search :size="16" class="search-icon" />
              <input
                v-model="searchQuery"
                type="text"
                placeholder="Search handle..."
                class="roster-search-input"
              />
              <button v-if="searchQuery" class="clear-search-btn" @click="searchQuery = ''">
                <X :size="14" />
              </button>
            </div>
          </div>

          <!-- Empty Roster -->
          <div v-if="filteredApproved.length === 0" class="empty-roster-box">
            <UserX :size="36" class="icon-terracotta mb-2" />
            <h3>{{ searchQuery ? 'No Confirmed Players Match Search' : 'Roster In Preparation' }}</h3>
            <p>{{ searchQuery ? 'Try searching another handle.' : 'Official player confirmations are currently being processed by organizers.' }}</p>
          </div>

          <!-- Desktop Competitors Table (>= 768px) -->
          <div v-else class="desktop-roster-table-wrap">
            <table class="roster-table">
              <thead>
                <tr>
                  <th class="col-rank">#</th>
                  <th>Telegram Username</th>
                  <th>Platform Profiles</th>
                  <th>Verified Ratings</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(p, index) in filteredApproved" :key="p.id" class="roster-row">
                  <td class="col-rank">
                    <span class="rank-badge">#{{ index + 1 }}</span>
                  </td>
                  <td class="col-telegram">
                    <span class="tg-handle">{{ p.telegramHandle }}</span>
                  </td>
                  <td class="col-platforms">
                    <div class="handles-cell">
                      <a
                        v-if="isVerifiedChessComUser(p)"
                        :href="`https://www.chess.com/member/${p.chessComUsername}`"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="platform-pill chesscom"
                      >
                        <IconChessCom :size="13" />
                        <span>{{ p.chessComUsername }}</span>
                        <ExternalLink :size="10" />
                      </a>
                      <a
                        v-if="isVerifiedLichessUser(p)"
                        :href="`https://lichess.org/@/${p.lichessUsername}`"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="platform-pill lichess"
                      >
                        <IconLichess :size="13" />
                        <span>{{ p.lichessUsername }}</span>
                        <ExternalLink :size="10" />
                      </a>
                      <button
                        v-else
                        class="platform-pill lichess-missing"
                        title="Click to submit missing Lichess handle"
                        @click="openStep1Modal"
                      >
                        <IconLichess :size="13" />
                        <span>Lichess Missing</span>
                      </button>
                    </div>
                  </td>
                  <td class="col-ratings">
                    <div class="ratings-cell">
                      <span v-if="isVerifiedChessComUser(p) && p.chessComStats?.currentRating" class="rating-chip chesscom">
                        <IconChessCom :size="12" />
                        <span>{{ p.chessComStats.currentRating }} ELO</span>
                      </span>
                      <span v-if="isVerifiedLichessUser(p) && p.lichessStats?.currentRating" class="rating-chip lichess">
                        <IconLichess :size="12" />
                        <span>{{ p.lichessStats.currentRating }} ELO</span>
                      </span>
                    </div>
                  </td>
                  <td class="col-status">
                    <span class="confirmed-pill">
                      <CheckCircle2 :size="13" />
                      CONFIRMED
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Mobile-First Competitors Card List (< 768px) -->
          <div v-if="filteredApproved.length > 0" class="mobile-roster-cards-wrap">
            <div v-for="(p, index) in filteredApproved" :key="p.id" class="mobile-player-card">
              <div class="mp-card-top">
                <span class="rank-badge">#{{ index + 1 }}</span>
                <span class="tg-handle">{{ p.telegramHandle }}</span>
                <span class="confirmed-pill ml-auto">
                  <CheckCircle2 :size="12" />
                  CONFIRMED
                </span>
              </div>

              <div class="mp-card-bottom">
                <div class="handles-cell">
                  <a
                    v-if="isVerifiedChessComUser(p)"
                    :href="`https://www.chess.com/member/${p.chessComUsername}`"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="platform-pill chesscom"
                  >
                    <IconChessCom :size="13" />
                    <span>{{ p.chessComUsername }}</span>
                    <span v-if="p.chessComStats?.currentRating" class="rating-sub">({{ p.chessComStats.currentRating }})</span>
                    <ExternalLink :size="10" />
                  </a>
                  <a
                    v-if="isVerifiedLichessUser(p)"
                    :href="`https://lichess.org/@/${p.lichessUsername}`"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="platform-pill lichess"
                  >
                    <IconLichess :size="13" />
                    <span>{{ p.lichessUsername }}</span>
                    <span v-if="p.lichessStats?.currentRating" class="rating-sub">({{ p.lichessStats.currentRating }})</span>
                    <ExternalLink :size="10" />
                  </a>
                  <button
                    v-else
                    class="platform-pill lichess-missing"
                    title="Click to submit missing Lichess handle"
                    @click="openStep1Modal"
                  >
                    <IconLichess :size="13" />
                    <span>Lichess Missing</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- STEP 1: 2-Choice Decision Modal -->
    <Teleport to="body">
      <div v-if="showStep1Modal" class="modal-backdrop" @click.self="showStep1Modal = false">
        <div class="modal-content animate-modal choice-modal">
          <div class="modal-header">
            <div class="modal-title-wrap">
              <HelpCircle :size="22" class="icon-terracotta" />
              <div>
                <h3 class="modal-title">Handle & Registration Resolution</h3>
                <p class="modal-subtitle">Select your situation to submit a request to organizers</p>
              </div>
            </div>
            <button class="close-btn" @click="showStep1Modal = false">
              <X :size="20" />
            </button>
          </div>

          <div class="modal-body choice-body">
            <div class="choice-option-card" @click="selectChoice('MISSING_LICHESS')">
              <div class="choice-text">
                <h4>Already registered in form, but forgot/missing Lichess account</h4>
                <p>I submitted the form earlier, but didn't provide my Lichess handle or need to add it now.</p>
              </div>
            </div>

            <div class="choice-option-card" @click="selectChoice('UNLISTED_REGISTERED')">
              <div class="choice-text">
                <h4>Registered and eligible, but not listed on confirmed roster</h4>
                <p>I registered and truly meet U1500 Lichess & U1200 Chess.com limits, but can't find my handle.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- STEP 2: Claim Form Popup Modal -->
    <Teleport to="body">
      <div v-if="showFormModal" class="modal-backdrop" @click.self="showFormModal = false">
        <div class="modal-content animate-modal claim-form-modal">
          <div class="modal-header">
            <div class="modal-title-wrap">
              <Send :size="20" class="icon-jade" />
              <div>
                <h3 class="modal-title">
                  {{ selectedClaimType === 'MISSING_LICHESS' ? 'Provide Missing Lichess Account' : 'Unlisted Competitor Appeal' }}
                </h3>
                <p class="modal-subtitle">Enter your handles below for organizer verification</p>
              </div>
            </div>
            <button class="close-btn" @click="showFormModal = false">
              <X :size="20" />
            </button>
          </div>

          <form @submit.prevent="submitClaim">
            <div class="modal-body form-body">
              <div class="form-group">
                <label class="form-label">Telegram Username <span class="required">*</span></label>
                <input
                  v-model="claimForm.telegramUsername"
                  type="text"
                  placeholder="@your_telegram_username"
                  required
                  class="form-input"
                />
              </div>

              <div class="form-group">
                <label class="form-label">Chess.com Handle</label>
                <input
                  v-model="claimForm.chessComUser"
                  type="text"
                  placeholder="e.g. MagnusCarlsen"
                  class="form-input"
                />
              </div>

              <div class="form-group">
                <label class="form-label">Lichess Handle</label>
                <input
                  v-model="claimForm.lichessUser"
                  type="text"
                  placeholder="e.g. DrNykterstein"
                  class="form-input"
                />
              </div>

              <div class="form-group">
                <label class="form-label">Notes / Additional Info</label>
                <textarea
                  v-model="claimForm.notes"
                  rows="3"
                  placeholder="Briefly explain your rating or registration details..."
                  class="form-textarea"
                ></textarea>
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn btn-outline" @click="showFormModal = false">Cancel</button>
              <button type="submit" class="btn btn-primary" :disabled="isSubmittingClaim">
                <Send :size="14" />
                <span>{{ isSubmittingClaim ? 'Submitting...' : 'Submit Resolution Request' }}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useTournaments } from '~/composables/useTournaments';
import { useToast } from '~/composables/useToast';
import {
  Calendar,
  MapPin,
  Users,
  ShieldCheck,
  Search,
  X,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  UserX,
  HelpCircle,
  Send,
} from 'lucide-vue-next';
import IconChessCom from '~/components/icons/IconChessCom.vue';
import IconLichess from '~/components/icons/IconLichess.vue';

definePageMeta({
  layout: 'public',
});

const route = useRoute();
const tournamentId = computed(() => String(route.params.id || ''));

const { getTournament, getParticipants, fetchTournamentDetails } = useTournaments();
const { addToast } = useToast();

const pending = ref(true);
const error = ref(false);
const searchQuery = ref('');

const tournament = computed(() => getTournament(tournamentId.value));
const participants = computed(() => getParticipants(tournamentId.value));

/**
 * Checks if a platform handle string is a genuine username or a placeholder/fake input.
 */
function isRealHandle(handle?: string | null): boolean {
  if (!handle || typeof handle !== 'string') return false;
  const cleaned = handle.trim().toLowerCase().replace(/^["']|["']$/g, '');
  if (!cleaned) return false;

  const fakeValues = new Set([
    'n/a', 'na', 'none', 'no', 'null', 'undefined', '-', '--', '---', 'nil', 'nan',
    'no account', 'no lichess', 'no chess.com', 'not applicable',
    "i don't have", 'i dont have', "don't have", 'dont have',
    "i don't have lichess", 'i dont have lichess', "i don't have chess.com", 'i dont have chess.com',
    "i don't have one", 'i dont have one', 'dont have one', "don't have one",
    '0', 'nothing', 'not registered', 'not playing', 'idk', 'anonymous', 'i have no account'
  ]);

  if (fakeValues.has(cleaned)) return false;

  if (
    /^(i\s+)?don'?t\s+have/i.test(cleaned) ||
    /^no\s+(lichess|account|profile|username|chess\.com)/i.test(cleaned) ||
    /does\s+not\s+have/i.test(cleaned)
  ) {
    return false;
  }

  return true;
}

/**
 * Formats ISO date string into a user-friendly format (e.g., "Aug 30, 2026 at 3:00 PM")
 */
function formatDate(dateString?: string | null): string {
  if (!dateString) return 'TBD';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  } catch {
    return dateString;
  }
}

/**
 * Determines if a participant has a valid, verified Lichess user account on public view.
 */
function isVerifiedLichessUser(p: any): boolean {
  if (!p || !p.lichessUsername) return false;

  const raw = String(p.lichessUsername).trim();

  // 1. Text sanity check (filters "don't have", "n/a", "none", "no account")
  if (!isRealHandle(raw)) return false;

  // 2. Format check: Lichess usernames cannot be pure digits (e.g., "400") or < 2 characters
  if (/^\d+$/.test(raw) || raw.length < 2) return false;

  // 3. Database verification check: if API returned 404/unverified and no rating exists
  if (p.lichessVerified === false && (!p.lichessStats || p.lichessStats.currentRating === null)) {
    return false;
  }

  return true;
}

/**
 * Determines if a participant has a valid, verified Chess.com user account on public view.
 */
function isVerifiedChessComUser(p: any): boolean {
  if (!p || !p.chessComUsername) return false;

  const raw = String(p.chessComUsername).trim();

  if (!isRealHandle(raw)) return false;
  if (/^\d+$/.test(raw) || raw.length < 2) return false;
  if (p.chessComVerified === false && (!p.chessComStats || p.chessComStats.currentRating === null)) {
    return false;
  }

  return true;
}

const approvedParticipants = computed(() => {
  return participants.value.filter((p) => p.status === 'APPROVED');
});

const filteredApproved = computed(() => {
  if (!searchQuery.value.trim()) return approvedParticipants.value;
  const q = searchQuery.value.toLowerCase().trim();
  return approvedParticipants.value.filter((p) => {
    return (
      p.telegramHandle.toLowerCase().includes(q) ||
      (isVerifiedChessComUser(p) && p.chessComUsername.toLowerCase().includes(q)) ||
      (isVerifiedLichessUser(p) && p.lichessUsername.toLowerCase().includes(q))
    );
  });
});

// Modal State
const showStep1Modal = ref(false);
const showFormModal = ref(false);
const selectedClaimType = ref<'MISSING_LICHESS' | 'UNLISTED_REGISTERED'>('MISSING_LICHESS');
const isSubmittingClaim = ref(false);

const claimForm = reactive({
  telegramUsername: '',
  chessComUser: '',
  lichessUser: '',
  notes: '',
});

function openStep1Modal() {
  showStep1Modal.value = true;
}

function selectChoice(type: 'MISSING_LICHESS' | 'UNLISTED_REGISTERED') {
  selectedClaimType.value = type;
  showStep1Modal.value = false;
  showFormModal.value = true;
}

async function submitClaim() {
  if (!claimForm.telegramUsername.trim()) return;
  try {
    isSubmittingClaim.value = true;
    const res = await $fetch<{ success: boolean; message: string }>(`/api/tournaments/${tournamentId.value}/claims`, {
      method: 'POST',
      body: {
        claimType: selectedClaimType.value,
        telegramUsername: claimForm.telegramUsername,
        chessComUser: claimForm.chessComUser,
        lichessUser: claimForm.lichessUser,
        notes: claimForm.notes,
      },
    });

    if (res && res.success) {
      addToast('Resolution Request Submitted!', 'Organizers will review your handle details shortly.', 'success');
      showFormModal.value = false;
      claimForm.telegramUsername = '';
      claimForm.chessComUser = '';
      claimForm.lichessUser = '';
      claimForm.notes = '';
    }
  } catch (err: any) {
    addToast('Submission Failed', err.statusMessage || 'Could not submit claim request.', 'error');
  } finally {
    isSubmittingClaim.value = false;
  }
}

onMounted(async () => {
  try {
    pending.value = true;
    await fetchTournamentDetails(tournamentId.value);
  } catch (err) {
    error.value = true;
  } finally {
    pending.value = false;
  }
});
</script>

<style scoped>
.public-page-wrapper {
  min-height: 100vh;
  background: var(--color-cream-bg, #FAFAF5);
  font-family: 'Space Grotesk', sans-serif;
  color: var(--color-jade-deep, #0F5257);
}

.container {
  max-width: 1100px;
  margin: 0 auto;
  padding-left: 1rem;
  padding-right: 1rem;
}

.public-hero-card {
  background: #fff;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
  border: 1px solid rgba(15, 82, 87, 0.12);
  margin-bottom: 1.5rem;
  padding: 1.25rem;
}

.hero-card-grid {
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: 1.5rem;
  align-items: center;
}

.hero-image-box {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: 12px;
  overflow: hidden;
  background: var(--color-cream-surface, #FAF7F2);
  border: 1px solid rgba(15, 82, 87, 0.1);
}

.hero-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.hero-badge-wrap {
  position: absolute;
  bottom: 0.6rem;
  left: 0.6rem;
  right: 0.6rem;
  z-index: 2;
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
}

@media (max-width: 680px) {
  .public-hero-card {
    padding: 1rem;
  }

  .hero-card-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .hero-image-box {
    max-height: 300px;
    aspect-ratio: 1 / 1;
  }
}

.time-format-chip {
  background: var(--color-terracotta, #D96B43);
  color: #fff;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  padding: 4px 10px;
  border-radius: 20px;
}

.roster-count-chip {
  background: rgba(255, 255, 255, 0.25);
  backdrop-filter: blur(8px);
  color: #fff;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.hero-content {
  padding: 1.5rem;
}

.event-title {
  font-size: 1.8rem;
  font-weight: 700;
  line-height: 1.2;
  color: var(--color-jade-deep, #0F5257);
  margin-bottom: 0.5rem;
}

.event-desc {
  font-size: 0.95rem;
  color: #555;
  line-height: 1.5;
  margin-bottom: 1.2rem;
}

.event-meta-grid {
  display: flex;
  gap: 1.2rem;
  flex-wrap: wrap;
  border-top: 1px solid rgba(15, 82, 87, 0.1);
  padding-top: 1rem;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.85rem;
  font-weight: 600;
}

.icon-jade {
  color: var(--color-jade-primary, #00A86B);
}

.icon-terracotta {
  color: var(--color-terracotta, #D96B43);
}

/* Appeal Callout Banner */
.appeal-callout-banner {
  background: #fff;
  border: 1px solid rgba(217, 107, 67, 0.3);
  border-left: 4px solid var(--color-terracotta, #D96B43);
  border-radius: 12px;
  padding: 1.2rem 1.5rem;
  margin-bottom: 2rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.appeal-banner-left {
  display: flex;
  align-items: flex-start;
  gap: 0.8rem;
  flex: 1;
}

.appeal-banner-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-jade-deep, #0F5257);
  margin-bottom: 2px;
}

.appeal-banner-desc {
  font-size: 0.85rem;
  color: #666;
  line-height: 1.4;
}

.btn-appeal-action {
  background: var(--color-terracotta, #D96B43);
  color: #fff;
  border: none;
  padding: 0.6rem 1.2rem;
  border-radius: 8px;
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 700;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s ease;
}

.btn-appeal-action:hover {
  background: #b84f2b;
  transform: translateY(-1px);
}

/* Rules Breakdown Box */
.rules-breakdown-card {
  background: var(--color-cream-surface, #FAF7F2);
  border: 1px solid rgba(15, 82, 87, 0.15);
  border-radius: 14px;
  padding: 1.2rem;
  margin-bottom: 1.5rem;
}

.rules-card-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.rules-card-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--color-jade-deep, #0F5257);
}

.rules-platform-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
}

.platform-rules-box {
  background: #fff;
  border-radius: 10px;
  padding: 1rem;
  border: 1px solid rgba(15, 82, 87, 0.1);
}

.pr-title-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.8rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid rgba(15, 82, 87, 0.08);
}

.pr-title-row h4 {
  font-size: 0.9rem;
  font-weight: 700;
}

.pr-metrics {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.pr-metric {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.4rem;
  width: 100%;
}

.pr-metric .lbl {
  font-size: 0.75rem;
  color: #666;
  white-space: nowrap;
}

.pr-metric .val {
  font-size: 0.8rem;
  font-weight: 700;
  white-space: nowrap;
  color: var(--color-jade-deep, #0F5257);
}

/* Roster Section */
.roster-section-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 1rem;
  margin-bottom: 1.2rem;
  flex-wrap: wrap;
}

.roster-title {
  font-size: 1.4rem;
  font-weight: 700;
}

.roster-sub {
  font-size: 0.85rem;
  color: #666;
}

.search-input-wrap {
  position: relative;
  width: 100%;
  max-width: 320px;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #888;
}

.roster-search-input {
  width: 100%;
  padding: 0.5rem 2rem 0.5rem 2.2rem;
  border-radius: 8px;
  border: 1px solid rgba(15, 82, 87, 0.2);
  background: #fff;
  font-family: 'Space Grotesk', sans-serif;
  font-size: 0.85rem;
}

.desktop-roster-table-wrap {
  display: block;
  background: #fff;
  border-radius: 12px;
  border: 1px solid rgba(15, 82, 87, 0.12);
  overflow: hidden;
}

.mobile-roster-cards-wrap {
  display: none;
}

@media (max-width: 767px) {
  .desktop-roster-table-wrap {
    display: none;
  }
  .mobile-roster-cards-wrap {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
}

.mobile-player-card {
  background: #fff;
  border: 1px solid rgba(15, 82, 87, 0.12);
  border-radius: 10px;
  padding: 0.9rem;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
}

.mp-card-top {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.rank-badge {
  font-weight: 700;
  color: var(--color-jade-primary, #00A86B);
  background: rgba(0, 168, 107, 0.1);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.75rem;
}

.tg-handle {
  font-weight: 700;
  font-size: 0.9rem;
}

.confirmed-pill {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  background: rgba(0, 168, 107, 0.12);
  color: var(--color-jade-primary, #00A86B);
  font-size: 0.7rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 12px;
}

.roster-table {
  width: 100%;
  border-collapse: collapse;
}

.roster-table th {
  background: var(--color-cream-surface, #FAF7F2);
  padding: 0.8rem 1rem;
  text-align: left;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--color-jade-deep, #0F5257);
  border-bottom: 1px solid rgba(15, 82, 87, 0.1);
}

.roster-table td {
  padding: 0.85rem 1rem;
  border-bottom: 1px solid rgba(15, 82, 87, 0.06);
  font-size: 0.85rem;
}

.handles-cell {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
}

.platform-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 7px;
  border-radius: 5px;
  font-size: 0.75rem;
  font-weight: 600;
  text-decoration: none;
}

.platform-pill.chesscom {
  background: rgba(129, 182, 76, 0.15);
  color: #457522;
}

.platform-pill.lichess {
  background: rgba(43, 108, 176, 0.12);
  color: #2b6cb0;
}

/* Modals */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.modal-content {
  background: #fff;
  border-radius: 16px;
  width: 100%;
  max-width: 500px;
  overflow: hidden;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
}

.modal-header {
  padding: 1.2rem;
  border-bottom: 1px solid rgba(15, 82, 87, 0.1);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.modal-title-wrap {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.modal-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--color-jade-deep, #0F5257);
}

.modal-subtitle {
  font-size: 0.8rem;
  color: #666;
}

.close-btn {
  background: none;
  border: none;
  color: #888;
  cursor: pointer;
}

.choice-body {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.choice-option-card {
  border: 1px solid rgba(15, 82, 87, 0.2);
  border-radius: 12px;
  padding: 1.2rem;
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.choice-option-card:hover {
  border-color: var(--color-jade-primary, #00A86B);
  background: rgba(0, 168, 107, 0.04);
  transform: translateY(-1px);
}

.choice-icon {
  font-size: 1.5rem;
}

.choice-text h4 {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--color-jade-deep, #0F5257);
  margin-bottom: 4px;
}

.choice-text p {
  font-size: 0.8rem;
  color: #666;
  line-height: 1.4;
}

.form-body {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-label {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--color-jade-deep, #0F5257);
}

.required {
  color: var(--color-terracotta, #D96B43);
}

.form-input, .form-textarea {
  width: 100%;
  padding: 0.6rem;
  border-radius: 8px;
  border: 1px solid rgba(15, 82, 87, 0.2);
  font-family: 'Space Grotesk', sans-serif;
  font-size: 0.85rem;
}

.modal-footer {
  padding: 1rem 1.5rem;
  background: var(--color-cream-surface, #FAF7F2);
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

.ml-auto {
  margin-left: auto;
}

.modal-content {
  background: #fff;
  border-radius: 16px;
  width: 100%;
  max-width: 480px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
}

.modal-body, .choice-body, .form-body {
  overflow-y: auto;
}

@media (max-width: 480px) {
  .modal-backdrop {
    padding: 0.75rem;
  }

  .modal-header {
    padding: 0.85rem 1rem;
  }

  .modal-title {
    font-size: 0.95rem;
  }

  .modal-subtitle {
    font-size: 0.74rem;
  }

  .choice-body, .form-body {
    padding: 1rem;
    gap: 0.75rem;
  }

  .choice-option-card {
    padding: 0.85rem 0.95rem;
    gap: 0.75rem;
  }

  .choice-text h4 {
    font-size: 0.88rem;
    margin-bottom: 2px;
  }

  .choice-text p {
    font-size: 0.78rem;
    line-height: 1.35;
  }

  .modal-footer {
    padding: 0.85rem 1rem;
  }
}
</style>
