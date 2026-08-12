<template>
  <div class="participant-reviewer card">
    <div class="reviewer-header">
      <div class="header-left">
        <h3 class="card-title">
          <Users :size="22" />
          Participant Qualification Reviewer
        </h3>
        <p class="card-subtitle">
          Screen candidates, inspect rating histories, toggle manual overrides, and send official Telegram confirmation messages.
        </p>
      </div>

      <!-- Search Input -->
      <div class="search-box">
        <Search :size="16" class="search-icon" />
        <input
          v-model="searchQuery"
          type="text"
          class="search-input"
          placeholder="Search Telegram @handle or chess username..."
        />
        <button v-if="searchQuery" class="clear-search" @click="searchQuery = ''">
          <X :size="14" />
        </button>
      </div>
    </div>

    <!-- Filter Tabs -->
    <div class="filter-tabs">
      <button
        class="tab-btn"
        :class="{ active: currentTab === 'all' }"
        @click="currentTab = 'all'"
      >
        <ListFilter :size="14" />
        <span>All</span>
        <span class="tab-count">{{ counts.all }}</span>
      </button>

      <button
        class="tab-btn"
        :class="{ active: currentTab === 'eligible' }"
        @click="currentTab = 'eligible'"
      >
        <ShieldCheck :size="14" />
        <span>Eligible</span>
        <span class="tab-count eligible">{{ counts.eligible }}</span>
      </button>

      <button
        class="tab-btn"
        :class="{ active: currentTab === 'rejected' }"
        @click="currentTab = 'rejected'"
      >
        <AlertTriangle :size="14" />
        <span>Rejected</span>
        <span class="tab-count rejected">{{ counts.rejected }}</span>
      </button>

      <button
        class="tab-btn"
        :class="{ active: currentTab === 'approved' }"
        @click="currentTab = 'approved'"
      >
        <CheckCircle2 :size="14" />
        <span>Approved</span>
        <span class="tab-count approved">{{ counts.approved }}</span>
      </button>

      <button
        class="tab-btn"
        :class="{ active: currentTab === 'disapproved' }"
        @click="currentTab = 'disapproved'"
      >
        <XCircle :size="14" />
        <span>Disapproved</span>
        <span class="tab-count disapproved">{{ counts.disapproved }}</span>
      </button>
    </div>

    <!-- Quality of Life Quick Action Bar -->
    <div class="qol-action-bar">
      <div class="qol-status-summary">
        <span class="summary-badge">Total: {{ counts.all }}</span>
        <span class="summary-badge eligible">Eligible: {{ counts.eligible }}</span>
        <span class="summary-badge approved">Approved: {{ counts.approved }}</span>
      </div>

      <div class="qol-buttons">
        <button
          v-if="counts.approved > 0"
          class="btn btn-sm btn-outline btn-copy-approved"
          title="Copy all approved Telegram handles for broadcast message"
          @click="handleCopyApprovedTelegramList"
        >
          <Copy :size="14" />
          <span>Copy {{ counts.approved }} Approved Handles</span>
        </button>
      </div>
    </div>

    <!-- Data Table -->
    <div class="table-responsive">
      <table class="data-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Participant Telegram</th>
            <th>Platform Handles</th>
            <th>System Verdict</th>
            <th>Status & Override</th>
            <th class="text-right">Actions</th>
          </tr>
        </thead>

        <tbody>
          <tr v-if="filteredParticipants.length === 0">
            <td colspan="6" class="empty-state">
              <UserX :size="32" class="empty-icon" />
              <p class="empty-title">No participants found</p>
              <p class="empty-sub">Try tweaking your search query or switching filter tabs.</p>
            </td>
          </tr>

          <tr
            v-for="(p, idx) in filteredParticipants"
            :key="p.id"
            class="clickable-row"
            :class="{
              'row-rejected': p.verdict === 'REJECTED' && !p.manualOverride && p.status !== 'APPROVED',
              'row-approved': p.status === 'APPROVED',
              'row-overridden': p.manualOverride
            }"
            @click="openDetailModal(p)"
          >
            <td class="col-index">{{ idx + 1 }}</td>

            <!-- Participant Info -->
            <td class="col-telegram">
              <div class="telegram-info">
                <span class="tg-handle">{{ p.telegramHandle }}</span>
              </div>
              <span v-if="p.timestamp" class="timestamp-sub">{{ formatTimestamp(p.timestamp) }}</span>
            </td>

            <!-- Compact Handles -->
            <td class="col-handles" @click.stop>
              <div class="handles-row">
                <a
                  v-if="p.chessComUsername"
                  :href="`https://www.chess.com/member/${p.chessComUsername}`"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="compact-handle-pill chesscom"
                  title="View Chess.com profile"
                >
                  <span class="brand-symbol">♟</span>
                  <span>{{ p.chessComUsername }}</span>
                  <ExternalLink :size="11" class="ext-icon" />
                </a>
                <span v-else class="no-handle-badge">C.com: —</span>

                <a
                  v-if="p.lichessUsername"
                  :href="`https://lichess.org/@/${p.lichessUsername}`"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="compact-handle-pill lichess"
                  title="View Lichess profile"
                >
                  <span class="brand-symbol">♞</span>
                  <span>{{ p.lichessUsername }}</span>
                  <ExternalLink :size="11" class="ext-icon" />
                </a>
                <span v-else class="no-handle-badge">Lichess: —</span>
              </div>
            </td>

            <!-- System Verdict Badge -->
            <td class="col-verdict">
              <span v-if="p.verdict === 'ELIGIBLE'" class="verdict-badge eligible">
                <ShieldCheck :size="13" />
                ELIGIBLE
              </span>
              <span v-else class="verdict-badge rejected">
                <AlertTriangle :size="13" />
                REJECTED
              </span>
            </td>

            <!-- Status & Override Toggle -->
            <td class="col-status" @click.stop>
              <div class="status-cell-wrap">
                <span class="status-pill-badge" :class="p.status.toLowerCase()">
                  {{ p.status }}
                </span>

                <!-- Manual Override Button -->
                <button
                  class="override-toggle-btn"
                  :class="{ active: p.manualOverride }"
                  :title="p.manualOverride ? 'Manual override active (Force Approved)' : 'Click to force approve candidate'"
                  @click="handleToggleOverride(p)"
                >
                  <Zap :size="12" />
                  <span>{{ p.manualOverride ? 'Overridden' : 'Override' }}</span>
                </button>
              </div>
            </td>

            <!-- Action Buttons -->
            <td class="col-actions text-right" @click.stop>
              <div class="action-buttons-wrap">
                <button
                  class="btn btn-sm btn-outline btn-detail"
                  title="View Full Profile Details & Rejection Reasons"
                  @click="openDetailModal(p)"
                >
                  <Eye :size="14" />
                  <span>Inspect</span>
                </button>

                <button
                  class="btn btn-sm btn-telegram"
                  :class="{ approved: p.status === 'APPROVED' }"
                  title="Approve & Send Telegram Confirmation"
                  @click="handleAcceptAndConfirm(p)"
                >
                  <Send :size="14" />
                  <span>{{ p.status === 'APPROVED' ? 'Confirmed' : 'Accept & Send' }}</span>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Participant Detail Popup Modal -->
    <Teleport to="body">
      <div v-if="selectedParticipant" class="modal-backdrop" @click.self="closeDetailModal">
        <div class="modal-content animate-modal detail-modal">
          <div class="modal-header">
            <div class="modal-title-wrap">
              <div class="header-icon-badge">
                <Send :size="20" />
              </div>
              <div>
                <h2 class="modal-title">{{ selectedParticipant.telegramHandle }}</h2>
                <p class="modal-subtitle">Submitted: {{ formatTimestamp(selectedParticipant.timestamp) }}</p>
              </div>
            </div>
            <button class="close-btn" @click="closeDetailModal">
              <X :size="20" />
            </button>
          </div>

          <div class="modal-body space-y">
            <!-- Verdict Banner -->
            <div
              class="verdict-banner"
              :class="{
                eligible: selectedParticipant.verdict === 'ELIGIBLE' || selectedParticipant.manualOverride,
                rejected: selectedParticipant.verdict === 'REJECTED' && !selectedParticipant.manualOverride
              }"
            >
              <div class="banner-icon">
                <ShieldCheck v-if="selectedParticipant.verdict === 'ELIGIBLE' || selectedParticipant.manualOverride" :size="24" />
                <AlertTriangle v-else :size="24" />
              </div>
              <div>
                <div class="banner-title">
                  System Verdict: {{ selectedParticipant.verdict }}
                  <span v-if="selectedParticipant.manualOverride" class="override-tag">⚡ Manually Overridden</span>
                </div>
                <div class="banner-sub">
                  <span v-if="selectedParticipant.verdict === 'ELIGIBLE'">Participant meets all tournament qualification criteria.</span>
                  <span v-else-if="selectedParticipant.manualOverride">Organizer manually force-approved candidate despite failing automated rules.</span>
                  <span v-else>Participant failed automated qualification requirements.</span>
                </div>
              </div>
            </div>

            <!-- Itemized Rejection Reasons (if any) -->
            <div
              v-if="selectedParticipant.rejectionReasons && selectedParticipant.rejectionReasons.length > 0"
              class="rejection-box"
            >
              <h4 class="box-heading">
                <AlertTriangle :size="16" />
                Itemized Qualification Failures ({{ selectedParticipant.rejectionReasons.length }})
              </h4>
              <ul class="rejection-list">
                <li v-for="(reason, rIdx) in selectedParticipant.rejectionReasons" :key="rIdx">
                  {{ reason }}
                </li>
              </ul>
            </div>

            <!-- Platform Stats Breakdown Grid -->
            <div class="platform-stats-grid">
              <!-- Chess.com Card -->
              <div class="platform-card chesscom">
                <div class="card-header-bar">
                  <span class="brand-title">♟ Chess.com</span>
                  <a
                    v-if="selectedParticipant.chessComUsername"
                    :href="`https://www.chess.com/member/${selectedParticipant.chessComUsername}`"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="ext-link"
                  >
                    @{{ selectedParticipant.chessComUsername }}
                    <ExternalLink :size="12" />
                  </a>
                  <span v-else class="text-muted">Not Provided</span>
                </div>

                <div v-if="selectedParticipant.chessComUsername" class="stats-row">
                  <div class="stat-cell">
                    <span class="stat-lbl">{{ timeControlLabel }} ELO</span>
                    <span class="stat-val">{{ selectedParticipant.chessComRating ?? 'N/A' }}</span>
                  </div>
                  <div class="stat-cell">
                    <span class="stat-lbl">{{ timeControlLabel }} Peak</span>
                    <span class="stat-val highlight">{{ selectedParticipant.chessComPeakRating ?? 'N/A' }}</span>
                  </div>
                  <div class="stat-cell">
                    <span class="stat-lbl">Games Count</span>
                    <span class="stat-val">{{ selectedParticipant.chessComGamesCount ?? 0 }}</span>
                  </div>
                </div>
                <div v-else class="no-data-msg">No Chess.com account provided.</div>
              </div>

              <!-- Lichess Card -->
              <div class="platform-card lichess">
                <div class="card-header-bar">
                  <span class="brand-title">♞ Lichess</span>
                  <a
                    v-if="selectedParticipant.lichessUsername"
                    :href="`https://lichess.org/@/${selectedParticipant.lichessUsername}`"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="ext-link"
                  >
                    @{{ selectedParticipant.lichessUsername }}
                    <ExternalLink :size="12" />
                  </a>
                  <span v-else class="text-muted">Not Provided</span>
                </div>

                <div v-if="selectedParticipant.lichessUsername" class="stats-row">
                  <div class="stat-cell">
                    <span class="stat-lbl">{{ timeControlLabel }} ELO</span>
                    <span class="stat-val">{{ selectedParticipant.lichessRating ?? 'N/A' }}</span>
                  </div>
                  <div class="stat-cell">
                    <span class="stat-lbl">{{ timeControlLabel }} Peak</span>
                    <span class="stat-val highlight">{{ selectedParticipant.lichessPeakRating ?? 'N/A' }}</span>
                  </div>
                  <div class="stat-cell">
                    <span class="stat-lbl">Games Count</span>
                    <span class="stat-val">{{ selectedParticipant.lichessGamesCount ?? 0 }}</span>
                  </div>
                </div>
                <div v-else class="no-data-msg">No Lichess account provided.</div>
              </div>
            </div>

            <!-- Manual Override Control Panel -->
            <div class="override-control-panel">
              <div class="override-text">
                <div class="panel-heading">Organizer Manual Verdict Override</div>
                <div class="panel-desc">
                  Toggle this to force-approve candidates who fail automated filters due to edge-case ratings or account history.
                </div>
              </div>

              <button
                class="override-action-btn"
                :class="{ active: selectedParticipant.manualOverride }"
                @click="handleToggleOverride(selectedParticipant)"
              >
                <Zap :size="16" />
                <span>{{ selectedParticipant.manualOverride ? 'Override Enabled (Force Approved)' : 'Enable Manual Override' }}</span>
              </button>
            </div>
          </div>

          <!-- Modal Footer Actions -->
          <div class="modal-footer">
            <button class="btn btn-outline" @click="closeDetailModal">Close</button>

            <button
              class="btn btn-telegram"
              :class="{ approved: selectedParticipant.status === 'APPROVED' }"
              @click="handleAcceptAndConfirm(selectedParticipant)"
            >
              <Send :size="16" />
              <span>{{ selectedParticipant.status === 'APPROVED' ? 'Confirmed & Copy Message' : 'Accept & Send Telegram Message' }}</span>
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { Participant } from '~/types/tournament';
import { useTournaments } from '~/composables/useTournaments';
import { useToast } from '~/composables/useToast';
import {
  Users,
  Search,
  X,
  ListFilter,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  UserX,
  Send,
  ExternalLink,
  Zap,
  Eye,
  Copy
} from 'lucide-vue-next';
import confetti from 'canvas-confetti';

