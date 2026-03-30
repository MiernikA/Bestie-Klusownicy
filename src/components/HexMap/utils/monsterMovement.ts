import type {
    MonsterBehavior,
    MonsterEntity,
    ObstacleEntity,
    PlayerEntity,
} from "@/types/entities.types";
import { cols, getRowsForColumn } from "./HexUtils";
import { getNeighbors } from "./pathfinding/getNeighbors";

type Hex = { col: number; row: number };

export type MovementRecord = {
    actorId: string;
    actorLabel: string;
    color: string;
    from: Hex;
    to: Hex;
};

type MonsterContext = {
    area: Hex[];
    directions: Hex[];
    getRandomPumpkin: (exclude?: Hex | null) => Hex;
    isObstacle: (col: number, row: number) => boolean;
    isOccupied: (col: number, row: number, activeMonsterId: string) => boolean;
    moveToward: (monster: MonsterEntity, target: Hex | null | undefined) => void;
    monsters: MonsterEntity[];
    players: PlayerEntity[];
    validTiles: Hex[];
};

const DIRECTION_OFFSETS: Hex[] = [
    { col: 0, row: -1 },
    { col: 1, row: -1 },
    { col: 1, row: 0 },
    { col: 0, row: 1 },
    { col: -1, row: 0 },
    { col: -1, row: -1 },
];

const PUMPKINS: Hex[] = [
    { col: 27, row: 21 },
    { col: 8, row: 11 },
    { col: 17, row: 3 },
];

const AVAILABLE_BEHAVIORS: MonsterBehavior[] = [
    "fellowship",
    "seek_furthest",
    "patrol_area",
    "pumpkin_lover",
    "traveller",
    "predator",
];

function hexDistance(a: Hex, b: Hex): number {
    const ax = a.col;
    const az = a.row - (a.col - (a.col & 1)) / 2;
    const ay = -ax - az;
    const bx = b.col;
    const bz = b.row - (b.col - (b.col & 1)) / 2;
    const by = -bx - bz;

    return Math.max(Math.abs(ax - bx), Math.abs(ay - by), Math.abs(az - bz));
}

function getRandomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min)) + min;
}

function getValidTiles(): Hex[] {
    const tiles: Hex[] = [];

    for (let col = 0; col < cols; col += 1) {
        for (let row = 1; row <= getRowsForColumn(col); row += 1) {
            tiles.push({ col, row });
        }
    }

    return tiles;
}

function isValidTile(col: number, row: number): boolean {
    return col >= 0 && col < cols && row >= 1 && row <= getRowsForColumn(col);
}

function getMonsterStep(hex: Hex, direction: Hex): Hex {
    const { col, row } = hex;
    const { col: dCol, row: dRow } = direction;
    let nextCol = col + dCol;
    let nextRow = row + dRow;

    if (col % 2 !== 0) {
        if (dRow === -1 && dCol === 1) nextRow = row;
        if (dRow === 0 && dCol === 1) nextRow = row + 1;
        if (dRow === 1 && dCol === -1) nextRow = row;
        if (dRow === 0 && dCol === -1) nextRow = row + 1;
    } else {
        if (dRow === -1 && dCol === -1) nextRow = row - 1;
        if (dRow === 0 && dCol === -1) nextRow = row - 1;
        if (dRow === -1 && dCol === 1) nextRow = row - 1;
        if (dRow === 0 && dCol === 1) nextRow = row;
    }

    return { col: nextCol, row: nextRow };
}

function seekFurthestBehavior(monster: MonsterEntity, context: MonsterContext) {
    const target = context.players.reduce<PlayerEntity | null>((furthest, player) => {
        if (!furthest) return player;
        return hexDistance(monster, player) > hexDistance(monster, furthest) ? player : furthest;
    }, null);

    if (target) context.moveToward(monster, target);
}

function pumpkinLoverBehavior(monster: MonsterEntity, context: MonsterContext) {
    if (!monster.pumpkinTarget) {
        monster.pumpkinTarget = context.getRandomPumpkin();
        monster.waitAtPumpkin = false;
    }

    const distToPumpkin = hexDistance(monster, monster.pumpkinTarget);
    if (distToPumpkin <= 1) {
        if (!monster.waitAtPumpkin) {
            monster.waitAtPumpkin = true;
            return;
        }

        monster.pumpkinTarget = context.getRandomPumpkin(monster.pumpkinTarget);
        monster.waitAtPumpkin = false;
    }

    context.moveToward(monster, monster.pumpkinTarget);
}

