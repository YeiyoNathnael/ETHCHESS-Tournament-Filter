<template>
  <div class="public-layout">
    <main class="public-content">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
</script>

<style scoped>
.public-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--color-cream-bg, #FAFAF5);
}
.public-content {
  flex: 1;
}
</style>
