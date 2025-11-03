<template>
  <div id="app">
    <HexMap/>
  </div>
</template>

<script setup lang="ts">
import HexMap from './components/HexMap/HexMap.vue'
</script>

<style>
body {
  margin: 0;
  background-color: #1a1a1a;
  color: white;
  font-family: sans-serif;
}

#app {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
}
</style>
