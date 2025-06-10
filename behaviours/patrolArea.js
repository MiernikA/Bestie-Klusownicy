export function patrolAreaBehavior(monster, { area, moveToward }) {
    if (!monster.currentPatrolIndex) monster.currentPatrolIndex = 0;

    const target = area[monster.currentPatrolIndex];
    if (monster.q === target.q && monster.r === target.r) {
        monster.currentPatrolIndex = (monster.currentPatrolIndex + 1) % area.length;
    }

    moveToward(monster, area[monster.currentPatrolIndex]);
}