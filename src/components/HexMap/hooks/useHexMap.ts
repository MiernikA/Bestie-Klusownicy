import {computed, ref} from "vue";
import {createInitialEntities, entities} from "@/data/entities";
import type {Entity, MonsterEntity, ObstacleEntity, PlayerEntity} from "@/types/entities.types";
import {findPath, getReachableByPath} from "../utils/pathfinding/pathfinding";
import {moveMonsters, type MovementRecord} from "../utils/monsterMovement";
import { getNeighbors } from "../utils/pathfinding/getNeighbors";

type PlayerMovementRecord = MovementRecord;
type TurnPhase = "players" | "monsters";
export type CombatLogEntry = {
    id: number;
    type: "move" | "attack";
    message: string;
};
const MAX_COMBAT_LOG_ENTRIES = 30;
type BoardSnapshot = {
    entitiesData: Entity[];
    lastPlayerMove: PlayerMovementRecord | null;
    lastMonsterMoves: MovementRecord[];
    phase: TurnPhase;
    movedPlayers: string[];
    currentPlayerColor: string | null;
    deadPlayers: PlayerEntity[];
    lastRemovedMonsterInfo: { id: string; behavior: string } | null;
    combatLog: CombatLogEntry[];
    nextLogId: number;
};

export function useHexMap() {
    const entitiesData = ref<Entity[]>(entities);
    const selectedPlayer = ref<PlayerEntity | null>(null);
    const reachable = ref<{ col: number; row: number }[]>([]);
    const hoveredPath = ref<{ col: number; row: number }[]>([]);
    const lastPlayerMove = ref<PlayerMovementRecord | null>(null);
    const lastMonsterMoves = ref<MovementRecord[]>([]);
    const phase = ref<TurnPhase>("players");
    const movedPlayers = ref<string[]>([]);
    const currentPlayerColor = ref<string | null>(
        entities.find((entity): entity is PlayerEntity => entity.type === "player")?.color ?? null
    );
    const pendingKillPlayer = ref<PlayerEntity | null>(null);
    const pendingRemoveMonster = ref<MonsterEntity | null>(null);
    const lastRemovedMonsterInfo = ref<{ id: string; behavior: string } | null>(null);
    const deadPlayers = ref<PlayerEntity[]>([]);
    const history = ref<BoardSnapshot[]>([]);
    const combatLog = ref<CombatLogEntry[]>([]);
    const nextLogId = ref(1);
    const initialPlayerMap = new Map(
        createInitialEntities()
            .filter((entity): entity is PlayerEntity => entity.type === "player")
            .map((player) => [player.color, player])
    );

    const cloneMovementRecord = (record: MovementRecord | null): MovementRecord | null =>
        record
            ? {
                  ...record,
                  from: { ...record.from },
                  to: { ...record.to },
              }
            : null;

    const clonePlayerEntity = (player: PlayerEntity): PlayerEntity => ({
        ...player,
    });

    const cloneMonsterEntity = (monster: MonsterEntity): MonsterEntity => ({
        ...monster,
        trail: monster.trail.map((step) => ({ ...step })),
        behaviors: [...monster.behaviors],
        _recentPositions: monster._recentPositions?.map((step) => ({ ...step })),
        pumpkinTarget: monster.pumpkinTarget ? { ...monster.pumpkinTarget } : undefined,
        travellerTargets: monster.travellerTargets?.map((step) => ({ ...step })),
    });

    const cloneObstacleEntity = (obstacle: ObstacleEntity): ObstacleEntity => ({
        ...obstacle,
    });

    const cloneEntity = (entity: Entity): Entity => {
        if (entity.type === "player") return clonePlayerEntity(entity);
        if (entity.type === "monster") return cloneMonsterEntity(entity);
        return cloneObstacleEntity(entity);
    };

    const cloneEntities = (list: Entity[]) => list.map(cloneEntity);
    const cloneCombatLog = (entries: CombatLogEntry[]) => entries.map((entry) => ({ ...entry }));

    const getLivingPlayers = () =>
        entitiesData.value.filter((entity): entity is PlayerEntity => entity.type === "player");

    const getCurrentPlayer = () =>
        getLivingPlayers().find((player) => player.color === currentPlayerColor.value) ?? null;

    const clearSelectionState = () => {
        selectedPlayer.value = null;
        reachable.value = [];
        hoveredPath.value = [];
    };

    const pushCombatLog = (type: CombatLogEntry["type"], message: string) => {
        combatLog.value.push({
            id: nextLogId.value,
            type,
            message,
        });
        if (combatLog.value.length > MAX_COMBAT_LOG_ENTRIES) {
            combatLog.value.splice(0, combatLog.value.length - MAX_COMBAT_LOG_ENTRIES);
        }
        nextLogId.value += 1;
    };

    const updateTurnAfterPlayerAction = () => {
        const livingPlayers = getLivingPlayers();

        if (livingPlayers.length === 0) {
            currentPlayerColor.value = null;
            phase.value = "monsters";
            clearSelectionState();
            return;
        }

        const remainingPlayers = livingPlayers.filter(
            (player) => !movedPlayers.value.includes(player.color)
        );

        if (remainingPlayers.length === 0) {
            phase.value = "monsters";
            currentPlayerColor.value = null;
            clearSelectionState();
            return;
        }

        phase.value = "players";
        currentPlayerColor.value = remainingPlayers[0].color;
        selectCurrentPlayer();
    };

    const clearSelection = () => {
        if (phase.value === "players" && getCurrentPlayer()) {
            selectCurrentPlayer();
            return;
        }

        clearSelectionState();
    };

    const saveSnapshot = () => {
        history.value.push({
            entitiesData: cloneEntities(entitiesData.value),
            lastPlayerMove: cloneMovementRecord(lastPlayerMove.value),
            lastMonsterMoves: lastMonsterMoves.value.map((move) => cloneMovementRecord(move)!),
            phase: phase.value,
            movedPlayers: [...movedPlayers.value],
            currentPlayerColor: currentPlayerColor.value,
            deadPlayers: deadPlayers.value.map(clonePlayerEntity),
            lastRemovedMonsterInfo: lastRemovedMonsterInfo.value
                ? { ...lastRemovedMonsterInfo.value }
                : null,
            combatLog: cloneCombatLog(combatLog.value),
            nextLogId: nextLogId.value,
        });
    };

    const restoreSnapshot = (snapshot: BoardSnapshot) => {
        entitiesData.value = cloneEntities(snapshot.entitiesData);
        lastPlayerMove.value = cloneMovementRecord(snapshot.lastPlayerMove);
        lastMonsterMoves.value = snapshot.lastMonsterMoves.map((move) => cloneMovementRecord(move)!);
        phase.value = snapshot.phase;
        movedPlayers.value = [...snapshot.movedPlayers];
        currentPlayerColor.value = snapshot.currentPlayerColor;
        deadPlayers.value = snapshot.deadPlayers.map(clonePlayerEntity);
        lastRemovedMonsterInfo.value = snapshot.lastRemovedMonsterInfo
            ? { ...snapshot.lastRemovedMonsterInfo }
            : null;
        combatLog.value = cloneCombatLog(snapshot.combatLog);
        nextLogId.value = snapshot.nextLogId;
        pendingKillPlayer.value = null;
        pendingRemoveMonster.value = null;
        clearSelectionState();

        if (phase.value === "players" && currentPlayerColor.value) {
            selectCurrentPlayer();
        }
    };

    const resetBoard = () => {
        entitiesData.value = createInitialEntities();
        lastPlayerMove.value = null;
        lastMonsterMoves.value = [];
        phase.value = "players";
        movedPlayers.value = [];
        currentPlayerColor.value = getLivingPlayers()[0]?.color ?? null;
        pendingKillPlayer.value = null;
        pendingRemoveMonster.value = null;
        lastRemovedMonsterInfo.value = null;
        deadPlayers.value = [];
        history.value = [];
        combatLog.value = [];
        nextLogId.value = 1;
        selectCurrentPlayer();
    };

    const undoLastMove = () => {
        const snapshot = history.value.pop();
        if (!snapshot) return;

        restoreSnapshot(snapshot);
    };

    const selectPlayer = (entity: PlayerEntity, options?: { force?: boolean }) => {
        const force = options?.force ?? false;

        if (phase.value !== "players") return;
        if (!force && entity.color !== currentPlayerColor.value) return;

        selectedPlayer.value = entity;
        const blocked = new Set(
            entitiesData.value
                .filter(
                    (e) =>
                        e.type === "obstacle" ||
                        e.type === "monster" ||
                        (e.type === "player" && e !== entity)
                )
                .map((e) => `${e.col},${e.row}`)
        );

        reachable.value = getReachableByPath(
            { col: entity.col, row: entity.row },
            4,
            blocked
        );
        hoveredPath.value = [];
    };

    const selectCurrentPlayer = () => {
        const current = getCurrentPlayer();

        if (!current || phase.value !== "players") {
            clearSelectionState();
            return;
        }

        selectPlayer(current, { force: true });
    };

    const requestKillPlayer = (entity: PlayerEntity) => {
        pendingKillPlayer.value = entity;
    };

    const cancelKillPlayer = () => {
        pendingKillPlayer.value = null;
    };

    const requestRemoveMonster = (entity: MonsterEntity) => {
        pendingRemoveMonster.value = entity;
    };

    const cancelRemoveMonster = () => {
        pendingRemoveMonster.value = null;
    };

    const clearLastRemovedMonsterInfo = () => {
        lastRemovedMonsterInfo.value = null;
    };

    const confirmKillPlayer = () => {
        const entity = pendingKillPlayer.value;
        if (!entity) return;

        const wasCurrentPlayer = currentPlayerColor.value === entity.color;
        const wasSelectedPlayer = selectedPlayer.value === entity;

        entitiesData.value = entitiesData.value.filter((candidate) => candidate !== entity);
        movedPlayers.value = movedPlayers.value.filter((playerColor) => playerColor !== entity.color);
        deadPlayers.value = [...deadPlayers.value, { ...entity }];

        if (lastPlayerMove.value?.actorId === entity.color) {
            lastPlayerMove.value = null;
        }

        if (wasSelectedPlayer) {
            clearSelectionState();
        }

        if (phase.value === "players" && wasCurrentPlayer) {
            updateTurnAfterPlayerAction();
        } else if (!getCurrentPlayer() && phase.value === "players") {
            currentPlayerColor.value = getLivingPlayers()[0]?.color ?? null;
            selectCurrentPlayer();
        }

        pendingKillPlayer.value = null;
    };

    const confirmRemoveMonster = () => {
        const entity = pendingRemoveMonster.value;
        if (!entity) return;

        entitiesData.value = entitiesData.value.filter((candidate) => candidate !== entity);
        lastMonsterMoves.value = lastMonsterMoves.value.filter((move) => move.actorId !== entity.id);
        lastRemovedMonsterInfo.value = {
            id: entity.id,
            behavior: entity.behaviors[0],
        };
        pendingRemoveMonster.value = null;
        clearSelection();
    };

    const revivePlayer = (playerColor: string) => {
        const template = initialPlayerMap.get(playerColor);
        if (!template) return;

        deadPlayers.value = deadPlayers.value.filter((player) => player.color !== playerColor);
        entitiesData.value = [...entitiesData.value, { ...template }];
        movedPlayers.value = movedPlayers.value.filter((color) => color !== playerColor);
        phase.value = "players";
        currentPlayerColor.value = playerColor;
        pendingKillPlayer.value = null;
        selectCurrentPlayer();
    };

    const onHexHover = (col: number, row: number) => {
        if (!selectedPlayer.value) return;
        hoveredPath.value = findPath(
            {col: selectedPlayer.value.col, row: selectedPlayer.value.row},
            {col, row},
            reachable.value
        );
    };

    const onHexClick = (col: number, row: number) => {
        if (!selectedPlayer.value) return;
        const target = reachable.value.find((h) => h.col === col && h.row === row);
        if (target) {
            const path = findPath(
                { col: selectedPlayer.value.col, row: selectedPlayer.value.row },
                { col, row },
                reachable.value
            );
            if (path.length > 0 && path.length <= 5) {
                const movingPlayer = selectedPlayer.value;
                const from = { col: movingPlayer.col, row: movingPlayer.row };
                saveSnapshot();

                selectedPlayer.value.col = col;
                selectedPlayer.value.row = row;
                lastPlayerMove.value = {
                    actorId: movingPlayer.color,
                    actorLabel: `Gracz ${movingPlayer.color}`,
                    color: movingPlayer.color,
                    from,
                    to: { col, row },
                };
                pushCombatLog(
                    "move",
                    `Player ${movingPlayer.name ?? movingPlayer.color} moved from (${from.col}, ${from.row}) to (${col}, ${row}).`,
                );
                movedPlayers.value = [...new Set([...movedPlayers.value, movingPlayer.color])];
                clearSelectionState();
                updateTurnAfterPlayerAction();
            }
        }
    };

    const triggerMonsterTurn = () => {
        const monsters = entitiesData.value.filter(
            (entity): entity is MonsterEntity => entity.type === "monster"
        );
        const players = entitiesData.value.filter(
            (entity): entity is PlayerEntity => entity.type === "player"
        );
        const obstacles = entitiesData.value.filter(
            (entity): entity is ObstacleEntity => entity.type === "obstacle"
        );

        saveSnapshot();
        lastMonsterMoves.value = moveMonsters(monsters, players, obstacles);
        for (const move of lastMonsterMoves.value) {
            const didMove = move.from.col !== move.to.col || move.from.row !== move.to.row;
            pushCombatLog(
                "move",
                didMove
                    ? `Monster #${move.actorId} moved from (${move.from.col}, ${move.from.row}) to (${move.to.col}, ${move.to.row}).`
                    : `Monster #${move.actorId} stayed on (${move.to.col}, ${move.to.row}).`,
            );
        }

        for (const monster of monsters) {
            const adjacentPlayers = getNeighbors({ col: monster.col, row: monster.row }).filter(
                (hex) => players.some((player) => player.col === hex.col && player.row === hex.row),
            );

            for (const targetHex of adjacentPlayers) {
                const attackedPlayer = players.find(
                    (player) => player.col === targetHex.col && player.row === targetHex.row,
                );

                if (!attackedPlayer) continue;

                pushCombatLog(
                    "attack",
                    `Monster #${monster.id} attacks ${attackedPlayer.name ?? attackedPlayer.color} near (${attackedPlayer.col}, ${attackedPlayer.row}).`,
                );
            }
        }
        movedPlayers.value = [];
        phase.value = "players";
        currentPlayerColor.value = getLivingPlayers()[0]?.color ?? null;
        selectCurrentPlayer();
    };

    const entityByPosition = computed(() => {
        const lookup = new Map<string, Entity>();

        for (const entity of entitiesData.value) {
            lookup.set(`${entity.col},${entity.row}`, entity);
        }

        return lookup;
    });

    const reachableSet = computed(
        () => new Set(reachable.value.map((hex) => `${hex.col},${hex.row}`))
    );

    const pathSet = computed(
        () => new Set(hoveredPath.value.map((hex) => `${hex.col},${hex.row}`))
    );

    const isReachable = (col: number, row: number) =>
        reachableSet.value.has(`${col},${row}`);

    const isPath = (col: number, row: number) =>
        pathSet.value.has(`${col},${row}`);

    const isCurrentPlayer = (entity: PlayerEntity) =>
        phase.value === "players" && entity.color === currentPlayerColor.value;

    const currentPlayer = computed(() => getCurrentPlayer());
    const canTriggerMonsterTurn = computed(() => phase.value === "monsters");
    const canUndoMove = computed(() => history.value.length > 0);
    const currentTurnColor = computed(() => currentPlayer.value?.color ?? null);
    const turnIndicator = computed(() => {
        if (phase.value === "monsters") {
            return {
                title: "Monster turn",
                subtitle: "Run the monsters to finish the round.",
            };
        }

        if (!currentPlayer.value) {
            return {
                title: "No active player",
                subtitle: "All players were removed or the round has ended.",
            };
        }

        return {
            title: `Player turn: ${currentPlayer.value.name ?? currentPlayer.value.color}`,
            subtitle: "Only the active player can move now.",
        };
    });

    return {
        entitiesData,
        entityByPosition,
        reachableSet,
        pathSet,
        lastPlayerMove,
        lastMonsterMoves,
        phase,
        pendingKillPlayer,
        pendingRemoveMonster,
        lastRemovedMonsterInfo,
        deadPlayers,
        combatLog,
        currentPlayer,
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
        clearSelection,
        resetBoard,
        undoLastMove,
        triggerMonsterTurn,
        onHexHover,
        onHexClick,
        isReachable,
        isPath,
    };
}
