<template>
  <div class="container">
    <div class="monster" :style="{ backgroundColor: color }">
      <span class="label">{{ label }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  color: string;
  label: string;
}>();
</script>

<style scoped>
.container {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
}

.monster {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 26px;
  height: 26px;
  border-radius: 35% 35% 45% 45%;
  border: 2px solid rgba(0, 0, 0, 0.45);
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.15);
}

.label {
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.75);
}
</style>
