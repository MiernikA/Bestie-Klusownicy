export type BaseEntity = {
    type: "player" | "monster" | "obstacle";
    col: number;
    row: number;
};

export type PlayerEntity = BaseEntity & {
    type: "player";
    color: string;
    name?: string;
};

export type MonsterEntity = BaseEntity & {
    type: "monster";
    hp: number;
};

export type ObstacleEntity = BaseEntity & {
    type: "obstacle";
    solid: boolean;
};

export type Entity = PlayerEntity | MonsterEntity | ObstacleEntity;
