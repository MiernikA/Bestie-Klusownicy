export type Vec = { x: number; y: number };

export type Monster = {
  id: string;
  name: string;
  pos: Vec;
  vel: Vec;
  speed: number;
  colour?: string;
  behaviour: (m: Monster, others: Monster[]) => Vec;
};
