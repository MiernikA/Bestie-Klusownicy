import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { apiBaseUrl, wsBaseUrl } from "@/config";
import type { Entity, MonsterEntity, PlayerEntity } from "@/types/entities.types";
import type { Hex, MovementRecord } from "@/types/game.types";

type TurnPhase = "players" | "monsters";

export type CombatLogEntry = {
    id: number;
    type: "move" | "attack";
    message: string;
};

type TurnIndicator = {
    title: string;
    subtitle: string;
};

type RemovedMonsterInfo = {
    id: string;
    behavior: string;
};

type GameState = {
    entitiesData: Entity[];
    reachable: Hex[];
    hoveredPath: Hex[];
    lastPlayerMove: MovementRecord | null;
    lastMonsterMoves: MovementRecord[];
    phase: TurnPhase;
    movedPlayers: string[];
    currentPlayerColor: string | null;
    pendingKillPlayer: PlayerEntity | null;
    pendingRemoveMonster: MonsterEntity | null;
    lastRemovedMonsterInfo: RemovedMonsterInfo | null;
    deadPlayers: PlayerEntity[];
    combatLog: CombatLogEntry[];
    nextLogId: number;
    history: Array<Record<string, unknown>>;
    turnIndicator: TurnIndicator;
    canTriggerMonsterTurn: boolean;
    canUndoMove: boolean;
    currentTurnColor: string | null;
};

type SessionEnvelope = {
    sessionId: string;
    state: GameState;
};

const SESSION_ID = "default";
const STATE_SYNC_INTERVAL_MS = 15000;
const WEBSOCKET_RECONNECT_DELAY_MS = 1000;

const isValidTile = (col: number, row: number) => {
    if (col < 0 || col >= 36) return false;
    const maxRow = col % 2 !== 0 ? 23 : 24;
    return row >= 1 && row <= maxRow;
};

const getNeighbors = (hex: Hex): Hex[] => {
    const isOdd = hex.col % 2 !== 0;
    const candidates = isOdd
        ? [
            { col: hex.col + 1, row: hex.row },
            { col: hex.col + 1, row: hex.row + 1 },
            { col: hex.col, row: hex.row + 1 },
            { col: hex.col - 1, row: hex.row + 1 },
            { col: hex.col - 1, row: hex.row },
            { col: hex.col, row: hex.row - 1 },
        ]
        : [
            { col: hex.col + 1, row: hex.row - 1 },
            { col: hex.col + 1, row: hex.row },
            { col: hex.col, row: hex.row + 1 },
            { col: hex.col - 1, row: hex.row },
            { col: hex.col - 1, row: hex.row - 1 },
            { col: hex.col, row: hex.row - 1 },
        ];

    return candidates.filter((neighbor) => isValidTile(neighbor.col, neighbor.row));
};

const hexDistance = (a: Hex, b: Hex) => {
    const ax = a.col;
    const az = a.row - (a.col - (a.col & 1)) / 2;
    const ay = -ax - az;
    const bx = b.col;
    const bz = b.row - (b.col - (b.col & 1)) / 2;
    const by = -bx - bz;
    return Math.max(Math.abs(ax - bx), Math.abs(ay - by), Math.abs(az - bz));
};

