from __future__ import annotations

from collections import defaultdict

from fastapi import WebSocket


class SessionWebSocketManager:
    def __init__(self) -> None:
        self._connections: dict[str, set[WebSocket]] = defaultdict(set)

    async def connect(self, session_id: str, websocket: WebSocket) -> None:
        await websocket.accept()
        self._connections[session_id].add(websocket)

    def disconnect(self, session_id: str, websocket: WebSocket) -> None:
        connections = self._connections.get(session_id)
        if not connections:
            return

        connections.discard(websocket)
        if not connections:
            self._connections.pop(session_id, None)

    async def broadcast_state(self, session_id: str, state: dict) -> None:
        connections = list(self._connections.get(session_id, ()))
        if not connections:
            return

        payload = {"sessionId": session_id, "state": state}
        stale_connections: list[WebSocket] = []

        for websocket in connections:
            try:
                await websocket.send_json(payload)
            except Exception:
                stale_connections.append(websocket)

        for websocket in stale_connections:
            self.disconnect(session_id, websocket)


session_ws_manager = SessionWebSocketManager()
