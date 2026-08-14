<template>
  <div class="redirect-wrapper">
    <div class="spinner-box">
      <div class="spinner"></div>
      <p>Redirecting to official public roster...</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router';
import { onMounted } from 'vue';

definePageMeta({
  layout: false,
});

const route = useRoute();

onMounted(() => {
  const id = route.params.id;
  if (id) {
    navigateTo(`/t/${id}`, { replace: true });
  }
});
</script>

<style scoped>
.redirect-wrapper {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #FAFAF5;
  font-family: 'Space Grotesk', sans-serif;
}

.spinner-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  color: #0F5257;
  font-weight: 600;
}

.spinner {
  width: 36px;
  height: 36px;
  border: 3px solid rgba(15, 82, 87, 0.15);
  border-top-color: #00A86B;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
