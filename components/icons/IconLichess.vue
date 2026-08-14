<template>
  <img
    src="/Lichess_logo_2019.png"
    alt="Lichess"
    :width="size"
    :height="size"
    class="brand-icon-img icon-lichess"
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
