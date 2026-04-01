from __future__ import annotations

from copy import deepcopy

from sqlalchemy.orm import Session

from app.game.monsters import move_monsters
from app.game.pathfinding import find_path, get_neighbors, get_reachable_by_path
from app.game.seeds import create_initial_entities
from app.models import GameSessionModel

MAX_COMBAT_LOG_ENTRIES = 30
MAX_UNDO_HISTORY_ENTRIES = 20
DERIVED_STATE_KEYS = {"turnIndicator", "canTriggerMonsterTurn", "canUndoMove", "currentTurnColor"}


def _clone_state(state: dict) -> dict:
    return deepcopy(state)


def _persistable_state(state: dict) -> dict:
    return {
        key: deepcopy(value)
        for key, value in state.items()
        if key not in DERIVED_STATE_KEYS
    }


def _living_players(state: dict) -> list[dict]:
    return [entity for entity in state["entitiesData"] if entity["type"] == "player"]


def _current_player(state: dict) -> dict | None:
    return next(
        (player for player in _living_players(state) if player["color"] == state["currentPlayerColor"]),
        None,
    )


INITIAL_PLAYERS = {
    player["color"]: player for player in create_initial_entities() if player["type"] == "player"
}


def build_initial_state() -> dict:
    state = {
        "entitiesData": create_initial_entities(),
        "reachable": [],
        "hoveredPath": [],
        "lastPlayerMove": None,
        "lastMonsterMoves": [],
        "phase": "players",
        "movedPlayers": [],
        "currentPlayerColor": "blue",
        "pendingKillPlayer": None,
        "pendingRemoveMonster": None,
        "lastRemovedMonsterInfo": None,
        "deadPlayers": [],
        "combatLog": [],
        "nextLogId": 1,
        "history": [],
    }
    _select_current_player(state)
    return state


def get_or_create_session(db: Session, session_id: str = "default") -> GameSessionModel:
    session = db.get(GameSessionModel, session_id)
    if session:
        return session
    session = GameSessionModel(id=session_id, state=build_initial_state())
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def save_state(db: Session, session: GameSessionModel, state: dict) -> dict:
    session.state = _persistable_state(state)
    db.add(session)
    db.commit()
    db.refresh(session)
    return _decorate_state(state)


def get_state(db: Session, session_id: str = "default") -> dict:
    return _decorate_state(get_or_create_session(db, session_id).state)


def reset_board(db: Session, session_id: str = "default") -> dict:
    session = get_or_create_session(db, session_id)
    return save_state(db, session, build_initial_state())


def select_player(db: Session, color: str, session_id: str = "default") -> dict:
    session = get_or_create_session(db, session_id)
    state = _clone_state(session.state)
    entity = next(
        (
            candidate
            for candidate in state["entitiesData"]
            if candidate["type"] == "player" and candidate["color"] == color
        ),
        None,
    )
    if entity and state["phase"] == "players" and state["currentPlayerColor"] == color:
        _select_player(state, entity, force=True)
    return _decorate_state(state)


def hover_hex(db: Session, col: int, row: int, session_id: str = "default") -> dict:
    session = get_or_create_session(db, session_id)
    state = _clone_state(session.state)
    selected = _selected_player_from_state(state)
    if selected:
        state["hoveredPath"] = find_path(
            {"col": selected["col"], "row": selected["row"]},
            {"col": col, "row": row},
            state["reachable"],
        )
    return _decorate_state(state)


def click_hex(db: Session, col: int, row: int, session_id: str = "default") -> dict:
    session = get_or_create_session(db, session_id)
    state = _clone_state(session.state)
    selected = _selected_player_from_state(state)
    if not selected:
        return _decorate_state(state)

    target = next(
        (hex_ for hex_ in state["reachable"] if hex_["col"] == col and hex_["row"] == row),
        None,
    )
    if not target:
        return _decorate_state(state)

    path = find_path(
        {"col": selected["col"], "row": selected["row"]},
        {"col": col, "row": row},
        state["reachable"],
    )
    if not path or len(path) > 5:
        return _decorate_state(state)

    _save_snapshot(state)
    from_tile = {"col": selected["col"], "row": selected["row"]}
    selected["col"] = col
    selected["row"] = row
    state["lastPlayerMove"] = {
        "actorId": selected["color"],
        "actorLabel": f'Gracz {selected["color"]}',
        "color": selected["color"],
        "from": from_tile,
        "to": {"col": col, "row": row},
    }
    _push_combat_log(
        state,
        "move",
        f'Player {selected.get("name") or selected["color"]} moved from ({from_tile["col"]}, {from_tile["row"]}) to ({col}, {row}).',
    )
    state["movedPlayers"] = list(dict.fromkeys([*state["movedPlayers"], selected["color"]]))
    _clear_selection_state(state)
    _update_turn_after_player_action(state)
    return save_state(db, session, state)


