import type { Monster } from "../types";

export const name = "seekFurthest";

export function behaviour(m: Monster, others: Monster[]) {
  // move away from the group center (seek furthest away)
  if (others.length === 0) return m.vel;
  const avg = others.reduce(
    (acc, o) => ({ x: acc.x + o.pos.x, y: acc.y + o.pos.y }),
    { x: 0, y: 0 }
  );
  avg.x /= others.length;
  avg.y /= others.length;
  const dx = m.pos.x - avg.x;
  const dy = m.pos.y - avg.y;
  const len = Math.hypot(dx, dy) || 1;
  return { x: (dx / len) * m.speed * 0.9, y: (dy / len) * m.speed * 0.9 };
}
