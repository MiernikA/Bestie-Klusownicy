<template>
  <div class="obstacle"></div>
</template>

<script setup lang="ts"></script>

<style scoped>
.obstacle {
  position: absolute;
  inset: 0;
  background-color: rgba(100, 0, 0, 0.6);
  clip-path: inherit;
  pointer-events: none;
}
</style>
