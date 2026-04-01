<template>
  <div class="hex-map">
    <div class="controls">
      <div class="controls-actions">
        <div class="turn-badge">
          <span
            v-if="currentTurnColor"
            class="turn-badge-swatch"
            :style="{ backgroundColor: currentTurnColor }"
          ></span>
          <span class="turn-badge-text">{{ turnIndicator.title }}</span>
        </div>
        <div class="button-group">
          <button
            :class="['control-button', 'primary', { attention: canTriggerMonsterTurn }]"
            type="button"
            @click="triggerMonsterTurn"
          >
            Monster turn
          </button>
          <button class="control-button accent" type="button" @click="requestResetBoard">
            Reset board
          </button>
          <button
            class="control-button secondary"
            type="button"
            :disabled="!canUndoMove"
            @click="undoLastMove"
          >
            Undo move
          </button>
        </div>
        <div v-if="deadPlayers.length" class="revive-list">
          <button
            v-for="player in deadPlayers"
            :key="player.color"
            class="revive-button"
            type="button"
            @click="revivePlayer(player.color)"
          >
            <span class="revive-swatch" :style="{ backgroundColor: player.color }"></span>
            <span>Revive {{ player.name ?? player.color }}</span>
          </button>
        </div>
        <div class="combat-log">
          <p class="combat-log-title">Game log</p>
          <div ref="combatLogListRef" class="combat-log-list">
            <p v-if="!combatLog.length" class="combat-log-empty">No actions logged yet.</p>
            <p
              v-for="entry in combatLog"
              :key="entry.id"
              :class="['combat-log-entry', `combat-log-entry-${entry.type}`]"
            >
              {{ entry.message }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <div class="map-stage">
      <div class="map-frame" :style="mapStageStyle">
        <div class="map-background" :style="mapScaleStyle">
          <div class="map-container">
            <svg class="movement-overlay" viewBox="0 0 1200 900" preserveAspectRatio="xMinYMin meet">
              <g v-for="move in movementLines" :key="move.key">
                <line
                  class="movement-line-shadow"
                  :x1="move.x1"
                  :y1="move.y1"
                  :x2="move.x2"
                  :y2="move.y2"
                />
                <line
                  class="movement-line"
                  :x1="move.x1"
                  :y1="move.y1"
                  :x2="move.x2"
                  :y2="move.y2"
                  :style="{ stroke: move.color }"
                />
                <polygon
                  class="movement-arrow"
                  :points="move.arrowPoints"
                  :style="{ fill: move.color }"
                />
              </g>
            </svg>
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
                <Player
                  v-if="getEntityAt(colIndex, rowIndex)?.type === 'player'"
                  :color="getEntityAt(colIndex, rowIndex)!.color"
                  :active="isCurrentPlayer(getEntityAt(colIndex, rowIndex)!)"
                  @click.stop="selectPlayer(getEntityAt(colIndex, rowIndex)!)"
                  @contextmenu.stop.prevent="requestKillPlayer(getEntityAt(colIndex, rowIndex)!)"
                />
                <Monster
                  v-else-if="getEntityAt(colIndex, rowIndex)?.type === 'monster'"
                  :color="getEntityAt(colIndex, rowIndex)!.color"
                  :label="getEntityAt(colIndex, rowIndex)!.id"
                  @contextmenu.stop.prevent="requestRemoveMonster(getEntityAt(colIndex, rowIndex)!)"
                />
                <Obstacle v-else-if="getEntityAt(colIndex, rowIndex)?.type === 'obstacle'" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="pendingKillPlayer" class="modal-backdrop" @click="cancelKillPlayer">
      <div class="confirm-modal" @click.stop>
        <p class="confirm-title">Remove player?</p>
        <p class="confirm-copy">
          Are you sure you want to remove
          <strong>{{ pendingKillPlayer.name ?? pendingKillPlayer.color }}</strong>?
        </p>
        <div class="confirm-actions">
          <button class="control-button secondary" type="button" @click="cancelKillPlayer">
            Cancel
          </button>
          <button class="control-button danger" type="button" @click="confirmKillPlayer">
            Remove
          </button>
        </div>
      </div>
    </div>

    <div v-if="pendingRemoveMonster" class="modal-backdrop" @click="cancelRemoveMonster">
      <div class="confirm-modal" @click.stop>
        <p class="confirm-title">Remove monster?</p>
        <p class="confirm-copy">
          Are you sure you want to remove monster <strong>#{{ pendingRemoveMonster.id }}</strong>?
        </p>
        <div class="confirm-actions">
          <button class="control-button secondary" type="button" @click="cancelRemoveMonster">
            Cancel
          </button>
          <button class="control-button danger" type="button" @click="confirmRemoveMonster">
            Remove
          </button>
        </div>
      </div>
    </div>

    <div v-if="pendingResetBoard" class="modal-backdrop" @click="cancelResetBoard">
      <div class="confirm-modal" @click.stop>
        <p class="confirm-title">Reset board?</p>
        <p class="confirm-copy">
          This will reset all player positions, monster positions, and turn progress.
        </p>
        <div class="confirm-actions">
          <button class="control-button secondary" type="button" @click="cancelResetBoard">
            Cancel
          </button>
          <button class="control-button danger" type="button" @click="confirmResetBoard">
            Reset
          </button>
        </div>
      </div>
    </div>

    <div v-if="lastRemovedMonsterInfo" class="modal-backdrop" @click="clearLastRemovedMonsterInfo">
      <div class="confirm-modal" @click.stop>
        <p class="confirm-title">Monster removed</p>
        <p class="confirm-copy">
          Removed monster <strong>#{{ lastRemovedMonsterInfo.id }}</strong>.
        </p>
        <p class="confirm-copy">
          Behaviour: <strong>{{ lastRemovedMonsterInfo.behavior }}</strong>
        </p>
        <div class="confirm-actions">
          <button
            class="control-button primary"
            type="button"
            @click="clearLastRemovedMonsterInfo"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import Player from "../Entities/Player.vue";
import Monster from "../Entities/Monster.vue";
import Obstacle from "../Entities/Obstacle.vue";
import {
  cols,
  hexHeight,
  hexWidth,
  getColumnStyle,
  getRowsForColumn,
  getHexBaseStyle,
} from "./utils/HexUtils";
import { useHexMap } from "./hooks/useHexMap";
import type { MovementRecord } from "@/types/game.types";

const {
  entityByPosition,
  isReachable,
  isPath,
  lastPlayerMove,
  lastMonsterMoves,
  pendingKillPlayer,
  pendingRemoveMonster,
  lastRemovedMonsterInfo,
  deadPlayers,
  combatLog,
  canTriggerMonsterTurn,
  canUndoMove,
  currentTurnColor,
  turnIndicator,
  isCurrentPlayer,
  selectPlayer,
  requestKillPlayer,
  confirmKillPlayer,
  cancelKillPlayer,
  requestRemoveMonster,
  confirmRemoveMonster,
  cancelRemoveMonster,
  clearLastRemovedMonsterInfo,
  revivePlayer,
  resetBoard,
  undoLastMove,
  triggerMonsterTurn,
  onHexClick,
  onHexHover,
} = useHexMap();

const getEntityAt = (col: number, row: number) =>
  entityByPosition.value.get(`${col},${row}`);

const pendingResetBoard = ref(false);
const combatLogListRef = ref<HTMLDivElement | null>(null);

const BASE_MAP_WIDTH = 1200;
const BASE_MAP_HEIGHT = 900;
const CONTROLS_WIDTH = 380;
const MAP_GAP = 18;
const FRAME_PADDING = 10;
const viewportWidth = ref(typeof window === "undefined" ? BASE_MAP_WIDTH : window.innerWidth);
const viewportHeight = ref(typeof window === "undefined" ? BASE_MAP_HEIGHT : window.innerHeight);

const updateViewport = () => {
  viewportWidth.value = window.innerWidth;
  viewportHeight.value = window.innerHeight;
};

const scrollCombatLogToBottom = () => {
  const element = combatLogListRef.value;
  if (!element) return;
  element.scrollTop = element.scrollHeight;
};

onMounted(async () => {
  updateViewport();
  window.addEventListener("resize", updateViewport);
  await nextTick();
  scrollCombatLogToBottom();
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", updateViewport);
});

const mapScale = computed(() => {
  const isStackedLayout = viewportWidth.value <= 1280;
  const horizontalChrome = isStackedLayout ? 32 : CONTROLS_WIDTH + MAP_GAP + 40;
  const verticalChrome = isStackedLayout ? 148 : 24;
  const availableWidth = Math.max(320, viewportWidth.value - horizontalChrome - FRAME_PADDING * 2);
  const availableHeight = Math.max(360, viewportHeight.value - verticalChrome - FRAME_PADDING * 2);

  return Math.min(availableWidth / BASE_MAP_WIDTH, availableHeight / BASE_MAP_HEIGHT);
});

const mapStageStyle = computed(() => ({
  width: `${BASE_MAP_WIDTH * mapScale.value + FRAME_PADDING * 2}px`,
  height: `${BASE_MAP_HEIGHT * mapScale.value + FRAME_PADDING * 2}px`,
}));

const mapScaleStyle = computed(() => ({
  transform: `scale(${mapScale.value})`,
  transformOrigin: "top left",
}));

const mapPaddingX = 13.3;
const mapPaddingY = 2.5;
const columnStep = hexWidth * (1 - 0.2415);

const getHexCenter = (col: number, row: number) => {
  const visualRowIndex = row - 1;

  return {
    x: mapPaddingX + col * columnStep + hexWidth / 2,
    y:
      mapPaddingY +
      visualRowIndex * hexHeight +
      hexHeight / 2 +
      (col % 2 !== 0 ? hexHeight / 2 : 0),
  };
};

const getArrowPoints = (x1: number, y1: number, x2: number, y2: number) => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.hypot(dx, dy);

  if (length === 0) {
    return `${x2},${y2} ${x2},${y2} ${x2},${y2}`;
  }

  const ux = dx / length;
  const uy = dy / length;
  const arrowLength = 10;
  const arrowWidth = 3.5;
  const baseX = x2 - ux * arrowLength;
  const baseY = y2 - uy * arrowLength;
  const perpX = -uy;
  const perpY = ux;

  const leftX = baseX + perpX * arrowWidth;
  const leftY = baseY + perpY * arrowWidth;
  const rightX = baseX - perpX * arrowWidth;
  const rightY = baseY - perpY * arrowWidth;

  return `${x2},${y2} ${leftX},${leftY} ${rightX},${rightY}`;
};