const props = defineProps<{
  tournamentId: string;
}>();

const { getTournament, getParticipants, toggleManualOverride, updateParticipantStatus } = useTournaments();
const { addToast } = useToast();

const searchQuery = ref('');
const currentTab = ref<'all' | 'eligible' | 'rejected' | 'approved' | 'disapproved'>('all');
const selectedParticipant = ref<Participant | null>(null);

const tourney = computed(() => getTournament(props.tournamentId));
const timeControlLabel = computed(() => tourney.value?.timeControl || 'Format');

const rawParticipants = computed(() => getParticipants(props.tournamentId));

const counts = computed(() => {
  const list = rawParticipants.value;
  return {
    all: list.length,
    eligible: list.filter((p) => p.verdict === 'ELIGIBLE' || p.manualOverride).length,
    rejected: list.filter((p) => p.verdict === 'REJECTED' && !p.manualOverride).length,
    approved: list.filter((p) => p.status === 'APPROVED').length,
    disapproved: list.filter((p) => p.status === 'DISAPPROVED').length,
  };
});

const filteredParticipants = computed(() => {
  let list = rawParticipants.value;

  // Filter by Tab
  if (currentTab.value === 'eligible') {
    list = list.filter((p) => p.verdict === 'ELIGIBLE' || p.manualOverride);
  } else if (currentTab.value === 'rejected') {
    list = list.filter((p) => p.verdict === 'REJECTED' && !p.manualOverride);
  } else if (currentTab.value === 'approved') {
    list = list.filter((p) => p.status === 'APPROVED');
  } else if (currentTab.value === 'disapproved') {
    list = list.filter((p) => p.status === 'DISAPPROVED');
  }

  // Search Filter
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase();
    list = list.filter(
      (p) =>
        p.telegramHandle.toLowerCase().includes(q) ||
        p.chessComUsername.toLowerCase().includes(q) ||
        p.lichessUsername.toLowerCase().includes(q)
    );
  }

  return list;
});

