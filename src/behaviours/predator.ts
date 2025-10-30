import type { Monster } from "../types";

export const name = "predator";

export function behaviour(m: Monster, others: Monster[]) {
  // chase the closest other monster
  if (others.length === 0) return m.vel;
  let closest = others[0];
  let best = Infinity;
  for (const o of others) {
    const d = Math.hypot(o.pos.x - m.pos.x, o.pos.y - m.pos.y);
    if (d < best) {
      best = d;
      closest = o;
    }
  }
  const dx = closest.pos.x - m.pos.x;
  const dy = closest.pos.y - m.pos.y;
  const len = Math.hypot(dx, dy) || 1;
  return { x: (dx / len) * m.speed, y: (dy / len) * m.speed };
}
