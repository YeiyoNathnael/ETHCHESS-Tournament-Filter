<template>
  <div class="app-root">
    <Navbar />
    <main class="app-container">
      <NuxtPage />
    </main>
    <ToastNotification />
  </div>
</template>

<script setup lang="ts">
import Navbar from '~/components/Navbar.vue';
import ToastNotification from '~/components/ToastNotification.vue';
</script>

<style>
/* Global Layout Styling */
.app-root {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
</style>
