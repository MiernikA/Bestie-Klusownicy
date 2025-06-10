export function travellerBehavior(monster, { mapData, isObstacle, moveToward }) {
    if (!monster.travellerTargets) {
        const terrainMap = new Map();

        for (const tile of mapData.values()) {
            if (tile.terrain === "bridge" || tile.terrain === "water") continue;
            if (isObstacle(tile.q, tile.r)) continue;

            if (!terrainMap.has(tile.terrain)) {
                terrainMap.set(tile.terrain, []);
            }
            terrainMap.get(tile.terrain).push(tile);
        }

        const targets = [];

        for (const [terrain, tiles] of terrainMap.entries()) {
            const randomTile = tiles[Math.floor(Math.random() * tiles.length)];
            targets.push({ q: randomTile.q, r: randomTile.r });
        }

        monster.travellerTargets = targets.sort(() => Math.random() - 0.5);
        monster.currentTravellerIndex = 0;
    }

    const target = monster.travellerTargets[monster.currentTravellerIndex];
    if (!target) return;

    if (monster.q === target.q && monster.r === target.r) {
        monster.currentTravellerIndex = (monster.currentTravellerIndex + 1) % monster.travellerTargets.length;
    }

    const nextTarget = monster.travellerTargets[monster.currentTravellerIndex];
    moveToward(monster, nextTarget);
}