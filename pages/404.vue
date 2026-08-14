<template>
  <div class="not-found-page">
    <div class="not-found-card">
      <h1 class="error-code">404</h1>
      <h2 class="error-title">Page Not Found</h2>
      <p class="error-desc">The page you are looking for does not exist or has been moved.</p>
      <NuxtLink to="/t/6" class="btn btn-primary">
        <Globe :size="16" />
        <span>View Public Roster</span>
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Globe } from 'lucide-vue-next';

definePageMeta({
  layout: 'public',
});
</script>

<style scoped>
.not-found-page {
  min-height: 75vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
}

.not-found-card {
  text-align: center;
  background: #ffffff;
  border: 1px solid rgba(15, 82, 87, 0.15);
  border-radius: 16px;
  padding: 3rem 2rem;
  max-width: 440px;
  width: 100%;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.04);
}

.error-code {
  font-size: 4rem;
  font-weight: 800;
  color: var(--color-jade-deep, #0F5257);
  line-height: 1;
  margin-bottom: 0.5rem;
}

.error-title {
  font-size: 1.3rem;
  font-weight: 700;
  color: #333;
  margin-bottom: 0.5rem;
}

.error-desc {
  font-size: 0.88rem;
  color: #666;
  margin-bottom: 1.8rem;
  line-height: 1.4;
}

.btn-primary {
  background: var(--color-jade-deep, #0F5257);
  color: #ffffff;
  border: none;
  padding: 0.7rem 1.4rem;
  border-radius: 8px;
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 700;
  font-size: 0.88rem;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s ease;
}

.btn-primary:hover {
  background: var(--color-jade-primary, #00A86B);
}
</style>
