import type { Monster } from "../types";

export const name = "traveller";

export function behaviour(m: Monster, others: Monster[]) {
  // simple: keep current velocity
  return m.vel;
}