const findPath = (start: Hex, end: Hex, allowed: Hex[]): Hex[] => {
    const allowedSet = new Set(allowed.map((hex) => `${hex.col},${hex.row}`));
    const openNodes: Hex[] = [start];
    const cameFrom = new Map<string, string>();
    const gScore = new Map<string, number>([[`${start.col},${start.row}`, 0]]);
    const fScore = new Map<string, number>([[`${start.col},${start.row}`, hexDistance(start, end)]]);

    while (openNodes.length > 0) {
        let currentIndex = 0;

        for (let index = 1; index < openNodes.length; index += 1) {
            const candidate = openNodes[index];
            const candidateScore = fScore.get(`${candidate.col},${candidate.row}`) ?? Number.POSITIVE_INFINITY;
            const current = openNodes[currentIndex];
            const currentScore = fScore.get(`${current.col},${current.row}`) ?? Number.POSITIVE_INFINITY;

            if (candidateScore < currentScore) {
                currentIndex = index;
            }
        }

        const current = openNodes[currentIndex];
        const currentKey = `${current.col},${current.row}`;

        if (current.col === end.col && current.row === end.row) {
            const path: Hex[] = [current];
            let walkKey = currentKey;

            while (cameFrom.has(walkKey)) {
                const previousKey = cameFrom.get(walkKey)!;
                const [col, row] = previousKey.split(",");
                path.unshift({ col: Number(col), row: Number(row) });
                walkKey = previousKey;
            }

            return path;
        }

        openNodes.splice(currentIndex, 1);

        for (const neighbor of getNeighbors(current)) {
            const neighborKey = `${neighbor.col},${neighbor.row}`;
            if (!allowedSet.has(neighborKey)) continue;

            const tentativeG = (gScore.get(currentKey) ?? Number.POSITIVE_INFINITY) + 1;
            if (tentativeG >= (gScore.get(neighborKey) ?? Number.POSITIVE_INFINITY)) continue;

            cameFrom.set(neighborKey, currentKey);
            gScore.set(neighborKey, tentativeG);
            fScore.set(neighborKey, tentativeG + hexDistance(neighbor, end));

            if (!openNodes.some((node) => node.col === neighbor.col && node.row === neighbor.row)) {
                openNodes.push(neighbor);
            }
        }
    }

    return [];
};

const emptyState = (): GameState => ({
    entitiesData: [],
    reachable: [],
    hoveredPath: [],
    lastPlayerMove: null,
    lastMonsterMoves: [],
    phase: "players",
    movedPlayers: [],
    currentPlayerColor: null,
    pendingKillPlayer: null,
    pendingRemoveMonster: null,
    lastRemovedMonsterInfo: null,
    deadPlayers: [],
    combatLog: [],
    nextLogId: 1,
    history: [],
    turnIndicator: {
        title: "Loading board",
        subtitle: "Fetching game state from backend.",
    },
    canTriggerMonsterTurn: false,
    canUndoMove: false,
    currentTurnColor: null,
});

