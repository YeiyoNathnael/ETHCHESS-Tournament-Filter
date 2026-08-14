<template>
  <div class="app-root">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <ToastNotification />
  </div>
</template>

<script setup lang="ts">
import ToastNotification from '~/components/ToastNotification.vue';
</script>

<style>
/* Global Layout Base */
.app-root {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
</style>
