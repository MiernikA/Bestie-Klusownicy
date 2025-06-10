export function fellowshipBehavior(monster, { monsters, moveToward, distance }) {
    const others = monsters.filter(m => m.id !== monster.id);
    if (others.length === 0) return;

    const nearest = others.reduce((closest, m) =>
        !closest || distance(monster, m) < distance(monster, closest) ? m : closest,
        null
    );

    if (!nearest) return;

    const dist = distance(monster, nearest);
    if (dist > 1) {
        moveToward(monster, nearest);
    }
}