const movementLines = computed(() => {
  const moves: MovementRecord[] = [
    ...(lastPlayerMove.value ? [lastPlayerMove.value] : []),
    ...lastMonsterMoves.value,
  ];

  return moves.map((move) => {
    const from = getHexCenter(move.from.col, move.from.row);
    const to = getHexCenter(move.to.col, move.to.row);

    return {
      key: `${move.actorId}-${move.from.col}-${move.from.row}-${move.to.col}-${move.to.row}`,
      color: move.color,
      x1: from.x,
      y1: from.y,
      x2: to.x,
      y2: to.y,
      arrowPoints: getArrowPoints(from.x, from.y, to.x, to.y),
    };
  });
});

const requestResetBoard = () => {
  pendingResetBoard.value = true;
};

const cancelResetBoard = () => {
  pendingResetBoard.value = false;
};

const confirmResetBoard = () => {
  pendingResetBoard.value = false;
  resetBoard();
};

watch(
  () => combatLog.value[combatLog.value.length - 1]?.id ?? null,
  async () => {
    await nextTick();
    scrollCombatLogToBottom();
  },
);
</script>

<style scoped>
  .hex-map {
  display: grid;
  grid-template-columns: 380px minmax(0, 1fr);
  align-items: flex-start;
  gap: 18px;
  width: 100%;
}

