<template>
  <header class="public-navbar">
    <div class="nav-container">
      <!-- Brand Logo Inspired by Image 2 -->
      <div class="brand-wrap">
        <a href="#top" class="brand-link">
          <div class="chess-knight-icon">
            <img src="/ETHCHESS_logo.png" alt="ETHCHESS Logo" width="28" height="28" style="object-fit: contain;" />
          </div>

          <div class="brand-titles-column">
            <div class="title-row">
              <span class="brand-name">ETHCHESS™</span>
              <span class="league-badge">ROSTER</span>
            </div>
            <span class="brand-sub">OFFICIAL COMPETITOR FILTER</span>
          </div>
        </a>
      </div>

      <!-- Right Navigation Actions Inspired by Image 2 (NO ADMIN BACKLINK) -->
      <nav class="nav-links">
        <a href="#roster" class="nav-tab active">OVERALL</a>
        <a href="#rules" class="nav-tab">RULES</a>
        <button class="nav-tab appeal-tab" @click="$emit('open-claim')">
          <AlertCircle :size="13" />
          <span>MISSING HANDLE?</span>
        </button>
      </nav>
    </div>
  </header>
</template>

<script setup lang="ts">
import { AlertCircle } from 'lucide-vue-next';

const props = defineProps<{
  tournamentId?: string | number;
}>();

defineEmits<{
  (e: 'open-claim'): void;
}>();
</script>

<style scoped>
.public-navbar {
  position: sticky;
  top: 0;
  z-index: 100;
  background: #ffffff;
  border-bottom: 1px solid rgba(15, 82, 87, 0.12);
  padding: 0.85rem 1.5rem;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.03);
  font-family: 'Space Grotesk', sans-serif;
}

.nav-container {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.brand-wrap {
  display: flex;
  align-items: center;
}

.brand-link {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  text-decoration: none;
}

.chess-knight-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.brand-titles-column {
  display: flex;
  flex-direction: column;
}

.title-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.brand-name {
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 800;
  font-size: 1.15rem;
  letter-spacing: -0.01em;
  color: #111;
  line-height: 1;
}

.league-badge {
  background: #00A86B;
  color: #fff;
  font-size: 0.65rem;
  font-weight: 800;
  padding: 2px 6px;
  border-radius: 4px;
  letter-spacing: 0.05em;
}

.brand-sub {
  font-size: 0.65rem;
  font-weight: 700;
  color: #888;
  letter-spacing: 0.08em;
  margin-top: 2px;
}

/* Nav Links Inspired by Image 2 */
.nav-links {
  display: flex;
  align-items: center;
  gap: 1.25rem;
}

.nav-tab {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: #555;
  text-decoration: none;
  background: none;
  border: none;
  padding: 4px 0;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transition: color 0.2s ease;
  position: relative;
}

.nav-tab:hover, .nav-tab.active {
  color: #00A86B;
}

.nav-tab.active::after {
  content: '';
  position: absolute;
  bottom: -4px;
  left: 0;
  right: 0;
  height: 2px;
  background: #00A86B;
  border-radius: 2px;
}

.appeal-tab {
  color: var(--color-terracotta, #D96B43);
}

.appeal-tab:hover {
  color: #b84f2b;
}

.admin-login-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: 1px solid #e0e0e0;
  background: #fff;
  color: #444;
  font-family: 'Space Grotesk', sans-serif;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 5px 10px;
  border-radius: 6px;
  text-decoration: none;
  transition: all 0.2s ease;
}

.admin-login-btn:hover {
  border-color: #111;
  color: #111;
  background: #f8f8f8;
}

@media (max-width: 640px) {
  .brand-sub {
    display: none;
  }
  .nav-links {
    gap: 0.75rem;
  }
  .nav-tab span {
    display: none;
  }
}
</style>
