<template>
  <div class="container">
    <div class="player" :style="{ backgroundColor: color }"></div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ color: string }>();
</script>

<style scoped>
.container {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
}

.player {
  width: 30px;
  height: 30px;
  border-radius: 50%;
}
</style>
