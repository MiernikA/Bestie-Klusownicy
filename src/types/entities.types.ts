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
    id: string;
    color: string;
    speed: number;
    trail: { col: number; row: number }[];
    behaviors: MonsterBehavior[];
    _recentPositions?: { col: number; row: number }[];
    pumpkinTarget?: { col: number; row: number };
    waitAtPumpkin?: boolean;
    travellerTargets?: { col: number; row: number }[];
    currentTravellerIndex?: number;
    currentPatrolIndex?: number;
};

export type ObstacleEntity = BaseEntity & {
    type: "obstacle";
    col: number;
    row: number;
};

export type Entity = PlayerEntity | MonsterEntity | ObstacleEntity;

export type MonsterBehavior =
    | "fellowship"
    | "seek_furthest"
    | "patrol_area"
    | "pumpkin_lover"
    | "traveller"
    | "predator";
