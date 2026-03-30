<template>
  <div class="container">
    <div class="player" :class="{ active }" :style="{ backgroundColor: color }"></div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  color: string;
  active?: boolean;
}>();
</script>

<style scoped>
.container {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  width: 100%;
  height: 100%;
  padding-top: 4px;
}

.player {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  transition: transform 0.16s ease, box-shadow 0.16s ease, border 0.16s ease;
}

.player.active {
  transform: scale(1.08);
  border: 2px solid rgba(255, 244, 214, 0.9);
  box-shadow:
    0 0 0 3px rgba(255, 215, 130, 0.35),
    0 8px 18px rgba(0, 0, 0, 0.32);
}
</style>
