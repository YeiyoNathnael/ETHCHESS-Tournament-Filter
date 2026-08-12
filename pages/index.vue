<template>
  <div class="dashboard-page">
    <!-- Hero / Welcome Header -->
    <div class="dashboard-header card">
      <div class="header-text-group">
        <div class="badge-hero">
          <Trophy :size="14" /> ETHCHESS Tournament Portal
        </div>
        <h1 class="page-title">Organizer Control Center</h1>
        <p class="page-description">
          Screen registrant profiles, automate Chess.com & Lichess qualification checks, and manage official ETHCHESS tournament rosters.
        </p>
      </div>

      <div class="header-action">
        <button class="btn btn-secondary btn-create" @click="isCreateModalOpen = true">
          <Plus :size="18" />
          <span>+ Create Tournament</span>
        </button>
      </div>
    </div>

    <!-- Stats Overview Cards -->
    <div class="stats-overview-grid">
      <div class="stat-card card">
        <div class="stat-icon-wrap primary">
          <Trophy :size="24" />
        </div>
        <div class="stat-info">
          <span class="stat-num">{{ tournaments.length }}</span>
          <span class="stat-name">Total Tournaments</span>
        </div>
      </div>

      <div class="stat-card card">
        <div class="stat-icon-wrap info">
          <Users :size="24" />
        </div>
        <div class="stat-info">
          <span class="stat-num">{{ totalParticipants }}</span>
          <span class="stat-name">Total Registrants</span>
        </div>
      </div>

      <div class="stat-card card">
        <div class="stat-icon-wrap success">
          <CheckCircle2 :size="24" />
        </div>
        <div class="stat-info">
          <span class="stat-num">{{ totalApproved }}</span>
          <span class="stat-name">Approved Roster</span>
        </div>
      </div>

      <div class="stat-card card">
        <div class="stat-icon-wrap bright">
          <ShieldCheck :size="24" />
        </div>
        <div class="stat-info">
          <span class="stat-num">{{ totalEligible }}</span>
          <span class="stat-name">Eligible Candidates</span>
        </div>
      </div>
    </div>

    <!-- Active Tournaments List Section -->
    <div class="section-container">
      <div class="section-bar">
        <div>
          <h2 class="section-title">ETHCHESS Club Tournaments</h2>
          <p class="section-sub">Select an event to upload CSV responses or review candidate eligibility.</p>
        </div>

        <div class="filter-pills">
          <button
            class="pill-btn"
            :class="{ active: filterTab === 'all' }"
            @click="filterTab = 'all'"
          >
            All Events ({{ tournaments.length }})
          </button>
          <button
            class="pill-btn"
            :class="{ active: filterTab === 'upcoming' }"
            @click="filterTab = 'upcoming'"
          >
            Upcoming / Active
          </button>
          <button
            class="pill-btn"
            :class="{ active: filterTab === 'completed' }"
            @click="filterTab = 'completed'"
          >
            Completed
          </button>
        </div>
      </div>

      <div class="tournaments-grid">
        <TournamentCard
          v-for="tourney in filteredTournaments"
          :key="tourney.id"
          :tournament="tourney"
        />
      </div>
    </div>

    <!-- Create Tournament Modal -->
    <CreateTournamentModal
      :is-open="isCreateModalOpen"
      @close="isCreateModalOpen = false"
      @created="handleTournamentCreated"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useTournaments } from '~/composables/useTournaments';
import TournamentCard from '~/components/TournamentCard.vue';
import CreateTournamentModal from '~/components/CreateTournamentModal.vue';
import { Trophy, Plus, Users, CheckCircle2, ShieldCheck } from 'lucide-vue-next';

const router = useRouter();
const { tournaments, getParticipants } = useTournaments();

const isCreateModalOpen = ref(false);
const filterTab = ref<'all' | 'upcoming' | 'completed'>('all');

const filteredTournaments = computed(() => {
  if (filterTab.value === 'upcoming') {
    return tournaments.value.filter((t) => t.status === 'UPCOMING' || t.status === 'ONGOING');
  }
  if (filterTab.value === 'completed') {
    return tournaments.value.filter((t) => t.status === 'COMPLETED');
  }
  return tournaments.value;
});

const totalParticipants = computed(() => {
  let count = 0;
  tournaments.value.forEach((t) => {
    count += getParticipants(t.id).length;
  });
  return count;
});

const totalApproved = computed(() => {
  let count = 0;
  tournaments.value.forEach((t) => {
    count += getParticipants(t.id).filter((p) => p.status === 'APPROVED').length;
  });
  return count;
});

const totalEligible = computed(() => {
  let count = 0;
  tournaments.value.forEach((t) => {
    count += getParticipants(t.id).filter((p) => p.verdict === 'ELIGIBLE').length;
  });
  return count;
});

function handleTournamentCreated(id: string) {
  router.push(`/admin/tournaments/${id}`);
}
</script>

<style scoped>
.dashboard-page {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.dashboard-header {
  background: linear-gradient(135deg, var(--color-jade-deep) 0%, var(--color-jade-dark) 100%);
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1.5rem;
  padding: 2rem;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
}

.badge-hero {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  background: rgba(255, 255, 255, 0.12);
  color: var(--color-cream-accent);
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.25rem 0.75rem;
  border-radius: var(--radius-full);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.5rem;
}

.page-title {
  font-size: 1.8rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: white;
  line-height: 1.2;
}

.page-description {
  font-size: 0.95rem;
  color: var(--color-jade-light);
  max-width: 650px;
  margin-top: 0.4rem;
}

.btn-create {
  background: var(--color-terracotta);
  font-size: 1rem;
  padding: 0.75rem 1.5rem;
  box-shadow: 0 4px 14px rgba(217, 107, 67, 0.35);
}

.btn-create:hover {
  background: var(--color-terracotta-dark);
}

.stats-overview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem;
}

.stat-icon-wrap {
  width: 52px;
  height: 52px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-icon-wrap.primary {
  background: var(--color-jade-light);
  color: var(--color-jade-deep);
}

.stat-icon-wrap.info {
  background: #EFF6FF;
  color: #2563EB;
}

.stat-icon-wrap.success {
  background: var(--color-terracotta-light);
  color: var(--color-terracotta);
}

.stat-icon-wrap.bright {
  background: var(--color-success-bg);
  color: var(--color-success-text);
}

.stat-info {
  display: flex;
  flex-direction: column;
}

.stat-num {
  font-size: 1.6rem;
  font-weight: 800;
  color: var(--color-jade-deep);
  line-height: 1.1;
}

.stat-name {
  font-size: 0.8rem;
  color: var(--color-text-muted);
  font-weight: 600;
  margin-top: 0.15rem;
}

.section-bar {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 1.25rem;
}

.section-title {
  font-size: 1.35rem;
  font-weight: 800;
  color: var(--color-jade-deep);
}

.section-sub {
  font-size: 0.85rem;
  color: var(--color-text-muted);
}

.filter-pills {
  display: flex;
  gap: 0.35rem;
  background: var(--color-cream-border);
  padding: 0.25rem;
  border-radius: var(--radius-sm);
}

.pill-btn {
  padding: 0.4rem 0.85rem;
  border-radius: 4px;
  border: none;
  background: transparent;
  font-family: var(--font-family-base);
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--color-text-muted);
  cursor: pointer;
  transition: all 0.2s ease;
}

.pill-btn.active {
  background: white;
  color: var(--color-jade-deep);
  box-shadow: var(--shadow-sm);
}

.tournaments-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 1.5rem;
}
</style>
