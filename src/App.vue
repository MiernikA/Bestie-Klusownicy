<template>
  <div class="app-shell">
    <div class="app-backdrop app-backdrop-left"></div>
    <div class="app-backdrop app-backdrop-right"></div>
    <main class="app-layout">
      <section class="board-shell">
        <HexMap />
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import HexMap from './components/HexMap/HexMap.vue'
</script>

<style>
.app-shell {
  position: relative;
  min-height: 100vh;
  overflow: hidden;
  background:
    radial-gradient(circle at top left, rgba(204, 136, 58, 0.18), transparent 28%),
    radial-gradient(circle at bottom right, rgba(74, 132, 91, 0.22), transparent 24%),
    linear-gradient(160deg, #120f0d 0%, #191612 48%, #0e1716 100%);
  color: #f5efe5;
}

.app-layout {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: stretch;
  justify-content: stretch;
  min-height: 100vh;
  padding: 10px 12px;
}

.board-shell {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  min-height: calc(100vh - 20px);
}

.app-backdrop {
  position: absolute;
  width: 420px;
  height: 420px;
  border-radius: 50%;
  filter: blur(90px);
  opacity: 0.45;
  pointer-events: none;
}

.app-backdrop-left {
  top: -120px;
  left: -80px;
  background: rgba(171, 104, 43, 0.38);
}

.app-backdrop-right {
  right: -120px;
  bottom: -140px;
  background: rgba(58, 130, 109, 0.28);
}

@media (max-width: 1280px) {
  .app-layout {
    padding-inline: 12px;
  }

  .board-shell {
    min-height: calc(100vh - 20px);
  }
}
</style>