async function postGameAction<TPayload extends Record<string, unknown>>(
    endpoint: string,
    payload: TPayload,
): Promise<GameState> {
    const response = await fetch(`${apiBaseUrl}${endpoint}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            sessionId: SESSION_ID,
            ...payload,
        }),
    });

    if (!response.ok) {
        throw new Error(`Request failed: ${endpoint} (${response.status})`);
    }

    const data = (await response.json()) as SessionEnvelope;
    return data.state;
}

export function useHexMap() {
    const state = ref<GameState>(emptyState());
    const pendingKillPlayer = ref<PlayerEntity | null>(null);
    const pendingRemoveMonster = ref<MonsterEntity | null>(null);
    const requestInFlight = ref(0);
    const lastHoveredHexKey = ref<string | null>(null);
    const localHoveredPath = ref<Hex[]>([]);
    const websocketConnected = ref(false);
    let syncIntervalId: number | null = null;
    let reconnectTimeoutId: number | null = null;
    let websocket: WebSocket | null = null;
    let isUnmounted = false;

    const applyState = (nextState: GameState) => {
        state.value = nextState;

        const livingPlayers = nextState.entitiesData.filter(
            (entity): entity is PlayerEntity => entity.type === "player",
        );
        const livingMonsters = nextState.entitiesData.filter(
            (entity): entity is MonsterEntity => entity.type === "monster",
        );

        if (
            pendingKillPlayer.value &&
            !livingPlayers.some((player) => player.color === pendingKillPlayer.value?.color)
        ) {
            pendingKillPlayer.value = null;
        }

        if (
            pendingRemoveMonster.value &&
            !livingMonsters.some((monster) => monster.id === pendingRemoveMonster.value?.id)
        ) {
            pendingRemoveMonster.value = null;
        }

        if (
            lastHoveredHexKey.value &&
            nextState.phase !== "players"
        ) {
            lastHoveredHexKey.value = null;
        }

        if (nextState.phase !== "players") {
            localHoveredPath.value = [];
        }
    };

    const runAction = async <TPayload extends Record<string, unknown>>(
        endpoint: string,
        payload: TPayload = {} as TPayload,
    ) => {
        requestInFlight.value += 1;

        try {
            applyState(await postGameAction(endpoint, payload));
        } catch (error) {
            console.error(error);
        } finally {
            requestInFlight.value -= 1;
        }
    };

    const refreshState = async (options?: { force?: boolean }) => {
        const force = options?.force ?? false;
        if (!force && requestInFlight.value > 0) return;
        await runAction("/game/state", {});
    };

    const connectWebSocket = () => {
        if (websocket && websocket.readyState === WebSocket.OPEN) return;
        if (websocket && websocket.readyState === WebSocket.CONNECTING) return;

        websocket = new WebSocket(
            `${wsBaseUrl}/game?sessionId=${encodeURIComponent(SESSION_ID)}`,
        );

        websocket.addEventListener("open", () => {
            websocketConnected.value = true;
        });

        websocket.addEventListener("message", (event) => {
            try {
                const payload = JSON.parse(event.data) as SessionEnvelope;
                applyState(payload.state);
            } catch (error) {
                console.error(error);
            }
        });

        websocket.addEventListener("close", () => {
            websocketConnected.value = false;
            websocket = null;

            if (isUnmounted) {
                return;
            }

            if (reconnectTimeoutId !== null) {
                window.clearTimeout(reconnectTimeoutId);
            }

            reconnectTimeoutId = window.setTimeout(() => {
                reconnectTimeoutId = null;
                connectWebSocket();
            }, WEBSOCKET_RECONNECT_DELAY_MS);
        });

        websocket.addEventListener("error", (error) => {
            console.error(error);
        });
    };

    const selectPlayer = async (entity: PlayerEntity) => {
        if (state.value.phase !== "players") return;
        if (entity.color !== state.value.currentPlayerColor) return;
        await runAction("/game/select-player", { color: entity.color });
    };

    const requestKillPlayer = (entity: PlayerEntity) => {
        pendingKillPlayer.value = entity;
    };

    const cancelKillPlayer = () => {
        pendingKillPlayer.value = null;
    };

    const confirmKillPlayer = async () => {
        const entity = pendingKillPlayer.value;
        if (!entity) return;

        pendingKillPlayer.value = null;
        await runAction("/game/kill-player", { color: entity.color });
    };

    const requestRemoveMonster = (entity: MonsterEntity) => {
        pendingRemoveMonster.value = entity;
    };

    const cancelRemoveMonster = () => {
        pendingRemoveMonster.value = null;
    };

    const confirmRemoveMonster = async () => {
        const entity = pendingRemoveMonster.value;
        if (!entity) return;

        pendingRemoveMonster.value = null;
        await runAction("/game/remove-monster", { id: entity.id });
    };

    const clearLastRemovedMonsterInfo = async () => {
        await runAction("/game/clear-removed-monster-info", {});
    };

    const revivePlayer = async (playerColor: string) => {
        await runAction("/game/revive-player", { color: playerColor });
    };

    const resetBoard = async () => {
        lastHoveredHexKey.value = null;
        localHoveredPath.value = [];
        await runAction("/game/reset", {});
    };

    const undoLastMove = async () => {
        lastHoveredHexKey.value = null;
        localHoveredPath.value = [];
        await runAction("/game/undo", {});
    };

    const triggerMonsterTurn = async () => {
        lastHoveredHexKey.value = null;
        localHoveredPath.value = [];
        await runAction("/game/monster-turn", {});
    };

    const onHexHover = (col: number, row: number) => {
        if (requestInFlight.value > 0) return;
        if (state.value.phase !== "players") return;
        if (!state.value.currentPlayerColor) return;

        const hexKey = `${col},${row}`;
        if (lastHoveredHexKey.value === hexKey) return;

        lastHoveredHexKey.value = hexKey;
        const player = currentPlayer.value;
        if (!player) {
            localHoveredPath.value = [];
            return;
        }

        localHoveredPath.value = findPath(
            { col: player.col, row: player.row },
            { col, row },
            state.value.reachable,
        );
    };

    const onHexClick = async (col: number, row: number) => {
        lastHoveredHexKey.value = null;
        localHoveredPath.value = [];
        await runAction("/game/click-hex", { col, row });
    };

    const entityByPosition = computed(() => {
        const lookup = new Map<string, Entity>();

        for (const entity of state.value.entitiesData) {
            lookup.set(`${entity.col},${entity.row}`, entity);
        }

        return lookup;
    });

    const reachableSet = computed(
        () => new Set(state.value.reachable.map((hex) => `${hex.col},${hex.row}`)),
    );

    const pathSet = computed(
        () => new Set(localHoveredPath.value.map((hex) => `${hex.col},${hex.row}`)),
    );

    const currentPlayer = computed(
        () =>
            state.value.entitiesData.find(
                (entity): entity is PlayerEntity =>
                    entity.type === "player" && entity.color === state.value.currentPlayerColor,
            ) ?? null,
    );

    const isReachable = (col: number, row: number) => reachableSet.value.has(`${col},${row}`);
    const isPath = (col: number, row: number) => pathSet.value.has(`${col},${row}`);
    const isCurrentPlayer = (entity: PlayerEntity) =>
        state.value.phase === "players" && entity.color === state.value.currentPlayerColor;

    const handleVisibilitySync = () => {
        if (document.visibilityState === "visible") {
            void refreshState({ force: true });
        }
    };

    const handleWindowFocus = () => {
        void refreshState({ force: true });
    };

    onMounted(() => {
        isUnmounted = false;
        void refreshState({ force: true });
        connectWebSocket();

        syncIntervalId = window.setInterval(() => {
            if (document.visibilityState !== "visible") return;
            if (websocketConnected.value) return;
            void refreshState();
        }, STATE_SYNC_INTERVAL_MS);

        document.addEventListener("visibilitychange", handleVisibilitySync);
        window.addEventListener("focus", handleWindowFocus);
    });

    onBeforeUnmount(() => {
        isUnmounted = true;

        if (syncIntervalId !== null) {
            window.clearInterval(syncIntervalId);
        }

        if (reconnectTimeoutId !== null) {
            window.clearTimeout(reconnectTimeoutId);
        }

        if (websocket) {
            websocket.close();
            websocket = null;
        }

        document.removeEventListener("visibilitychange", handleVisibilitySync);
        window.removeEventListener("focus", handleWindowFocus);
    });

    return {
        entitiesData: computed(() => state.value.entitiesData),
        entityByPosition,
        reachableSet,
        pathSet,
        lastPlayerMove: computed(() => state.value.lastPlayerMove),
        lastMonsterMoves: computed(() => state.value.lastMonsterMoves),
        phase: computed(() => state.value.phase),
        pendingKillPlayer,
        pendingRemoveMonster,
        lastRemovedMonsterInfo: computed(() => state.value.lastRemovedMonsterInfo),
        deadPlayers: computed(() => state.value.deadPlayers),
        combatLog: computed(() => state.value.combatLog),
        currentPlayer,
        canTriggerMonsterTurn: computed(() => state.value.canTriggerMonsterTurn),
        canUndoMove: computed(() => state.value.canUndoMove),
        currentTurnColor: computed(() => state.value.currentTurnColor),
        turnIndicator: computed(() => state.value.turnIndicator),
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
        isReachable,
        isPath,
    };
}