function openDetailModal(p: Participant) {
  selectedParticipant.value = p;
}

function closeDetailModal() {
  selectedParticipant.value = null;
}

async function handleToggleOverride(p: Participant) {
  const updated = await toggleManualOverride(props.tournamentId, p.id);
  if (updated) {
    if (updated.manualOverride) {
      addToast(
        'Manual Override Active',
        `Force approved ${p.telegramHandle}. Verdict overridden by organizer.`,
        'success'
      );
    } else {
      addToast(
        'Manual Override Removed',
        `Restored default automated verdict for ${p.telegramHandle}.`,
        'info'
      );
    }
  }
}

async function handleCopyApprovedTelegramList() {
  const approvedList = rawParticipants.value
    .filter((p) => p.status === 'APPROVED')
    .map((p) => p.telegramHandle)
    .filter(Boolean);

  if (approvedList.length === 0) {
    addToast('No Approved Participants', 'There are no approved candidates to copy.', 'warning');
    return;
  }

  const text = approvedList.join(' ');
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      addToast(
        'Copied Approved List!',
        `Copied ${approvedList.length} approved Telegram handles to clipboard for broadcast message!`,
        'success'
      );
    }
  } catch (err) {
    console.warn('Copy error:', err);
  }
}

async function handleAcceptAndConfirm(p: Participant) {
  // Update status to APPROVED
  await updateParticipantStatus(props.tournamentId, p.id, 'APPROVED');

  // Trigger celebration confetti
  confetti({
    particleCount: 75,
    spread: 60,
    origin: { y: 0.7 },
  });

  // Clean handle for Telegram link
  const rawHandle = p.telegramHandle.replace(/^@/, '').trim();
  const confirmationMsg = `Hi @${rawHandle}! You are officially APPROVED for the ETHCHESS Tournament! See you in the arena!`;

  // Copy to clipboard
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(confirmationMsg);
      addToast(
        'Confirmed & Message Copied!',
        `Approval message copied to clipboard. Opening Telegram chat for @${rawHandle}...`,
        'success'
      );
    }
  } catch (err) {
    console.warn('Clipboard copy error:', err);
  }

  // Launch Telegram link in new tab
  if (rawHandle) {
    window.open(`https://t.me/${rawHandle}`, '_blank', 'noopener,noreferrer');
  }
}