def undo_move(db: Session, session_id: str = "default") -> dict:
    session = get_or_create_session(db, session_id)
    state = _clone_state(session.state)
    if not state["history"]:
        return _decorate_state(state)
    snapshot = state["history"].pop()
    restored = _restore_snapshot(snapshot, state["history"])
    return save_state(db, session, restored)


def trigger_monster_turn(db: Session, session_id: str = "default") -> dict:
    session = get_or_create_session(db, session_id)
    state = _clone_state(session.state)

    monsters = [entity for entity in state["entitiesData"] if entity["type"] == "monster"]
    players = [entity for entity in state["entitiesData"] if entity["type"] == "player"]
    obstacles = [entity for entity in state["entitiesData"] if entity["type"] == "obstacle"]

    _save_snapshot(state)
    state["lastMonsterMoves"] = move_monsters(monsters, players, obstacles)
    for move in state["lastMonsterMoves"]:
        from_tile = move["from"]
        to_tile = move["to"]
        moved = from_tile["col"] != to_tile["col"] or from_tile["row"] != to_tile["row"]
        _push_combat_log(
            state,
            "move",
            f'Monster #{move["actorId"]} moved from ({from_tile["col"]}, {from_tile["row"]}) to ({to_tile["col"]}, {to_tile["row"]}).'
            if moved
            else f'Monster #{move["actorId"]} stayed on ({to_tile["col"]}, {to_tile["row"]}).',
        )

    for monster in monsters:
        adjacent = [
            neighbor
            for neighbor in get_neighbors({"col": monster["col"], "row": monster["row"]})
            if any(
                player["col"] == neighbor["col"] and player["row"] == neighbor["row"]
                for player in players
            )
        ]
        for target in adjacent:
            attacked = next(
                (
                    player
                    for player in players
                    if player["col"] == target["col"] and player["row"] == target["row"]
                ),
                None,
            )
            if attacked:
                _push_combat_log(
                    state,
                    "attack",
                    f'Monster #{monster["id"]} attacks {attacked.get("name") or attacked["color"]} near ({attacked["col"]}, {attacked["row"]}).',
                )

    state["movedPlayers"] = []
    state["phase"] = "players"
    state["currentPlayerColor"] = _living_players(state)[0]["color"] if _living_players(state) else None
    _select_current_player(state)
    return save_state(db, session, state)


def kill_player(db: Session, color: str, session_id: str = "default") -> dict:
    session = get_or_create_session(db, session_id)
    state = _clone_state(session.state)
    entity = next(
        (
            candidate
            for candidate in state["entitiesData"]
            if candidate["type"] == "player" and candidate["color"] == color
        ),
        None,
    )
    if not entity:
        return save_state(db, session, state)

    was_current = state["currentPlayerColor"] == entity["color"]
    _save_snapshot(state)
    state["entitiesData"] = [candidate for candidate in state["entitiesData"] if candidate is not entity]
    state["movedPlayers"] = [
        player_color for player_color in state["movedPlayers"] if player_color != entity["color"]
    ]
    state["deadPlayers"].append(deepcopy(entity))
    if state["lastPlayerMove"] and state["lastPlayerMove"]["actorId"] == entity["color"]:
        state["lastPlayerMove"] = None
    if was_current and state["phase"] == "players":
        _update_turn_after_player_action(state)
    elif state["phase"] == "players" and not _current_player(state):
        state["currentPlayerColor"] = _living_players(state)[0]["color"] if _living_players(state) else None
        _select_current_player(state)
    return save_state(db, session, state)


def remove_monster(db: Session, monster_id: str, session_id: str = "default") -> dict:
    session = get_or_create_session(db, session_id)
    state = _clone_state(session.state)
    entity = next(
        (
            candidate
            for candidate in state["entitiesData"]
            if candidate["type"] == "monster" and candidate["id"] == monster_id
        ),
        None,
    )
    if not entity:
        return save_state(db, session, state)

    _save_snapshot(state)
    state["entitiesData"] = [candidate for candidate in state["entitiesData"] if candidate is not entity]
    state["lastMonsterMoves"] = [
        move for move in state["lastMonsterMoves"] if move["actorId"] != entity["id"]
    ]
    state["lastRemovedMonsterInfo"] = {"id": entity["id"], "behavior": entity["behaviors"][0]}
    _clear_selection(state)
    return save_state(db, session, state)


def revive_player(db: Session, color: str, session_id: str = "default") -> dict:
    session = get_or_create_session(db, session_id)
    state = _clone_state(session.state)
    template = INITIAL_PLAYERS.get(color)
    if not template:
        return save_state(db, session, state)

    state["deadPlayers"] = [player for player in state["deadPlayers"] if player["color"] != color]
    state["entitiesData"].append(deepcopy(template))
    state["movedPlayers"] = [player_color for player_color in state["movedPlayers"] if player_color != color]
    state["phase"] = "players"
    state["currentPlayerColor"] = color
    _select_current_player(state)
    return save_state(db, session, state)


