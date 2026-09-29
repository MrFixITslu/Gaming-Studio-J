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


## Spelling Bee

Spelling Bee is the second playable Gaming Studio J title. It is built around the children's real weekly spelling list of 10–12 words.

Learning flow:

1. Flight School: hear the word, build it, spell it from memory and place it correctly in sentence context.
2. Story Hangar: read the weekly story with spelling words highlighted and available for read-aloud/definition review.
3. Flight Mission: take off and steer through the correct letters in sequence.
4. Fuel rule: correct letters build route/fuel progress; more than 20% wrong-letter selections causes a safe diversion to the Practice Airfield rather than a crash.
5. Results: difficult words are identified for targeted practice before retrying.

Weekly content is managed at:

`/spelling-admin.html`

The page uses the same authenticated admin session as `/admin.html`. Published missions appear immediately in Spelling Bee.

### Learning-content generation

The admin can generate definitions, example sentences, hints and syllable guidance for the weekly words. If a reachable Ollama endpoint is configured, Gaming Studio J uses it. If it is unavailable, the server generates safe fallback content so the weekly mission can still be created.

Example:

```env
OLLAMA_URL=http://ollama:11434
OLLAMA_MODEL=qwen2.5:3b
```

The `gaming-studio-j` container must be able to resolve/reach the configured Ollama host. If your existing Ollama container is on another Docker network, either attach both containers to a shared network or point `OLLAMA_URL` at a host/IP reachable from Gaming Studio J.

Spelling mission definitions are persisted in the existing `gaming_studio_j_runtime` Docker volume as `spelling-levels.json`. Anonymous learning activity and aggregate difficult-word counts are stored with the existing server analytics data.

## Grade 2 Learning Worlds

Gaming Studio J includes a shared Grade 2 learning layer mapped to the OECS Learning Hub curriculum. The four learning worlds are:

- **Spelling Bee** — Language Arts: spelling, vocabulary, sentence context, reading and story-based practice.
- **Mr. Melon's Adventure** — Mathematics: Number Sense, Operations, Patterns, Geometry, Measurement, Data Handling and introductory Probability.
- **Island Science Explorers** — Science: material properties, plant/ecosystem relationships, Earth systems and engineering design.
- **Caribbean Community Quest** — Social Studies: heritage, civic participation, spatial thinking, environment, work, goods and services.

The curriculum map lives in `data/curriculum-grade2.json`. Each assessment activity records a curriculum outcome ID through `assets/learning-engine.js`.

### Adaptive mastery

Each outcome moves through **Learning → Practising → Ready → Mastered**. The engine chooses a **Support**, **Core** or **Challenge** path from recent performance. Wrong answers trigger explanation and review rather than loss of game health or lives. Mastered concepts are scheduled for later review instead of being considered permanently finished after one success.

Math scoring is deterministic. AI is not used to decide whether a child's mathematical or factual answer is correct.

### Child safety

- No advertising or third-party trackers in learning worlds.
- No precise location collection.
- No public free-text chat; multiplayer uses a server-side allow-list of preset Quick Chat phrases.
- Academic errors are not punished with health or lives.
- Shared Studio profiles reduce repeated entry of identifying information.
- Social Studies civic content is factual, age-appropriate and non-partisan.

Curriculum references:
- https://oecslearninghub.org/curriculum/grade2-subjects
- https://oecslearninghub.org/curriculum/grade2-subjects/language-arts
- https://oecslearninghub.org/curriculum/grade2-subjects/mathematics
- https://oecslearninghub.org/curriculum/grade2-subjects/science
- https://oecslearninghub.org/curriculum/grade2-subjects/social-studies

The admin dashboard aggregates learning attempts, subject accuracy, and curriculum outcomes that repeatedly need support.
