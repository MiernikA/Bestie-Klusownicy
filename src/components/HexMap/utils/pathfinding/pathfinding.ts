import {getNeighbors, type Hex} from "./getNeighbors";


function hexDistance(a: Hex, b: Hex): number {
    const ax = a.col;
    const az = a.row - (a.col - (a.col & 1)) / 2;
    const ay = -ax - az;
    const bx = b.col;
    const bz = b.row - (b.col - (b.col & 1)) / 2;
    const by = -bx - bz;
    return Math.max(Math.abs(ax - bx), Math.abs(ay - by), Math.abs(az - bz));
}


export function getReachableByPath(
    start: Hex,
    range: number,
    blocked: Set<string>
): Hex[] {
    const visited = new Set<string>();
    const queue: { hex: Hex; dist: number }[] = [{hex: start, dist: 0}];
    const result: Hex[] = [];

    while (queue.length > 0) {
        const {hex, dist} = queue.shift()!;
        const key = `${hex.col},${hex.row}`;
        if (visited.has(key)) continue;
        visited.add(key);
        result.push(hex);

        if (dist >= range) continue;

        for (const n of getNeighbors(hex)) {
            const nKey = `${n.col},${n.row}`;
            if (!blocked.has(nKey) && !visited.has(nKey)) {
                queue.push({hex: n, dist: dist + 1});
            }
        }
    }

    return result;
}


export function findPath(start: Hex, end: Hex, allowed: Hex[]): Hex[] {
    const allowedSet = new Set(allowed.map((h) => `${h.col},${h.row}`));
    const open: Hex[] = [start];
    const cameFrom = new Map<string, string>();
    const gScore = new Map<string, number>();
    const fScore = new Map<string, number>();

    const startKey = `${start.col},${start.row}`;
    gScore.set(startKey, 0);
    fScore.set(startKey, hexDistance(start, end));

    while (open.length > 0) {
        const current = open.reduce((a, b) =>
            (fScore.get(`${a.col},${a.row}`) ?? Infinity) <
            (fScore.get(`${b.col},${b.row}`) ?? Infinity)
                ? a
                : b
        );

        if (current.col === end.col && current.row === end.row) {
            return reconstruct(cameFrom, current);
        }

        open.splice(open.indexOf(current), 1);
        const currentKey = `${current.col},${current.row}`;

        for (const n of getNeighbors(current)) {
            const key = `${n.col},${n.row}`;
            if (!allowedSet.has(key)) continue;

            const tentativeG = (gScore.get(currentKey) ?? Infinity) + 1;
            if (tentativeG < (gScore.get(key) ?? Infinity)) {
                cameFrom.set(key, currentKey);
                gScore.set(key, tentativeG);
                fScore.set(key, tentativeG + hexDistance(n, end));
                if (!open.some((x) => x.col === n.col && x.row === n.row)) {
                    open.push(n);
                }
            }
        }
    }

    return [];
}


function reconstruct(cameFrom: Map<string, string>, current: Hex): Hex[] {
    const totalPath = [current];
    let currentKey = `${current.col},${current.row}`;
    while (cameFrom.has(currentKey)) {
        const prev = cameFrom.get(currentKey)!;
        const [col, row] = prev.split(",").map(Number);
        totalPath.unshift({col, row});
        currentKey = prev;
    }
    return totalPath;
}