function formatTimestamp(isoStr?: string): string {
  if (!isoStr) return '';
  try {
    return new Date(isoStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return isoStr;
  }
}
</script>

<style scoped>
.participant-reviewer {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.reviewer-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 1rem;
}

.card-title {
  font-size: 1.25rem;
  font-weight: 800;
  color: var(--color-jade-deep);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.card-subtitle {
  font-size: 0.85rem;
  color: var(--color-text-muted);
  margin-top: 0.2rem;
}

.search-box {
  position: relative;
  min-width: 280px;
}

.search-icon {
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-text-muted);
}

.search-input {
  width: 100%;
  padding: 0.5rem 2rem 0.5rem 2.25rem;
  border-radius: var(--radius-full);
  border: 1px solid var(--color-cream-border);
  background: var(--color-cream-surface);
  font-size: 0.85rem;
}

.clear-search {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: var(--color-text-muted);
  cursor: pointer;
}

.filter-tabs {
  display: flex;
  gap: 0.5rem;
  overflow-x: auto;
  padding-bottom: 0.25rem;
  border-bottom: 1px solid var(--color-cream-border);
}

.tab-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.45rem 0.85rem;
  border-radius: var(--radius-md);
  border: 1px solid transparent;
  background: none;
  font-size: 0.825rem;
  font-weight: 700;
  color: var(--color-text-muted);
  cursor: pointer;
  transition: all 0.2s ease;
}