.controls {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: stretch;
  gap: 18px;
  padding: 6px 22px 0 0;
  width: 380px;
  min-width: 380px;
}

.revive-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: calc(100% - 40px);
  margin-left: 20px;
}

.revive-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  min-width: 0;
  height: 38px;
  padding: 0 14px;
  border: 1px solid rgba(205, 244, 216, 0.14);
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(58, 105, 74, 0.95), rgba(34, 64, 45, 0.95));
  color: #edf7ef;
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
}

.revive-swatch {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  box-shadow:
    0 0 0 2px rgba(255, 248, 238, 0.18),
    inset 0 0 0 1px rgba(0, 0, 0, 0.18);
}

.button-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: calc(100% - 40px);
  margin-left: 20px;
}

.controls-actions {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: flex-start;
  gap: 14px;
}

.combat-log {
  width: calc(100% - 40px);
  margin-left: 20px;
  padding: 12px;
  border-radius: 14px;
  border: 1px solid rgba(255, 239, 213, 0.12);
  background: rgba(18, 15, 12, 0.48);
}

.combat-log-title {
  font-size: 0.8rem;
  font-weight: 700;
  color: rgba(246, 234, 215, 0.82);
}

.combat-log-list {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 280px;
  overflow-y: auto;
  padding-right: 6px;
  scrollbar-width: thin;
  scrollbar-color: rgba(216, 181, 120, 0.5) rgba(255, 247, 236, 0.06);
}

