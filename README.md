# Gaming Studio J — V3

Gaming Studio J is a self-hosted, touch-first game and app portal for Kash's projects. V3 adds a real-time multiplayer social layer, server-backed scores and private admin analytics while preserving the existing local Studio profiles and Mr. Melon's Adventure gameplay.

## Included

- Mr. Melon's Adventure with 8 levels, maths challenges, upgrades, secrets and bosses
- Multiplayer lobby with live presence and chill chat
- Public/private room codes with up to 4 players
- Player customisation: nickname, body colour, accent colour and accessories
- Live player position rendering during multiplayer runs
- Coordinated multiplayer level progression
- Server-backed high-score leaderboard
- Authenticated admin dashboard for usage, sessions, matches, play time and scores
- Chat rate limiting and lightweight language filtering
- Ephemeral chat history: message text is not written to analytics storage
- Multiple local Studio profiles, favourites, ratings, XP, achievements and badges
- Desktop, tablet and mobile layouts
- Installable PWA shell
- Docker production deployment on the existing proxy network

## Privacy model

Studio profiles, XP, favourites, ratings, achievements and Mr. Melon save progress remain in the browser's local storage.

The self-hosted Gaming Studio J server stores anonymous device-level operational data needed for multiplayer and administration: nickname, selected player appearance, session counts/duration, match counts, score/level records and aggregate usage metrics. Chat text is kept only in the running server's short in-memory lobby history and is not written to the analytics file.

There are no third-party advertising or analytics services in this application.

## Multiplayer

Open:

`/lobby.html`

Players can customise their melon, chat, see who is online, create or join a room and start a multiplayer Mr. Melon run. Rooms support up to 4 players. The game broadcasts player movement to room peers and keeps level progression coordinated across the room.

Socket.IO uses WebSocket when available and can fall back to HTTP long-polling. Keep WebSocket support enabled on Nginx Proxy Manager for best performance.

## Admin dashboard

Open:

`/admin.html`

The dashboard is password-protected and shows:

- players online now
- lobby/game split
- open and active multiplayer rooms
- unique players and sessions
- match count and chat-message count
- peak concurrent players
- average session length
- 14-day sessions and unique-player trend
- high-score leaderboard
- recent operational activity

The original static catalogue helper is preserved at:

`/catalogue-admin.html`

### Required admin environment

Copy the example file and set strong values:

```bash
cp .env.example .env
openssl rand -hex 32
```

Then edit `.env`:

```env
ADMIN_PASSWORD=use-a-long-unique-password
ADMIN_SESSION_SECRET=paste-the-32-byte-random-secret-here
```

The admin dashboard intentionally stays disabled until both values meet the minimum length checks.

## Docker deployment

```bash
git pull origin main
docker compose up -d --build
docker compose ps
```

Gaming Studio J listens on port `80` inside its container and keeps the existing service name:

`gaming-studio-j`

It joins the external:

`proxy_network`

so the existing shared proxy can continue to reach:

`http://gaming-studio-j:80`

Analytics are persisted in the named Docker volume:

`gaming_studio_j_runtime`

Do not remove that volume if you want to retain admin usage and score history.

## Reverse proxy

For `games.v79sl.com`, keep:

- HTTPS enabled
- Force SSL enabled
- WebSocket support enabled
- the original Host header preserved

The application also supports Socket.IO polling when WebSocket upgrade is unavailable, but WebSocket is preferred for real-time play.

## Health check

```bash
docker exec gaming-studio-j wget -q -O - http://127.0.0.1/healthz
```

Expected body:

`ok`

## Game controls

Move with A/D or the arrow keys. Jump with W, Up or Space. Shoot with X, freeze with F and ground pound with S or Down while airborne. P pauses. Touchscreens use the dedicated control dock.

## Catalogue

The source catalogue is:

`data/catalog.json`

Use `/catalogue-admin.html` to prepare catalogue JSON, then replace the file in the repository/server as before.

## Cross-game achievements

Supported games write local achievement bridge events into:

`gsj_game_events_v1`

Mr. Melon's Adventure remains integrated with the active Studio profile.
