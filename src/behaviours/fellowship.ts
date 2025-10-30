import type { Monster } from "../types";

export const name = "fellowship";

export function behaviour(m: Monster, others: Monster[]) {
  // move slightly toward the average position of others
  if (others.length === 0) return m.vel;
  const avg = others.reduce(
    (acc, o) => ({ x: acc.x + o.pos.x, y: acc.y + o.pos.y }),
    { x: 0, y: 0 }
  );
  avg.x /= others.length;
  avg.y /= others.length;
  const dx = avg.x - m.pos.x;
  const dy = avg.y - m.pos.y;
  const len = Math.hypot(dx, dy) || 1;
  return { x: (dx / len) * m.speed * 0.5, y: (dy / len) * m.speed * 0.5 };
}
