import type { Monster } from "../types";

export const name = "pumpkinLover";

export function behaviour(m: Monster, others: Monster[]) {
  // wander but prefer the bottom-right corner ("pumpkin patch")
  const goal = { x: 560, y: 380 };
  const dx = goal.x - m.pos.x;
  const dy = goal.y - m.pos.y;
  const len = Math.hypot(dx, dy) || 1;
  const wander = {
    x: (Math.random() - 0.5) * m.speed,
    y: (Math.random() - 0.5) * m.speed,
  };
  return {
    x: (dx / len) * (m.speed * 0.6) + wander.x * 0.4,
    y: (dy / len) * (m.speed * 0.6) + wander.y * 0.4,
  };
}