.combat-log-list::-webkit-scrollbar {
  width: 10px;
}

.combat-log-list::-webkit-scrollbar-track {
  border-radius: 999px;
  background: rgba(255, 247, 236, 0.06);
}

.combat-log-list::-webkit-scrollbar-thumb {
  border: 2px solid rgba(18, 15, 12, 0.48);
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(216, 181, 120, 0.66), rgba(151, 107, 52, 0.72));
}

.combat-log-list::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(180deg, rgba(232, 196, 133, 0.76), rgba(164, 117, 58, 0.82));
}

.combat-log-empty {
  font-size: 0.78rem;
  color: rgba(246, 234, 215, 0.52);
}

.combat-log-entry {
  padding: 8px 10px;
  border-radius: 10px;
  font-size: 0.72rem;
  line-height: 1.28;
}

.combat-log-entry-move {
  background: rgba(255, 247, 236, 0.06);
  color: rgba(246, 234, 215, 0.74);
}

.combat-log-entry-attack {
  background: rgba(179, 72, 57, 0.18);
  border: 1px solid rgba(255, 164, 145, 0.22);
  color: #ffe3dc;
  font-weight: 700;
}

.turn-badge {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  width: calc(100% - 40px);
  margin-left: 20px;
  min-height: 42px;
  padding: 10px 14px;
  border-radius: 14px;
  border: 1px solid rgba(255, 239, 213, 0.14);
  background: rgba(18, 15, 12, 0.56);
  color: #f6ead7;
}

.turn-badge-swatch {
  flex: 0 0 auto;
  width: 12px;
  height: 12px;
  border-radius: 999px;
  box-shadow:
    0 0 0 2px rgba(255, 248, 238, 0.16),
    inset 0 0 0 1px rgba(0, 0, 0, 0.18);
}

.turn-badge-text {
  font-size: 0.82rem;
  font-weight: 700;
  line-height: 1.2;
}

.control-button {
  width: 100%;
  border: 1px solid transparent;
  color: #fff8ef;
  padding: 11px 16px;
  border-radius: 14px;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.01em;
  cursor: pointer;
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease,
    background-color 0.18s ease,
    border-color 0.18s ease;
}

