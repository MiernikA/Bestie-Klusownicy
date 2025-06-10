export function seekFurthestBehavior(monster, { players, moveToward, distance }) {
    const target = players.reduce((furthest, p) =>
        !furthest || distance(monster, p) > distance(monster, furthest) ? p : furthest,
        null
    );
    if (target) moveToward(monster, target);
} 