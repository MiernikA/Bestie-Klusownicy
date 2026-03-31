export type Hex = {
    col: number;
    row: number;
};

export type MovementRecord = {
    actorId: string;
    actorLabel: string;
    color: string;
    from: Hex;
    to: Hex;
};