.tab-btn:hover {
  background: var(--color-cream-surface);
  color: var(--color-jade-deep);
}

.tab-btn.active {
  background: var(--color-jade-light);
  color: var(--color-jade-deep);
  border-color: var(--color-jade-border);
}

.tab-count {
  font-size: 0.75rem;
  font-weight: 800;
  padding: 0.1rem 0.45rem;
  border-radius: var(--radius-full);
  background: var(--color-cream-border);
  color: var(--color-text-main);
}

.tab-count.eligible { background: #E6F7F0; color: #0E7B4E; }
.tab-count.rejected { background: #FDE8E8; color: #9B1C1C; }
.tab-count.approved { background: #E6F4F1; color: #0F5257; }
.tab-count.disapproved { background: #F3F4F6; color: #374151; }

.table-responsive {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
}

.data-table th {
  background: var(--color-jade-deep);
  color: var(--color-cream-bg);
  font-weight: 700;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 0.75rem 1rem;
  text-align: left;
}

.data-table th.text-right {
  text-align: right;
}

.data-table td {
  padding: 0.85rem 1rem;
  border-bottom: 1px solid var(--color-cream-border);
  font-size: 0.875rem;
  vertical-align: middle;
}

.clickable-row {
  cursor: pointer;
  transition: background 0.15s ease;
}

.clickable-row:hover {
  background: rgba(5, 150, 105, 0.04);
}

.row-rejected {
  background: #FFF8F8;
}

.row-approved {
  background: #F0FAF6;
}

.row-overridden {
  background: #FFFDF0;
}

.col-index {
  font-weight: 800;
  color: var(--color-text-muted);
  width: 40px;
}

.telegram-info {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-weight: 700;
  color: var(--color-jade-deep);
}

.tg-icon {
  color: #0088CC;
}

.timestamp-sub {
  font-size: 0.725rem;
  color: var(--color-text-muted);
  display: block;
}

.handles-row {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
}

.compact-handle-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.2rem 0.55rem;
  border-radius: var(--radius-sm);
  text-decoration: none;
  transition: opacity 0.2s ease;
}

.compact-handle-pill:hover {
  opacity: 0.85;
}

.compact-handle-pill.chesscom {
  background: #EBF5FF;
  color: #1E40AF;
}

.compact-handle-pill.lichess {
  background: #F3F4F6;
  color: #111827;
}

.no-handle-badge {
  font-size: 0.725rem;
  color: var(--color-text-muted);
  font-style: italic;
}

.verdict-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.75rem;
  font-weight: 800;
  padding: 0.25rem 0.6rem;
  border-radius: var(--radius-full);
}

.verdict-badge.eligible {
  background: #E6F7F0;
  color: #0E7B4E;
}

.verdict-badge.rejected {
  background: #FDE8E8;
  color: #9B1C1C;
}

.status-cell-wrap {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.status-pill-badge {
  font-size: 0.725rem;
  font-weight: 800;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  text-transform: uppercase;
}

.status-pill-badge.approved { background: #0E7B4E; color: white; }
.status-pill-badge.disapproved { background: #9B1C1C; color: white; }
.status-pill-badge.pending { background: #D97706; color: white; }

.override-toggle-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.7rem;
  font-weight: 800;
  padding: 0.2rem 0.5rem;
  border-radius: var(--radius-full);
  border: 1px solid var(--color-cream-border);
  background: white;
  color: var(--color-text-muted);
  cursor: pointer;
  transition: all 0.2s ease;
}

.override-toggle-btn:hover {
  background: #FEF3D6;
  color: #B45309;
}

.override-toggle-btn.active {
  background: #F59E0B;
  color: white;
  border-color: #D97706;
}

.action-buttons-wrap {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.4rem;
}

.btn-detail {
  font-size: 0.75rem;
  padding: 0.35rem 0.65rem;
}

.btn-telegram {
  background: #0088CC;
  color: white;
  border: none;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.35rem 0.65rem;
  border-radius: var(--radius-sm);
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  cursor: pointer;
}

.btn-telegram:hover {
  background: #006699;
}

.btn-telegram.approved {
  background: var(--color-jade-deep);
}

/* Detail Popup Modal */
.detail-modal {
  max-width: 620px;
  width: 90%;
}

.verdict-banner {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border-radius: var(--radius-md);
  margin-bottom: 1rem;
}

.verdict-banner.eligible {
  background: #E6F7F0;
  color: #0E7B4E;
  border: 1px solid #A2E2C7;
}

.verdict-banner.rejected {
  background: #FDE8E8;
  color: #9B1C1C;
  border: 1px solid #F8B4B4;
}

.banner-title {
  font-size: 1.05rem;
  font-weight: 800;
}

.override-tag {
  font-size: 0.75rem;
  background: #F59E0B;
  color: white;
  padding: 0.15rem 0.45rem;
  border-radius: 4px;
  margin-left: 0.5rem;
}

.banner-sub {
  font-size: 0.825rem;
  opacity: 0.9;
  margin-top: 0.2rem;
}

.rejection-box {
  background: #FFF5F5;
  border: 1px solid #FED7D7;
  padding: 0.85rem;
  border-radius: var(--radius-md);
  margin-bottom: 1rem;
}

.box-heading {
  font-size: 0.85rem;
  font-weight: 800;
  color: #C53030;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-bottom: 0.4rem;
}

.rejection-list {
  padding-left: 1.25rem;
  font-size: 0.8rem;
  color: #9B1C1C;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.platform-stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.85rem;
  margin-bottom: 1rem;
}

.platform-card {
  background: var(--color-cream-surface);
  border: 1px solid var(--color-cream-border);
  border-radius: var(--radius-md);
  padding: 0.85rem;
}

.card-header-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.85rem;
  font-weight: 800;
  margin-bottom: 0.65rem;
  padding-bottom: 0.4rem;
  border-bottom: 1px solid var(--color-cream-border);
}

.ext-link {
  font-size: 0.75rem;
  color: var(--color-jade-deep);
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.4rem;
  text-align: center;
}

.stat-cell {
  display: flex;
  flex-direction: column;
}

.stat-lbl {
  font-size: 0.675rem;
  color: var(--color-text-muted);
  text-transform: uppercase;
}

.stat-val {
  font-size: 0.95rem;
  font-weight: 800;
  color: var(--color-jade-deep);
}

.stat-val.highlight {
  color: var(--color-terracotta);
}

.no-data-msg {
  font-size: 0.8rem;
  color: var(--color-text-muted);
  font-style: italic;
  padding: 0.5rem 0;
}

.override-control-panel {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  background: #FFFEEA;
  border: 1px solid #FCE969;
  padding: 0.85rem;
  border-radius: var(--radius-md);
}

.panel-heading {
  font-size: 0.85rem;
  font-weight: 800;
  color: #B45309;
}

.panel-desc {
  font-size: 0.75rem;
  color: #78350F;
}

.override-action-btn {
  font-size: 0.8rem;
  font-weight: 800;
  padding: 0.45rem 0.85rem;
  border-radius: var(--radius-md);
  border: 1px solid #D97706;
  background: white;
  color: #B45309;
  cursor: pointer;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}

.override-action-btn.active {
  background: #F59E0B;
  color: white;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.65rem;
  margin-top: 1.25rem;
  padding-top: 0.85rem;
  border-top: 1px solid var(--color-cream-border);
}
</style>
