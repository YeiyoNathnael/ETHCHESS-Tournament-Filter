<template>
  <header class="navbar">
    <div class="navbar-content">
      <NuxtLink to="/" class="brand-logo">
        <div class="logo-icon-wrap">
          <img src="/ETHCHESS_logo.png" alt="ETHCHESS Logo" width="28" height="28" style="object-fit: contain;" />
        </div>
        <div class="brand-title-wrap">
          <span class="brand-name">ETHCHESS</span>
          <span class="brand-subtitle">Participant Filter</span>
        </div>
        <span class="brand-badge">Official</span>
      </NuxtLink>

      <nav class="nav-links">
        <NuxtLink to="/" class="nav-btn" exact-active-class="active">
          <LayoutDashboard :size="18" />
          <span>Organizer Dashboard</span>
        </NuxtLink>

        <NuxtLink to="/tournaments/ethchess-u1500-2026" class="nav-btn" active-class="active">
          <Globe :size="18" />
          <span>Public Roster View</span>
        </NuxtLink>
      </nav>
    </div>
  </header>
</template>

<script setup lang="ts">
import { Trophy, LayoutDashboard, Globe } from 'lucide-vue-next';
</script>

<style scoped>
.logo-icon-wrap {
  background: var(--color-terracotta);
  color: white;
  width: 36px;
  height: 36px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 6px rgba(217, 107, 67, 0.4);
}

.brand-title-wrap {
  display: flex;
  flex-direction: column;
  line-height: 1.1;
}

.brand-name {
  font-weight: 800;
  font-size: 1.15rem;
  letter-spacing: 0.02em;
  color: var(--color-cream-accent);
}

.brand-subtitle {
  font-size: 0.72rem;
  font-weight: 500;
  color: var(--color-jade-border);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
</style>
