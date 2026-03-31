# Bestie i Klusownicy

Monorepo z:

- `backend/` - FastAPI, logika gry, SQLite, WebSockety
- `frontend/` - Vue + Vite, klient HTTP/WebSocket

## Deployment

1. Skopiuj `.env.example` do `.env`.
2. Uzupełnij wszystkie adresy i hosty przez env.
3. Uruchom:

```sh
docker compose up --build -d
```

Repo nie zawiera twardo wpisanych lokalnych adresów do komunikacji frontend-backend. Połączenia są sterowane przez:

- `APP_API_BASE_URL`
- `APP_WS_BASE_URL`
- `NGINX_API_UPSTREAM`
- `BACKEND_HEALTHCHECK_URL`
- `FRONTEND_HEALTHCHECK_URL`
- `CORS_ORIGINS`
- `ALLOWED_HOSTS`

## Zmienne środowiskowe

Backend:

- `DATABASE_URL` - URL bazy danych
- `BACKEND_HEALTHCHECK_URL` - adres używany przez healthcheck backendu
- `CORS_ORIGINS` - lista originów CORS w formacie JSON
- `ALLOWED_HOSTS` - lista hostów do `TrustedHostMiddleware` w formacie JSON

Frontend / reverse proxy:

- `APP_API_BASE_URL` - adres API używany przez frontend w przeglądarce
- `APP_WS_BASE_URL` - adres WebSocket używany przez frontend w przeglądarce
- `NGINX_API_UPSTREAM` - upstream backendu używany przez Nginx wewnątrz kontenera
- `FRONTEND_HEALTHCHECK_URL` - adres używany przez healthcheck frontendu

Przykład:

```env
DATABASE_URL=sqlite:////data/bestie_klusownicy.db
BACKEND_HEALTHCHECK_URL=http://backend:8000/api/health
FRONTEND_HEALTHCHECK_URL=http://frontend/
CORS_ORIGINS=["https://app.example.com"]
ALLOWED_HOSTS=["app.example.com","api.example.com"]
APP_API_BASE_URL=https://app.example.com/api
APP_WS_BASE_URL=wss://app.example.com/api/ws
NGINX_API_UPSTREAM=http://backend:8000/api/
```

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
```

Jeżeli chcesz używać proxy Vite w development, ustaw `VITE_API_PROXY_TARGET` we własnym lokalnym env, np. `frontend/.env.local`.

Potem uruchom:

```sh
npm run dev
```

## Ograniczenie

Aktualna synchronizacja WebSocket działa w pamięci procesu backendu. To znaczy, że aplikację należy uruchamiać jako pojedynczą instancję backendu, dopóki broadcast nie zostanie przeniesiony do wspólnego brokera.
