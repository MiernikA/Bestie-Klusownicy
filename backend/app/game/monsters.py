import random

from app.game.board import get_all_tiles, is_valid_tile
from app.game.pathfinding import get_neighbors, hex_distance

PUMPKINS = [
    {"col": 27, "row": 21},
    {"col": 8, "row": 11},
    {"col": 17, "row": 3},
]

DIRECTION_OFFSETS = [
    {"col": 0, "row": -1},
    {"col": 1, "row": -1},
    {"col": 1, "row": 0},
    {"col": 0, "row": 1},
    {"col": -1, "row": 0},
    {"col": -1, "row": -1},
]

AVAILABLE_BEHAVIORS = [
    "fellowship",
    "seek_furthest",
    "patrol_area",
    "pumpkin_lover",
    "traveller",
    "predator",
]
MAX_MONSTER_TRAIL_LENGTH = 8


def create_initial_monsters() -> list[dict]:
    monsters = [
        {"id": "1", "type": "monster", "col": 15, "row": 15, "speed": 2, "hp": 3, "trail": [], "behaviors": ["seek_furthest"], "color": "red"},
        {"id": "2", "type": "monster", "col": 13, "row": 13, "speed": 3, "hp": 3, "trail": [], "behaviors": ["pumpkin_lover"], "color": "blue"},
        {"id": "3", "type": "monster", "col": 17, "row": 10, "speed": 2, "hp": 3, "trail": [], "behaviors": ["traveller"], "color": "pink"},
        {"id": "4", "type": "monster", "col": 20, "row": 12, "speed": 3, "hp": 3, "trail": [], "behaviors": ["fellowship"], "color": "yellow"},
        {"id": "5", "type": "monster", "col": 19, "row": 14, "speed": 3, "hp": 3, "trail": [], "behaviors": ["predator"], "color": "cyan"},
        {"id": "6", "type": "monster", "col": 13, "row": 11, "speed": 4, "hp": 3, "trail": [], "behaviors": ["patrol_area"], "color": "navy"},
    ]

    available = AVAILABLE_BEHAVIORS[:]
    for monster in monsters:
        index = random.randrange(len(available))
        monster["behaviors"] = [available.pop(index)]

    return monsters


def move_monsters(monsters: list[dict], players: list[dict], obstacles: list[dict]) -> list[dict]:
    valid_tiles = get_all_tiles()
    area = _create_patrol_area(valid_tiles, obstacles)
    movement_records: list[dict] = []

    def is_obstacle(col: int, row: int) -> bool:
        return any(obstacle["col"] == col and obstacle["row"] == row for obstacle in obstacles)

    def is_occupied(col: int, row: int, active_monster_id: str) -> bool:
        return any(player["col"] == col and player["row"] == row for player in players) or any(
            monster["id"] != active_monster_id and monster["col"] == col and monster["row"] == row
            for monster in monsters
        )

    def get_random_pumpkin(exclude: dict | None = None) -> dict:
        candidates = [
            pumpkin
            for pumpkin in PUMPKINS
            if not exclude or pumpkin["col"] != exclude["col"] or pumpkin["row"] != exclude["row"]
        ]
        return random.choice(candidates)

    def move_toward(monster: dict, target: dict | None) -> None:
        if not target:
            return

        current_col = monster["col"]
        current_row = monster["row"]
        recent_positions = monster.setdefault("_recentPositions", [])
        max_history = 6
        speed = random.randrange(2, 5)

        for _ in range(speed):
            best_move = None
            best_distance = float("inf")

            for direction in DIRECTION_OFFSETS:
                next_tile = _get_monster_step({"col": current_col, "row": current_row}, direction)
                if not is_valid_tile(next_tile["col"], next_tile["row"]):
                    continue
                if is_obstacle(next_tile["col"], next_tile["row"]):
                    continue
                if is_occupied(next_tile["col"], next_tile["row"], monster["id"]):
                    continue
                if any(
                    position["col"] == next_tile["col"] and position["row"] == next_tile["row"]
                    for position in recent_positions
                ):
                    continue

                distance = hex_distance(next_tile, target)
                if distance < best_distance:
                    best_distance = distance
                    best_move = next_tile

            if not best_move:
                for neighbor in get_neighbors({"col": current_col, "row": current_row}):
                    if is_obstacle(neighbor["col"], neighbor["row"]):
                        continue
                    if is_occupied(neighbor["col"], neighbor["row"], monster["id"]):
                        continue
                    best_move = neighbor
                    break

            if not best_move:
                break

            current_col = best_move["col"]
            current_row = best_move["row"]

        moved = current_col != monster["col"] or current_row != monster["row"]
        if moved:
            recent_positions.append({"col": current_col, "row": current_row})
            if len(recent_positions) > max_history:
                recent_positions.pop(0)
        elif len(recent_positions) >= max_history:
            recent_positions.pop(0)

        monster["col"] = current_col
        monster["row"] = current_row

    context = {
        "area": area,
        "valid_tiles": valid_tiles,
        "is_obstacle": is_obstacle,
        "is_occupied": is_occupied,
        "move_toward": move_toward,
        "players": players,
        "monsters": monsters,
        "get_random_pumpkin": get_random_pumpkin,
    }

    for monster in monsters:
        from_tile = {"col": monster["col"], "row": monster["row"]}
        monster["trail"].append(from_tile.copy())
        if len(monster["trail"]) > MAX_MONSTER_TRAIL_LENGTH:
            monster["trail"] = monster["trail"][-MAX_MONSTER_TRAIL_LENGTH:]
        behavior = monster["behaviors"][0]
        if behavior == "seek_furthest":
            _seek_furthest(monster, context)
        elif behavior == "pumpkin_lover":
            _pumpkin_lover(monster, context)
        elif behavior == "patrol_area":
            _patrol_area(monster, context)
        elif behavior == "fellowship":
            _fellowship(monster, context)
        elif behavior == "traveller":
            _traveller(monster, context)
        elif behavior == "predator":
            _predator(monster, context)

        movement_records.append(
            {
                "actorId": monster["id"],
                "actorLabel": f'Bestia {monster["id"]}',
                "color": monster["color"],
                "from": from_tile,
                "to": {"col": monster["col"], "row": monster["row"]},
            }
        )

    return movement_records


