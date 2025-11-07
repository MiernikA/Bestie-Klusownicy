import type { Entity } from "@/types/entities.types";

export const entities: Entity[] = [
    { type: "player", col: 3, row: 2, color: "blue" },
    { type: "player", col: 32, row: 2, color: "red" },
    { type: "player", col: 32, row: 23, color: "green" },
    { type: "player", col: 3, row: 22, color: "yellow" },


    { type: "obstacle", col: 10, row: 5 },
    { type: "obstacle", col: 11, row: 5 },
    { type: "obstacle", col: 12, row: 6 },
];
