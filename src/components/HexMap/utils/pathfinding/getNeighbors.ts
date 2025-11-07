export type Hex = { col: number; row: number };

export function getNeighbors(hex: Hex): Hex[] {
    const {col, row} = hex;
    const isOdd = col % 2 !== 0;

    const directions = isOdd
        ? [
            {col: col + 1, row: row},     // E
            {col: col + 1, row: row + 1}, // SE
            {col: col, row: row + 1},     // SW
            {col: col - 1, row: row + 1}, // W
            {col: col - 1, row: row},     // NW
            {col: col, row: row - 1},     // NE
        ]
        : [
            {col: col + 1, row: row - 1}, // E
            {col: col + 1, row: row},     // SE
            {col: col, row: row + 1},     // SW
            {col: col - 1, row: row},     // W
            {col: col - 1, row: row - 1}, // NW
            {col: col, row: row - 1},     // NE
        ];

    return directions;
}
