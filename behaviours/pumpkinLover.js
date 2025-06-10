export function pumpkinLoverBehavior(monster, { pumpkins, getRandomPumpkin, moveToward, distance }) {
    if (!monster.pumpkinTarget) {
        monster.pumpkinTarget = getRandomPumpkin();
        monster.waitAtPumpkin = false;
    }

    const distToPumpkin = distance(monster, monster.pumpkinTarget);
    const isAdjacent = distToPumpkin <= 1;

    if (isAdjacent) {
        if (!monster.waitAtPumpkin) {
            monster.waitAtPumpkin = true;
            return;
        } else {
            monster.pumpkinTarget = getRandomPumpkin(monster.pumpkinTarget);
            monster.waitAtPumpkin = false;
        }
    }

    moveToward(monster, monster.pumpkinTarget);
}