import type { Monster } from "../types";

export const name = "patrolArea";

const center = { x: 320, y: 240 };
const radius = 120;

export function behaviour(m: Monster, others: Monster[]) {
  // try to orbit around center
  const dx = m.pos.x - center.x;
  const dy = m.pos.y - center.y;
  const angle = Math.atan2(dy, dx) + 0.02;
  const target = {
    x: center.x + Math.cos(angle) * radius,
    y: center.y + Math.sin(angle) * radius,
  };
  const tx = target.x - m.pos.x;
  const ty = target.y - m.pos.y;
  const len = Math.hypot(tx, ty) || 1;
  return { x: (tx / len) * m.speed, y: (ty / len) * m.speed };
}
