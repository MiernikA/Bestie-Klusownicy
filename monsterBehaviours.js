import { seekFurthestBehavior } from './behaviours/seekFurthest.js';
import { pumpkinLoverBehavior } from './behaviours/pumpkinLover.js';
import { fellowshipBehavior } from './behaviours/fellowship.js';
import { travellerBehavior } from './behaviours/traveller.js';
import { patrolAreaBehavior } from './behaviours/patrolArea.js';
import { predatorBehavior } from './behaviours/predator.js';

export function moveMonsters(monsters, players, mapData, obstacles) {
    const directions = [
        { dq: 0, dr: -1 },
        { dq: 1, dr: -1 },
        { dq: 1, dr: 0 },
        { dq: 0, dr: 1 },
        { dq: -1, dr: 0 },
        { dq: -1, dr: -1 }
    ];

    const pumpkins = [
        { id: "o79", q: 27, r: 21 },
        { id: "o38", q: 8, r: 11 },
        { id: "o12", q: 17, r: 3 }
    ];

    const area = [];
    while (area.length < 6) {
        const q = getRandomInt(11, 20);
        const r = getRandomInt(11, 20);
        const hexKey = `${q},${r}`;
        if (!mapData.has(hexKey)) continue;
        if (isObstacle(q, r)) continue;
        area.push({ id: `p${area.length + 1}`, q, r });
    }

    function getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min)) + min;
    }

    function isObstacle(q, r) {
        return obstacles.some(obs => obs.q === q && obs.r === r);
    }

    function isOccupied(q, r) {
        return (
            monsters.some(m => m.q === q && m.r === r) ||
            players.some(p => p.q === q && p.r === r)
        );
    }

    function distance(a, b) {
        return Math.sqrt((a.q - b.q) ** 2 + (a.r - b.r) ** 2);
    }

    function moveToward(monster, target) {
        if (!target || typeof target.q !== 'number' || typeof target.r !== 'number') return;

        let currentQ = monster.q;
        let currentR = monster.r;

        if (!monster._recentPositions) monster._recentPositions = [];

        const MAX_HISTORY = 6;

        // Losowanie prędkości (od 2 do 4)
        const speed = getRandomInt(2, 5); // Losowanie w przedziale 2-4

        for (let step = 0; step < speed; step++) {
            let bestMove = null;
            let bestDist = Infinity;

            for (const dir of directions) {
                let newQ = currentQ + dir.dq;
                let newR = currentR + dir.dr;

                if (currentQ % 2 !== 0) {
                    if (dir.dr === -1 && dir.dq === 1) newR = currentR;
                    if (dir.dr === 0 && dir.dq === 1) newR = currentR + 1;
                    if (dir.dr === 1 && dir.dq === -1) newR = currentR;
                    if (dir.dr === 0 && dir.dq === -1) newR = currentR + 1;
                } else {
                    if (dir.dr === -1 && dir.dq === -1) newR = currentR - 1;
                    if (dir.dr === 0 && dir.dq === -1) newR = currentR - 1;
                    if (dir.dr === -1 && dir.dq === 1) newR = currentR - 1;
                    if (dir.dr === 0 && dir.dq === 1) newR = currentR;
                }

                const hexKey = `${newQ},${newR}`;
                if (!mapData.has(hexKey)) continue;
                if (isObstacle(newQ, newR)) continue;
                if (isOccupied(newQ, newR)) continue;

                const wasRecentlyVisited = monster._recentPositions.some(pos => pos.q === newQ && pos.r === newR);
                if (wasRecentlyVisited) continue;

                const distToTarget = distance({ q: newQ, r: newR }, target);
                if (distToTarget < bestDist) {
                    bestDist = distToTarget;
                    bestMove = { q: newQ, r: newR };
                }
            }

            if (!bestMove) {
                for (const dir of directions) {
                    let newQ = currentQ + dir.dq;
                    let newR = currentR + dir.dr;

                    if (currentQ % 2 !== 0) {
                        if (dir.dr === -1 && dir.dq === 1) newR = currentR;
                        if (dir.dr === 0 && dir.dq === 1) newR = currentR + 1;
                        if (dir.dr === 1 && dir.dq === -1) newR = currentR;
                        if (dir.dr === 0 && dir.dq === -1) newR = currentR + 1;
                    } else {
                        if (dir.dr === -1 && dir.dq === -1) newR = currentR - 1;
                        if (dir.dr === 0 && dir.dq === -1) newR = currentR - 1;
                        if (dir.dr === -1 && dir.dq === 1) newR = currentR - 1;
                        if (dir.dr === 0 && dir.dq === 1) newR = currentR;
                    }

                    const hexKey = `${newQ},${newR}`;
                    if (!mapData.has(hexKey)) continue;
                    if (isObstacle(newQ, newR)) continue;
                    if (isOccupied(newQ, newR)) continue;

                    bestMove = { q: newQ, r: newR };
                    break;
                }
            }

            if (!bestMove) break;
            currentQ = bestMove.q;
            currentR = bestMove.r;
        }

        const moved = currentQ !== monster.q || currentR !== monster.r;

        if (moved) {
            monster._recentPositions.push({ q: currentQ, r: currentR });
            if (monster._recentPositions.length > MAX_HISTORY) monster._recentPositions.shift();
        } else if (monster._recentPositions.length >= MAX_HISTORY) {
            monster._recentPositions.shift();
        }

        monster.q = currentQ;
        monster.r = currentR;
    }

    const context = {
        moveToward,
        distance,
        directions,
        isObstacle,
        isOccupied,
        getRandomPumpkin: (exclude = null) => pumpkins.filter(p => !exclude || (p.q !== exclude.q || p.r !== exclude.r))[Math.floor(Math.random() * pumpkins.length)],
        mapData,
        area,
        players,
        monsters
    };

    for (const monster of monsters) {
        monster.trail.push({ q: monster.q, r: monster.r });

        const behavior = monster.behaviors[0];
        switch (behavior) {
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
    }
}
