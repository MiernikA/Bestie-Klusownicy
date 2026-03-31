from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect
from fastapi.concurrency import run_in_threadpool
from sqlalchemy.orm import Session

from app.db import SessionLocal, get_db
from app.game import service
from app.schemas import (
    HexRequest,
    MonsterIdRequest,
    PlayerColorRequest,
    SessionEnvelope,
    SessionRequest,
)
from app.websockets import session_ws_manager

router = APIRouter()


@router.get("/health")
def healthcheck() -> dict:
    return {"status": "ok"}


@router.post("/game/state", response_model=SessionEnvelope)
async def get_state(payload: SessionRequest, db: Session = Depends(get_db)):
    state = await run_in_threadpool(service.get_state, db, payload.sessionId)
    return {"sessionId": payload.sessionId, "state": state}


@router.post("/game/reset", response_model=SessionEnvelope)
async def reset_board(payload: SessionRequest, db: Session = Depends(get_db)):
    state = await run_in_threadpool(service.reset_board, db, payload.sessionId)
    await session_ws_manager.broadcast_state(payload.sessionId, state)
    return {"sessionId": payload.sessionId, "state": state}


@router.post("/game/select-player", response_model=SessionEnvelope)
async def select_player(payload: PlayerColorRequest, db: Session = Depends(get_db)):
    state = await run_in_threadpool(service.select_player, db, payload.color, payload.sessionId)
    return {"sessionId": payload.sessionId, "state": state}


@router.post("/game/hover-hex", response_model=SessionEnvelope)
async def hover_hex(payload: HexRequest, db: Session = Depends(get_db)):
    state = await run_in_threadpool(service.hover_hex, db, payload.col, payload.row, payload.sessionId)
    return {"sessionId": payload.sessionId, "state": state}


@router.post("/game/click-hex", response_model=SessionEnvelope)
async def click_hex(payload: HexRequest, db: Session = Depends(get_db)):
    state = await run_in_threadpool(service.click_hex, db, payload.col, payload.row, payload.sessionId)
    await session_ws_manager.broadcast_state(payload.sessionId, state)
    return {"sessionId": payload.sessionId, "state": state}


@router.post("/game/undo", response_model=SessionEnvelope)
async def undo_move(payload: SessionRequest, db: Session = Depends(get_db)):
    state = await run_in_threadpool(service.undo_move, db, payload.sessionId)
    await session_ws_manager.broadcast_state(payload.sessionId, state)
    return {"sessionId": payload.sessionId, "state": state}


@router.post("/game/monster-turn", response_model=SessionEnvelope)
async def trigger_monster_turn(payload: SessionRequest, db: Session = Depends(get_db)):
    state = await run_in_threadpool(service.trigger_monster_turn, db, payload.sessionId)
    await session_ws_manager.broadcast_state(payload.sessionId, state)
    return {"sessionId": payload.sessionId, "state": state}


@router.post("/game/kill-player", response_model=SessionEnvelope)
async def kill_player(payload: PlayerColorRequest, db: Session = Depends(get_db)):
    state = await run_in_threadpool(service.kill_player, db, payload.color, payload.sessionId)
    await session_ws_manager.broadcast_state(payload.sessionId, state)
    return {"sessionId": payload.sessionId, "state": state}


@router.post("/game/remove-monster", response_model=SessionEnvelope)
async def remove_monster(payload: MonsterIdRequest, db: Session = Depends(get_db)):
    state = await run_in_threadpool(service.remove_monster, db, payload.id, payload.sessionId)
    await session_ws_manager.broadcast_state(payload.sessionId, state)
    return {"sessionId": payload.sessionId, "state": state}


@router.post("/game/revive-player", response_model=SessionEnvelope)
async def revive_player(payload: PlayerColorRequest, db: Session = Depends(get_db)):
    state = await run_in_threadpool(service.revive_player, db, payload.color, payload.sessionId)
    await session_ws_manager.broadcast_state(payload.sessionId, state)
    return {"sessionId": payload.sessionId, "state": state}


@router.post("/game/clear-removed-monster-info", response_model=SessionEnvelope)
async def clear_removed_monster_info(payload: SessionRequest, db: Session = Depends(get_db)):
    state = await run_in_threadpool(service.clear_removed_monster_info, db, payload.sessionId)
    await session_ws_manager.broadcast_state(payload.sessionId, state)
    return {"sessionId": payload.sessionId, "state": state}


@router.websocket("/ws/game")
async def game_session_websocket(
    websocket: WebSocket,
    sessionId: str = Query(default="default"),
):
    await session_ws_manager.connect(sessionId, websocket)
    db = SessionLocal()

    try:
        state = await run_in_threadpool(service.get_state, db, sessionId)
        await websocket.send_json({"sessionId": sessionId, "state": state})

        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        session_ws_manager.disconnect(sessionId, websocket)
        db.close()