function fellowshipBehavior(monster: MonsterEntity, context: MonsterContext) {
    const others = context.monsters.filter((candidate) => candidate.id !== monster.id);
    if (others.length === 0) return;

    const nearest = others.reduce<MonsterEntity | null>((closest, candidate) => {
        if (!closest) return candidate;
        return hexDistance(monster, candidate) < hexDistance(monster, closest)
            ? candidate
            : closest;
    }, null);

    if (nearest && hexDistance(monster, nearest) > 1) {
        context.moveToward(monster, nearest);
    }
}

function travellerBehavior(monster: MonsterEntity, context: MonsterContext) {
    if (!monster.travellerTargets) {
        monster.travellerTargets = [...context.validTiles]
            .filter((tile) => !context.isObstacle(tile.col, tile.row))
            .sort(() => Math.random() - 0.5)
            .slice(0, 6);
        monster.currentTravellerIndex = 0;
    }

    const currentIndex = monster.currentTravellerIndex ?? 0;
    const target = monster.travellerTargets[currentIndex];
    if (!target) return;

    if (monster.col === target.col && monster.row === target.row) {
        monster.currentTravellerIndex = (currentIndex + 1) % monster.travellerTargets.length;
    }

    context.moveToward(monster, monster.travellerTargets[monster.currentTravellerIndex ?? 0]);
}

function patrolAreaBehavior(monster: MonsterEntity, context: MonsterContext) {
    if (monster.currentPatrolIndex === undefined) {
        monster.currentPatrolIndex = 0;
    }

    const target = context.area[monster.currentPatrolIndex];
    if (monster.col === target.col && monster.row === target.row) {
        monster.currentPatrolIndex = (monster.currentPatrolIndex + 1) % context.area.length;
    }

    context.moveToward(monster, context.area[monster.currentPatrolIndex]);
}

function predatorBehavior(monster: MonsterEntity, context: MonsterContext) {
    const visiblePlayer = context.players.reduce<PlayerEntity | null>((closest, player) => {
        const distance = hexDistance(monster, player);
        if (distance > 10) return closest;
        if (!closest) return player;
        return distance < hexDistance(monster, closest) ? player : closest;
    }, null);

    if (visiblePlayer) {
        if (hexDistance(monster, visiblePlayer) > 1) {
            context.moveToward(monster, visiblePlayer);
        }
        return;
    }

    const shuffledDirections = [...context.directions].sort(() => Math.random() - 0.5);
    for (const direction of shuffledDirections) {
        const next = getMonsterStep(monster, direction);

        if (!isValidTile(next.col, next.row)) continue;
        if (context.isObstacle(next.col, next.row)) continue;
        if (context.isOccupied(next.col, next.row, monster.id)) continue;

        monster.col = next.col;
        monster.row = next.row;
        return;
    }
}

function createPatrolArea(validTiles: Hex[], obstacles: ObstacleEntity[]): Hex[] {
    const area: Hex[] = [];
    let attempts = 0;

    while (area.length < 6 && attempts < 200) {
        attempts += 1;
        const col = getRandomInt(11, 20);
        const row = getRandomInt(11, 20);
        const exists = validTiles.some((tile) => tile.col === col && tile.row === row);
        const blocked = obstacles.some((obstacle) => obstacle.col === col && obstacle.row === row);
        const duplicate = area.some((tile) => tile.col === col && tile.row === row);

        if (!exists || blocked || duplicate) continue;
        area.push({ col, row });
    }

    return area.length > 0 ? area : validTiles.slice(0, 6);
}

export function createInitialMonsters(): MonsterEntity[] {
    const monsters: MonsterEntity[] = [
        { id: "1", type: "monster", col: 15, row: 15, speed: 2, hp: 3, trail: [], behaviors: ["seek_furthest"], color: "red" },
        { id: "2", type: "monster", col: 13, row: 13, speed: 3, hp: 3, trail: [], behaviors: ["pumpkin_lover"], color: "blue" },
        { id: "3", type: "monster", col: 17, row: 10, speed: 2, hp: 3, trail: [], behaviors: ["traveller"], color: "pink" },
        { id: "4", type: "monster", col: 20, row: 12, speed: 3, hp: 3, trail: [], behaviors: ["fellowship"], color: "yellow" },
        { id: "5", type: "monster", col: 19, row: 14, speed: 3, hp: 3, trail: [], behaviors: ["predator"], color: "cyan" },
        { id: "6", type: "monster", col: 13, row: 11, speed: 4, hp: 3, trail: [], behaviors: ["patrol_area"], color: "navy" },
    ];

    const availableBehaviors = [...AVAILABLE_BEHAVIORS];
    for (const monster of monsters) {
        const randomIndex = Math.floor(Math.random() * availableBehaviors.length);
        monster.behaviors = [availableBehaviors.splice(randomIndex, 1)[0]];
    }

    return monsters;
}