def _get_monster_step(hex_: dict, direction: dict) -> dict:
    col = hex_["col"]
    row = hex_["row"]
    d_col = direction["col"]
    d_row = direction["row"]
    next_col = col + d_col
    next_row = row + d_row

    if col % 2 != 0:
        if d_row == -1 and d_col == 1:
            next_row = row
        if d_row == 0 and d_col == 1:
            next_row = row + 1
        if d_row == 1 and d_col == -1:
            next_row = row
        if d_row == 0 and d_col == -1:
            next_row = row + 1
    else:
        if d_row == -1 and d_col == -1:
            next_row = row - 1
        if d_row == 0 and d_col == -1:
            next_row = row - 1
        if d_row == -1 and d_col == 1:
            next_row = row - 1
        if d_row == 0 and d_col == 1:
            next_row = row

    return {"col": next_col, "row": next_row}


def _create_patrol_area(valid_tiles: list[dict], obstacles: list[dict]) -> list[dict]:
    area: list[dict] = []
    attempts = 0
    while len(area) < 6 and attempts < 200:
        attempts += 1
        col = random.randrange(11, 20)
        row = random.randrange(11, 20)
        exists = any(tile["col"] == col and tile["row"] == row for tile in valid_tiles)
        blocked = any(obstacle["col"] == col and obstacle["row"] == row for obstacle in obstacles)
        duplicate = any(tile["col"] == col and tile["row"] == row for tile in area)
        if exists and not blocked and not duplicate:
            area.append({"col": col, "row": row})
    return area or valid_tiles[:6]


def _seek_furthest(monster: dict, context: dict) -> None:
    players = context["players"]
    if not players:
        return
    target = max(players, key=lambda player: hex_distance(monster, player))
    context["move_toward"](monster, target)


def _pumpkin_lover(monster: dict, context: dict) -> None:
    if not monster.get("pumpkinTarget"):
        monster["pumpkinTarget"] = context["get_random_pumpkin"]()
        monster["waitAtPumpkin"] = False
    if hex_distance(monster, monster["pumpkinTarget"]) <= 1:
        if not monster.get("waitAtPumpkin"):
            monster["waitAtPumpkin"] = True
            return
        monster["pumpkinTarget"] = context["get_random_pumpkin"](monster["pumpkinTarget"])
        monster["waitAtPumpkin"] = False
    context["move_toward"](monster, monster["pumpkinTarget"])


def _fellowship(monster: dict, context: dict) -> None:
    others = [candidate for candidate in context["monsters"] if candidate["id"] != monster["id"]]
    if not others:
        return
    nearest = min(others, key=lambda candidate: hex_distance(monster, candidate))
    if hex_distance(monster, nearest) > 1:
        context["move_toward"](monster, nearest)


def _traveller(monster: dict, context: dict) -> None:
    if not monster.get("travellerTargets"):
        candidates = [
            tile
            for tile in context["valid_tiles"]
            if not context["is_obstacle"](tile["col"], tile["row"])
        ]
        random.shuffle(candidates)
        monster["travellerTargets"] = candidates[:6]
        monster["currentTravellerIndex"] = 0

    index = monster.get("currentTravellerIndex", 0)
    target = monster["travellerTargets"][index]
    if monster["col"] == target["col"] and monster["row"] == target["row"]:
        monster["currentTravellerIndex"] = (index + 1) % len(monster["travellerTargets"])
    context["move_toward"](
        monster,
        monster["travellerTargets"][monster.get("currentTravellerIndex", 0)],
    )


def _patrol_area(monster: dict, context: dict) -> None:
    if monster.get("currentPatrolIndex") is None:
        monster["currentPatrolIndex"] = 0
    target = context["area"][monster["currentPatrolIndex"]]
    if monster["col"] == target["col"] and monster["row"] == target["row"]:
        monster["currentPatrolIndex"] = (monster["currentPatrolIndex"] + 1) % len(context["area"])
    context["move_toward"](monster, context["area"][monster["currentPatrolIndex"]])


def _predator(monster: dict, context: dict) -> None:
    visible_players = [
        player for player in context["players"] if hex_distance(monster, player) <= 10
    ]
    if visible_players:
        target = min(visible_players, key=lambda player: hex_distance(monster, player))
        if hex_distance(monster, target) > 1:
            context["move_toward"](monster, target)
        return

    shuffled = DIRECTION_OFFSETS[:]
    random.shuffle(shuffled)
    for direction in shuffled:
        next_tile = _get_monster_step(monster, direction)
        if not is_valid_tile(next_tile["col"], next_tile["row"]):
            continue
        if context["is_obstacle"](next_tile["col"], next_tile["row"]):
            continue
        if context["is_occupied"](next_tile["col"], next_tile["row"], monster["id"]):
            continue
        monster["col"] = next_tile["col"]
        monster["row"] = next_tile["row"]
        return
