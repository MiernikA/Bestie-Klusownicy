from collections import deque

from app.game.board import is_valid_tile


def hex_distance(a: dict[str, int], b: dict[str, int]) -> int:
    ax = a["col"]
    az = a["row"] - (a["col"] - (a["col"] & 1)) / 2
    ay = -ax - az
    bx = b["col"]
    bz = b["row"] - (b["col"] - (b["col"] & 1)) / 2
    by = -bx - bz
    return int(max(abs(ax - bx), abs(ay - by), abs(az - bz)))


def get_neighbors(hex_: dict[str, int]) -> list[dict[str, int]]:
    col = hex_["col"]
    row = hex_["row"]
    is_odd = col % 2 != 0
    directions = (
        [
            {"col": col + 1, "row": row},
            {"col": col + 1, "row": row + 1},
            {"col": col, "row": row + 1},
            {"col": col - 1, "row": row + 1},
            {"col": col - 1, "row": row},
            {"col": col, "row": row - 1},
        ]
        if is_odd
        else [
            {"col": col + 1, "row": row - 1},
            {"col": col + 1, "row": row},
            {"col": col, "row": row + 1},
            {"col": col - 1, "row": row},
            {"col": col - 1, "row": row - 1},
            {"col": col, "row": row - 1},
        ]
    )
    return [neighbor for neighbor in directions if is_valid_tile(neighbor["col"], neighbor["row"])]


def get_reachable_by_path(
    start: dict[str, int],
    movement_range: int,
    blocked: set[str],
) -> list[dict[str, int]]:
    visited: set[str] = set()
    queue = deque([(start, 0)])
    result: list[dict[str, int]] = []

    while queue:
        hex_, dist = queue.popleft()
        key = f'{hex_["col"]},{hex_["row"]}'
        if key in visited:
            continue
        visited.add(key)
        result.append(hex_)

        if dist >= movement_range:
            continue

        for neighbor in get_neighbors(hex_):
            neighbor_key = f'{neighbor["col"]},{neighbor["row"]}'
            if neighbor_key not in blocked and neighbor_key not in visited:
                queue.append((neighbor, dist + 1))

    return result


def find_path(
    start: dict[str, int],
    end: dict[str, int],
    allowed: list[dict[str, int]],
) -> list[dict[str, int]]:
    allowed_set = {f'{hex_["col"]},{hex_["row"]}' for hex_ in allowed}
    open_nodes = [start]
    came_from: dict[str, str] = {}
    g_score = {f'{start["col"]},{start["row"]}': 0}
    f_score = {f'{start["col"]},{start["row"]}': hex_distance(start, end)}

    while open_nodes:
        current = min(
            open_nodes,
            key=lambda node: f_score.get(f'{node["col"]},{node["row"]}', float("inf")),
        )

        if current["col"] == end["col"] and current["row"] == end["row"]:
            return _reconstruct_path(came_from, current)

        open_nodes.remove(current)
        current_key = f'{current["col"]},{current["row"]}'

        for neighbor in get_neighbors(current):
            key = f'{neighbor["col"]},{neighbor["row"]}'
            if key not in allowed_set:
                continue

            tentative_g = g_score.get(current_key, float("inf")) + 1
            if tentative_g < g_score.get(key, float("inf")):
                came_from[key] = current_key
                g_score[key] = tentative_g
                f_score[key] = tentative_g + hex_distance(neighbor, end)
                if neighbor not in open_nodes:
                    open_nodes.append(neighbor)

    return []


def _reconstruct_path(came_from: dict[str, str], current: dict[str, int]) -> list[dict[str, int]]:
    path = [current]
    current_key = f'{current["col"]},{current["row"]}'
    while current_key in came_from:
        prev = came_from[current_key]
        col, row = prev.split(",")
        path.insert(0, {"col": int(col), "row": int(row)})
        current_key = prev
    return path
