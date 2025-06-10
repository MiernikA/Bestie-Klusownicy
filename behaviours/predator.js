export function predatorBehavior(monster, { players, mapData, isObstacle, isOccupied, moveToward, distance, directions }) {
    const visiblePlayer = players.reduce((closest, player) => {
        const d = distance(monster, player);
        return d <= 10 && (!closest || d < distance(monster, closest)) ? player : closest;
    }, null);

    if (visiblePlayer) {
        const dist = distance(monster, visiblePlayer);
        if (dist > 1) {
            moveToward(monster, visiblePlayer);
        }
    } else {
        const shuffled = directions.sort(() => Math.random() - 0.5);
        for (const dir of shuffled) {
            let newQ = monster.q + dir.dq;
            let newR = monster.r + dir.dr;

            if (monster.q % 2 !== 0) {
                if (dir.dr === -1 && dir.dq === 1) newR = monster.r;
                if (dir.dr === 0 && dir.dq === 1) newR = monster.r + 1;
                if (dir.dr === 1 && dir.dq === -1) newR = monster.r;
                if (dir.dr === 0 && dir.dq === -1) newR = monster.r + 1;
            } else {
                if (dir.dr === -1 && dir.dq === -1) newR = monster.r - 1;
                if (dir.dr === 0 && dir.dq === -1) newR = monster.r - 1;
                if (dir.dr === -1 && dir.dq === 1) newR = monster.r - 1;
                if (dir.dr === 0 && dir.dq === 1) newR = monster.r;
            }

            const hexKey = `${newQ},${newR}`;
            if (!mapData.has(hexKey)) continue;
            if (isObstacle(newQ, newR)) continue;
            if (isOccupied(newQ, newR)) continue;

            monster.q = newQ;
            monster.r = newR;
            break;
        }
    }
}