.control-button.primary {
  background: linear-gradient(135deg, #c97a39 0%, #934d1f 100%);
  border-color: rgba(255, 225, 188, 0.2);
  box-shadow: 0 12px 28px rgba(157, 82, 31, 0.28);
}

.control-button.primary.attention {
  position: relative;
  border-color: rgba(255, 241, 179, 0.9);
  background: linear-gradient(135deg, #e39b4f 0%, #a34f1f 100%);
  color: #fffdf7;
  text-shadow: 0 1px 10px rgba(255, 248, 220, 0.22);
  box-shadow:
    0 0 0 3px rgba(255, 220, 112, 0.28),
    0 0 22px rgba(255, 195, 82, 0.34),
    0 14px 32px rgba(157, 82, 31, 0.34);
  animation: monster-turn-pulse 1.5s ease-in-out infinite;
}

.control-button.secondary {
  background: linear-gradient(135deg, rgba(67, 74, 63, 0.95), rgba(36, 43, 39, 0.95));
  border-color: rgba(218, 240, 218, 0.12);
}

.control-button.accent {
  background: linear-gradient(135deg, rgba(91, 61, 119, 0.95), rgba(53, 34, 75, 0.95));
  border-color: rgba(225, 203, 255, 0.16);
  box-shadow: 0 12px 28px rgba(73, 46, 100, 0.26);
}

.control-button:hover {
  transform: translateY(-1px);
}

.control-button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
  transform: none;
  box-shadow: none;
}

.control-button.primary:hover {
  box-shadow: 0 16px 34px rgba(157, 82, 31, 0.34);
}

.control-button.secondary:hover {
  background: linear-gradient(135deg, rgba(84, 92, 79, 0.98), rgba(42, 49, 45, 0.98));
}

.control-button.accent:hover {
  box-shadow: 0 16px 34px rgba(73, 46, 100, 0.34);
}

.control-button.danger {
  background: linear-gradient(135deg, #b34839 0%, #6f2319 100%);
  border-color: rgba(255, 210, 198, 0.18);
  box-shadow: 0 12px 28px rgba(111, 35, 25, 0.24);
}

@keyframes monster-turn-pulse {
  0%,
  100% {
    box-shadow:
      0 0 0 3px rgba(255, 220, 112, 0.28),
      0 0 20px rgba(255, 195, 82, 0.28),
      0 14px 32px rgba(157, 82, 31, 0.34);
  }
  50% {
    box-shadow:
      0 0 0 7px rgba(255, 220, 112, 0.16),
      0 0 30px rgba(255, 202, 92, 0.42),
      0 18px 38px rgba(157, 82, 31, 0.4);
  }
}

.map-stage {
  display: flex;
  justify-content: center;
  justify-self: stretch;
  align-self: flex-start;
  overflow: visible;
}

.map-frame {
  display: flex;
  align-items: stretch;
  justify-content: center;
  flex: 0 0 auto;
  padding: 10px;
  border-radius: 30px;
  background: transparent;
  box-shadow: none;
}

.map-background {
  position: relative;
  width: 1200px;
  height: 900px;
  background-image: url("@/assets/map-background.png");
  background-size: cover;
  border-radius: 22px;
  border: 1px solid rgba(255, 239, 213, 0.16);
  box-shadow:
    inset 0 1px 0 rgba(255, 247, 235, 0.06),
    0 18px 40px rgba(0, 0, 0, 0.3);
  overflow: hidden;
}

.map-background::after {
  content: "";
  position: absolute;
  inset: 0;
  background:
    linear-gradient(180deg, rgba(10, 8, 6, 0.08), rgba(10, 8, 6, 0.22)),
    radial-gradient(circle at center, transparent 35%, rgba(7, 6, 5, 0.22) 100%);
  pointer-events: none;
}

.movement-overlay {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  pointer-events: none;
  z-index: 2;
}

.map-container {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: flex-start;
  box-sizing: border-box;
  padding: 2.5px 13.3px;
  width: 1200px;
  height: 900px;
  transform: translateY(0px);
}

.hex-column {
  display: flex;
  flex-direction: column;
}

.hex {
  position: relative;
  clip-path: polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%);
  cursor: pointer;
  transition: none;
}

.hex-highlight,
.hex-path {
  position: absolute;
  inset: 0;
  clip-path: inherit;
  pointer-events: none;
}

.hex-highlight {
  background:
    radial-gradient(circle at center, rgba(163, 255, 172, 0.4), rgba(68, 164, 78, 0.18));
  box-shadow: inset 0 0 0 1px rgba(190, 255, 195, 0.2);
}

.hex-path {
  background: rgba(0, 0, 0, 0.18);
  outline: 1px solid rgba(0, 0, 0, 0.28);
  outline-offset: -2px;
}

.movement-line-shadow {
  stroke: rgba(0, 0, 0, 0.45);
  stroke-width: 5;
  stroke-linecap: round;
}

.movement-line {
  stroke-width: 2.2;
  stroke-linecap: round;
  opacity: 0.95;
}

.movement-arrow {
  opacity: 0.95;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(7, 6, 5, 0.52);
  backdrop-filter: blur(8px);
}

.confirm-modal {
  width: min(420px, 100%);
  padding: 22px;
  border-radius: 22px;
  background:
    linear-gradient(180deg, rgba(255, 247, 236, 0.08), rgba(255, 247, 236, 0.02)),
    rgba(25, 20, 16, 0.96);
  border: 1px solid rgba(255, 236, 214, 0.12);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.38);
}

.confirm-title {
  font-size: 1.15rem;
  font-weight: 700;
  color: #fff1df;
}

.confirm-copy {
  margin-top: 8px;
  color: rgba(255, 241, 223, 0.8);
}

.confirm-actions {
  margin-top: 18px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

@media (max-width: 1280px) {
  .hex-map {
    grid-template-columns: 1fr;
  }

  .controls {
    width: 100%;
    min-width: 0;
    padding-right: 0;
  }

  .turn-badge,
  .button-group,
  .revive-list,
  .combat-log {
    width: 100%;
    margin-left: 0;
  }

  .controls-actions {
    justify-content: flex-start;
  }

  .map-stage {
    justify-self: stretch;
    justify-content: center;
    align-self: flex-start;
  }
}
</style>
