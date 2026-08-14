<template>
  <img
    src="/chess.com.png"
    alt="Chess.com"
    :width="size"
    :height="size"
    class="brand-icon-img icon-chesscom"
  />
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    size?: number | string;
  }>(),
  {
    size: 16,
  }
);
</script>

<style scoped>
.brand-icon-img {
  display: inline-block;
  vertical-align: middle;
  object-fit: contain;
  flex-shrink: 0;
}
</style>
