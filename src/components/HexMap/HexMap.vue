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
            @click="handleHexClick(colIndex, rowIndex)"
            :style="getHexStyle()"
        >
          <template v-for="(entity, index) in entitiesData">
            <Player
                v-if="entity.type === 'player' && entity.col === colIndex && entity.row === rowIndex"
                :key="index"
                :color="entity.color"
            />
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import {
  cols,
  getColumnStyle,
  getRowsForColumn,
  getHexStyle, handleHexClick,
} from "./utils/HexUtils";
import Player from "../Player/Player.vue";
import { entities, type Entity } from "@/data/entities";

const entitiesData = ref<Entity[]>(entities);

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
</style>