export function moveMonsters(
    monsters: MonsterEntity[],
    players: PlayerEntity[],
    obstacles: ObstacleEntity[],
): MovementRecord[] {
    const validTiles = getValidTiles();
    const area = createPatrolArea(validTiles, obstacles);
    const movementRecords: MovementRecord[] = [];

    const isObstacle = (col: number, row: number) =>
        obstacles.some((obstacle) => obstacle.col === col && obstacle.row === row);

    const isOccupied = (col: number, row: number, activeMonsterId: string) =>
        players.some((player) => player.col === col && player.row === row) ||
        monsters.some(
            (monster) =>
                monster.id !== activeMonsterId && monster.col === col && monster.row === row,
        );

    const moveToward = (monster: MonsterEntity, target: Hex | null | undefined) => {
        if (!target) return;

        let currentCol = monster.col;
        let currentRow = monster.row;

        if (!monster._recentPositions) {
            monster._recentPositions = [];
        }

        const maxHistory = 6;
        const speed = getRandomInt(2, 5);

        for (let step = 0; step < speed; step += 1) {
            let bestMove: Hex | null = null;
            let bestDistance = Number.POSITIVE_INFINITY;

            for (const direction of DIRECTION_OFFSETS) {
                const next = getMonsterStep({ col: currentCol, row: currentRow }, direction);

                if (!isValidTile(next.col, next.row)) continue;
                if (isObstacle(next.col, next.row)) continue;
                if (isOccupied(next.col, next.row, monster.id)) continue;

                const wasRecentlyVisited = monster._recentPositions.some(
                    (position) => position.col === next.col && position.row === next.row,
                );
                if (wasRecentlyVisited) continue;

                const distance = hexDistance(next, target);
                if (distance < bestDistance) {
                    bestDistance = distance;
                    bestMove = next;
                }
            }

            if (!bestMove) {
                for (const neighbor of getNeighbors({ col: currentCol, row: currentRow })) {
                    if (!isValidTile(neighbor.col, neighbor.row)) continue;
                    if (isObstacle(neighbor.col, neighbor.row)) continue;
                    if (isOccupied(neighbor.col, neighbor.row, monster.id)) continue;

                    bestMove = neighbor;
                    break;
                }
            }

            if (!bestMove) break;
            currentCol = bestMove.col;
            currentRow = bestMove.row;
        }

        const moved = currentCol !== monster.col || currentRow !== monster.row;
        if (moved) {
            monster._recentPositions.push({ col: currentCol, row: currentRow });
            if (monster._recentPositions.length > maxHistory) {
                monster._recentPositions.shift();
            }
        } else if (monster._recentPositions.length >= maxHistory) {
            monster._recentPositions.shift();
        }

        monster.col = currentCol;
        monster.row = currentRow;
    };

    const context: MonsterContext = {
        area,
        directions: DIRECTION_OFFSETS,
        getRandomPumpkin: (exclude = null) => {
            const candidates = PUMPKINS.filter(
                (pumpkin) =>
                    !exclude || pumpkin.col !== exclude.col || pumpkin.row !== exclude.row,
            );
            return candidates[Math.floor(Math.random() * candidates.length)];
        },
        isObstacle,
        isOccupied,
        moveToward,
        monsters,
        players,
        validTiles,
    };

    for (const monster of monsters) {
        const from = { col: monster.col, row: monster.row };
        monster.trail.push({ col: monster.col, row: monster.row });

        switch (monster.behaviors[0]) {
            case "seek_furthest":
                seekFurthestBehavior(monster, context);
                break;
            case "pumpkin_lover":
                pumpkinLoverBehavior(monster, context);
                break;
            case "patrol_area":
                patrolAreaBehavior(monster, context);
                break;
            case "fellowship":
                fellowshipBehavior(monster, context);
                break;
            case "traveller":
                travellerBehavior(monster, context);
                break;
            case "predator":
                predatorBehavior(monster, context);
                break;
        }

        movementRecords.push({
            actorId: monster.id,
            actorLabel: `Bestia ${monster.id}`,
            color: monster.color,
            from,
            to: { col: monster.col, row: monster.row },
        });
    }

    return movementRecords;
}
