<template>
  <div class="map-background">
    <div class="map-container">
      <div
          v-for="(col, colIndex) in cols"
          :key="colIndex"
          class="hex-column"
          :style="getColumnStyle(colIndex)"
      >
        <div
            v-for="rowIndex in getRowsForColumn(colIndex)"
            :key="rowIndex"
            class="hex"
            :style="getHexBaseStyle()"
            @click="onHexClick(colIndex, rowIndex)"
            @mouseenter="onHexHover(colIndex, rowIndex)"
        >
          <div v-if="isReachable(colIndex, rowIndex)" class="hex-highlight" />
          <div v-if="isPath(colIndex, rowIndex)" class="hex-path" />
          <template v-for="(entity, index) in entitiesData" :key="index">
            <Player
                v-if="entity.type === 'player' && entity.col === colIndex && entity.row === rowIndex"
                :color="entity.color"
                @click.stop="selectPlayer(entity)"
            />
            <Obstacle
                v-else-if="entity.type === 'obstacle' && entity.col === colIndex && entity.row === rowIndex"
            />
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Player from "../Entities/Player.vue";
import Obstacle from "../Entities/Obstacle.vue";
import {
  cols,
  getColumnStyle,
  getRowsForColumn,
  getHexBaseStyle,
} from "./utils/HexUtils";
import { useHexMap } from "./hooks/useHexMap";

const {
  entitiesData,
  isReachable,
  isPath,
  selectPlayer,
  onHexClick,
  onHexHover,
} = useHexMap();
</script>

<style scoped>
.map-background {
  position: fixed;
  left: 0;
  top: 0;
  width: 1200px;
  height: 900px;
  background-image: url("@/assets/map-background.png");
  background-size: cover;
  overflow: hidden;
}

.map-container {
  display: flex;
  align-items: flex-start;
  padding: 2.5px 13.3px;
  width: 1200px;
  height: 900px;
}

.hex-column {
  display: flex;
  flex-direction: column;
}

.hex {
  position: relative;
  clip-path: polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%);
  cursor: pointer;
}

.hex-highlight,
.hex-path {
  position: absolute;
  inset: 0;
  clip-path: inherit;
  pointer-events: none;
}

.hex-highlight {
  background-color: rgba(0, 255, 0, 0.25);
}

.hex-path {
  background-color: rgba(255, 0, 255, 0.35);
  outline: 2px solid rgba(255, 0, 255, 0.6);
  outline-offset: -2px;
}
</style>