def clear_removed_monster_info(db: Session, session_id: str = "default") -> dict:
    session = get_or_create_session(db, session_id)
    state = _clone_state(session.state)
    state["lastRemovedMonsterInfo"] = None
    return save_state(db, session, state)


def _save_snapshot(state: dict) -> None:
    snapshot = {
        "entitiesData": deepcopy(state["entitiesData"]),
        "reachable": deepcopy(state["reachable"]),
        "hoveredPath": deepcopy(state["hoveredPath"]),
        "lastPlayerMove": deepcopy(state["lastPlayerMove"]),
        "lastMonsterMoves": deepcopy(state["lastMonsterMoves"]),
        "phase": state["phase"],
        "movedPlayers": deepcopy(state["movedPlayers"]),
        "currentPlayerColor": state["currentPlayerColor"],
        "deadPlayers": deepcopy(state["deadPlayers"]),
        "lastRemovedMonsterInfo": deepcopy(state["lastRemovedMonsterInfo"]),
        "combatLog": deepcopy(state["combatLog"]),
        "nextLogId": state["nextLogId"],
    }
    state["history"].append(snapshot)
    if len(state["history"]) > MAX_UNDO_HISTORY_ENTRIES:
        state["history"] = state["history"][-MAX_UNDO_HISTORY_ENTRIES:]


def _restore_snapshot(snapshot: dict, history: list[dict]) -> dict:
    state = {
        **deepcopy(snapshot),
        "pendingKillPlayer": None,
        "pendingRemoveMonster": None,
        "history": history,
    }
    if state["phase"] == "players" and state["currentPlayerColor"]:
        _select_current_player(state)
    return state


def _push_combat_log(state: dict, entry_type: str, message: str) -> None:
    state["combatLog"].append({"id": state["nextLogId"], "type": entry_type, "message": message})
    if len(state["combatLog"]) > MAX_COMBAT_LOG_ENTRIES:
        state["combatLog"] = state["combatLog"][-MAX_COMBAT_LOG_ENTRIES:]
    state["nextLogId"] += 1


def _selected_player_from_state(state: dict) -> dict | None:
    current = _current_player(state)
    if not current or state["phase"] != "players":
        return None
    return current


def _clear_selection_state(state: dict) -> None:
    state["reachable"] = []
    state["hoveredPath"] = []


def _clear_selection(state: dict) -> None:
    if state["phase"] == "players" and _current_player(state):
        _select_current_player(state)
    else:
        _clear_selection_state(state)


def _select_player(state: dict, entity: dict, force: bool = False) -> None:
    if state["phase"] != "players":
        return
    if not force and entity["color"] != state["currentPlayerColor"]:
        return
    blocked = {
        f'{candidate["col"]},{candidate["row"]}'
        for candidate in state["entitiesData"]
        if candidate["type"] in {"obstacle", "monster"}
        or (candidate["type"] == "player" and candidate is not entity)
    }
    state["reachable"] = get_reachable_by_path(
        {"col": entity["col"], "row": entity["row"]},
        4,
        blocked,
    )
    state["hoveredPath"] = []


def _select_current_player(state: dict) -> None:
    current = _current_player(state)
    if not current or state["phase"] != "players":
        _clear_selection_state(state)
        return
    _select_player(state, current, force=True)


def _update_turn_after_player_action(state: dict) -> None:
    living_players = _living_players(state)
    if not living_players:
        state["currentPlayerColor"] = None
        state["phase"] = "monsters"
        _clear_selection_state(state)
        return

    remaining = [player for player in living_players if player["color"] not in state["movedPlayers"]]
    if not remaining:
        state["phase"] = "monsters"
        state["currentPlayerColor"] = None
        _clear_selection_state(state)
        return

    state["phase"] = "players"
    state["currentPlayerColor"] = remaining[0]["color"]
    _select_current_player(state)


def _decorate_state(state: dict) -> dict:
    has_undo_history = len(state.get("history", [])) > 0
    decorated = {
        key: deepcopy(value)
        for key, value in state.items()
        if key != "history"
    }
    decorated["history"] = []
    current_player = _current_player(decorated)
    if decorated["phase"] == "monsters":
        indicator = {
            "title": "Monster turn",
            "subtitle": "Run the monsters to finish the round.",
        }
    elif not current_player:
        indicator = {
            "title": "No active player",
            "subtitle": "All players were removed or the round has ended.",
        }
    else:
        indicator = {
            "title": f'Player turn: {current_player.get("name") or current_player["color"]}',
            "subtitle": "Only the active player can move now.",
        }

    decorated["turnIndicator"] = indicator
    decorated["canTriggerMonsterTurn"] = decorated["phase"] == "monsters"
    decorated["canUndoMove"] = has_undo_history
    decorated["currentTurnColor"] = current_player["color"] if current_player else None
    return decorated
