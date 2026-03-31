# Bestie i Klusownicy

Repo ma teraz układ monorepo:

- `backend/` - FastAPI, logika gry, SQLite, WebSockety
- `frontend/` - Vue + Vite, render planszy i klient API/WebSocket

## Uruchomienie

Całość:

```sh
docker compose up --build
```

Adresy:

- frontend: `http://localhost:5173`
- backend: `http://localhost:8000`
- Swagger: `http://localhost:8000/docs`

## Development

Backend:

```sh
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Frontend:

```sh
cd frontend
npm install
npm run dev
```

## Struktura backendu

`backend/app/main.py`

- start aplikacji FastAPI
- CORS
- inicjalizacja tabel

`backend/app/api.py`

- REST API gry
- endpoint WebSocket dla synchronizacji wielu okien

`backend/app/core/config.py`

- konfiguracja aplikacji

`backend/app/db.py`

- SQLAlchemy engine i sesje

`backend/app/models.py`

- model sesji gry

`backend/app/schemas.py`

- kontrakty request/response

`backend/app/websockets.py`

- broadcast stanu do podłączonych klientów

`backend/app/game/`

- `service.py` - główna logika gry
- `pathfinding.py` - ruch po heksach
- `monsters.py` - AI potworów
- `seeds.py` - stan początkowy planszy
- `board.py` - geometria planszy

## Struktura frontendu

`frontend/src/App.vue`

- główny shell aplikacji

`frontend/src/components/HexMap/HexMap.vue`

- widok planszy i panel sterowania

`frontend/src/components/HexMap/hooks/useHexMap.ts`

- klient API i WebSocket
- synchronizacja stanu planszy

`frontend/src/components/Entities/`

- render graczy, potworów i przeszkód

`frontend/src/types/`

- typy encji i ruchu

## Co zostało usunięte

- stara lokalna logika gry po stronie Vue
- nieużywane moduły pathfindingu i ruchu potworów w frontendzie
- nieużywane dane startowe frontendu
- zbędne artefakty logów i buildów

## Jak działa program

1. Frontend pobiera stan sesji z backendu.
2. Akcje użytkownika trafiają do FastAPI.
3. Backend liczy nowy stan, zapisuje go w SQLite i rozsyła przez WebSocket.
4. Wszystkie otwarte okna dostają ten sam stan i renderują go na bieżąco.
