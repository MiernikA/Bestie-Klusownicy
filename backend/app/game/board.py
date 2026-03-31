COLS = 36
ROWS = 24


def get_rows_for_column(col: int) -> int:
    return ROWS - 1 if col % 2 != 0 else ROWS


def is_valid_tile(col: int, row: int) -> bool:
    return 0 <= col < COLS and 1 <= row <= get_rows_for_column(col)


def get_all_tiles() -> list[dict[str, int]]:
    tiles: list[dict[str, int]] = []
    for col in range(COLS):
        for row in range(1, get_rows_for_column(col) + 1):
            tiles.append({"col": col, "row": row})
    return tiles
