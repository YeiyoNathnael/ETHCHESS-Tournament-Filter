<template>
  <div class="tournament-card card">
    <div class="banner-container">
      <img :src="tournament.coverImage" :alt="tournament.title" class="banner-img" />
      <span class="time-control-badge" :class="tournament.timeControl.toLowerCase()">
        <Zap v-if="tournament.timeControl === 'Blitz'" :size="14" />
        <Clock v-else-if="tournament.timeControl === 'Rapid'" :size="14" />
        <Flame v-else :size="14" />
        {{ tournament.timeControl }}
      </span>
      <span class="status-pill" :class="tournament.status.toLowerCase()">
        {{ tournament.status }}
      </span>

      <!-- Delete Button Overlay -->
      <button class="delete-icon-btn" title="Delete Tournament Event" @click="confirmDelete">
        <Trash2 :size="16" />
      </button>
    </div>

    <div class="card-body">
      <h3 class="card-title">{{ tournament.title }}</h3>
      <p class="description">{{ tournament.description }}</p>

      <div class="event-meta">
        <div class="meta-item">
          <Calendar :size="16" class="meta-icon" />
          <span>{{ formatDate(tournament.date) }}</span>
        </div>
        <div class="meta-item">
          <MapPin :size="16" class="meta-icon" />
          <span>{{ tournament.location }}</span>
        </div>
      </div>

      <div class="rules-summary">
        <div class="rules-header">
          <Sliders :size="14" />
          <span>Platform Criteria</span>
        </div>
        <div class="rules-tags">
          <span class="rule-tag chesscom">
            C.com ≤ {{ chessComMax }} ELO (Peak {{ chessComPeak }})
          </span>
          <span class="rule-tag lichess">
            Lichess ≤ {{ lichessMax }} ELO (Peak {{ lichessPeak }})
          </span>
        </div>
      </div>

      <div class="card-stats">
        <div class="stat-pill">
          <Users :size="16" class="stat-icon" />
          <span class="stat-value">{{ registeredCount }}</span>
          <span class="stat-label">Registered</span>
        </div>
        <div class="stat-pill approved">
          <CheckCircle2 :size="16" class="stat-icon" />
          <span class="stat-value">{{ approvedCount }}</span>
          <span class="stat-label">Approved</span>
        </div>
        <div class="stat-pill eligible">
          <ShieldCheck :size="16" class="stat-icon" />
          <span class="stat-value">{{ eligibleCount }}</span>
          <span class="stat-label">Eligible</span>
        </div>
      </div>

      <div class="card-actions">
        <NuxtLink :to="`/admin/tournaments/${tournament.id}`" class="btn btn-primary btn-flex">
          <SlidersHorizontal :size="16" />
          <span>Manage & Filter</span>
        </NuxtLink>
        <NuxtLink :to="`/t/${tournament.id}`" target="_blank" class="btn btn-outline btn-flex">
          <ExternalLink :size="16" />
          <span>Public Roster</span>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Tournament } from '~/types/tournament';
import { useTournaments } from '~/composables/useTournaments';
import { useToast } from '~/composables/useToast';
import {
  Calendar,
  MapPin,
  Clock,
  Zap,
  Flame,
  Users,
  CheckCircle2,
  ShieldCheck,
  SlidersHorizontal,
  ExternalLink,
  Sliders,
  Trash2,
} from 'lucide-vue-next';

const props = defineProps<{
  tournament: Tournament;
}>();

const { getParticipants, deleteTournament } = useTournaments();
const { addToast } = useToast();

const participants = computed(() => getParticipants(props.tournament.id));

const registeredCount = computed(() => participants.value.length);
const approvedCount = computed(() => participants.value.filter((p) => p.status === 'APPROVED').length);
const eligibleCount = computed(() => participants.value.filter((p) => p.verdict === 'ELIGIBLE').length);

const chessComMax = computed(() => props.tournament.rules.chessCom?.maxRating ?? props.tournament.rules.chessComMaxRating ?? 1500);
const chessComPeak = computed(() => props.tournament.rules.chessCom?.maxPeakRating ?? props.tournament.rules.chessComMaxPeak ?? 1600);
const lichessMax = computed(() => props.tournament.rules.lichess?.maxRating ?? props.tournament.rules.lichessMaxRating ?? 1500);
const lichessPeak = computed(() => props.tournament.rules.lichess?.maxPeakRating ?? props.tournament.rules.lichessMaxPeak ?? 1600);

async function confirmDelete() {
  if (confirm(`Are you sure you want to delete "${props.tournament.title}"? This cannot be undone.`)) {
    await deleteTournament(props.tournament.id);
    addToast('Event Deleted', `Successfully deleted "${props.tournament.title}".`, 'info');
  }
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
.tournament-card {
  display: flex;
  flex-direction: column;
  padding: 0;
  overflow: hidden;
  position: relative;
  transition: transform 0.25 ease, box-shadow 0.25s ease;
}

.tournament-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
}

.banner-container {
  position: relative;
  height: 160px;
  width: 100%;
}

.banner-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.time-control-badge {
  position: absolute;
  top: 0.75rem;
  left: 0.75rem;
  background: var(--color-terracotta);
  color: white;
  font-weight: 800;
  font-size: 0.75rem;
  padding: 0.25rem 0.65rem;
  border-radius: var(--radius-full);
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  box-shadow: var(--shadow-sm);
}

.status-pill {
  position: absolute;
  top: 0.75rem;
  right: 3rem;
  background: rgba(13, 92, 77, 0.85);
  backdrop-filter: blur(4px);
  color: var(--color-cream-accent);
  font-weight: 700;
  font-size: 0.7rem;
  padding: 0.2rem 0.55rem;
  border-radius: var(--radius-full);
  text-transform: uppercase;
}

.delete-icon-btn {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  background: rgba(200, 42, 42, 0.85);
  color: white;
  border: none;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.delete-icon-btn:hover {
  background: var(--color-danger-text);
  transform: scale(1.1);
}

.card-body {
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  flex-grow: 1;
}

.card-title {
  font-size: 1.15rem;
  font-weight: 800;
  color: var(--color-jade-deep);
  line-height: 1.3;
}

.description {
  font-size: 0.85rem;
  color: var(--color-text-muted);
  line-clamp: 2;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.event-meta {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.meta-icon {
  color: var(--color-jade-primary);
}

.rules-summary {
  background: var(--color-cream-bg);
  padding: 0.75rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-cream-border);
}

.rules-header {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--color-jade-deep);
  display: flex;
  align-items: center;
  gap: 0.35rem;
  margin-bottom: 0.4rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.rules-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.rule-tag {
  font-size: 0.725rem;
  font-weight: 700;
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
}

.rule-tag.chesscom {
  background: #EBF5FF;
  color: #1E40AF;
}

.rule-tag.lichess {
  background: #F3F4F6;
  color: #111827;
}

.card-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
  background: var(--color-cream-surface);
  padding: 0.6rem;
  border-radius: var(--radius-sm);
}

.stat-pill {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.stat-value {
  font-size: 1.1rem;
  font-weight: 800;
  color: var(--color-jade-deep);
}

.stat-label {
  font-size: 0.675rem;
  color: var(--color-text-muted);
  font-weight: 600;
  text-transform: uppercase;
}

.card-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: auto;
}

.btn-flex {
  flex: 1;
  font-size: 0.8rem;
  padding: 0.5rem;
}
</style>
