# Gaming Studio J — V2

Gaming Studio J is a self-hosted, touch-first game and app portal for Kash's projects.

## Included
- Roblox-style discovery layout without copying Roblox branding or assets
- Mr. Melon's Adventure bundled and playable
- Parallax scenery, refined platform details and clearer touch feedback
- Consistent 60 Hz game simulation, jump buffering and forgiving ledge jumps
- Desktop, tablet and mobile navigation
- Touch-first controls and 44px+ interaction targets
- Multiple local player profiles
- Per-profile favourites, recent titles and ratings
- Studio XP and levels
- Cross-game achievement bridge
- Studio badges
- Featured / New / Games / Apps / Favourites discovery
- Family-mode age filtering
- Installable PWA support
- Offline shell caching
- Local catalogue builder (`admin.html`)
- Docker + Nginx production deployment

## Important privacy model
Player profiles, XP, ratings and achievements stay in the browser's local storage. Nothing is sent to an external analytics or advertising provider.

The Melon Crew code is visible in the game and is only a playful entry step, not an access restriction. Use reverse proxy access rules if the game should be private.

Family mode is a local content filter. It is **not** strong parental access control because a person with access to the browser can change the setting.

## Deploy with Docker
```bash
unzip Gaming-Studio-J-Git-Ready.zip
cd gaming-studio-j
cp .env.example .env
docker compose up -d --build
docker compose ps
```

The default host port is:
`8095`

Open:
`http://YOUR-SERVER-IP:8095`

Edit `.env` to choose another `GAMES_PORT`. If Nginx Proxy Manager is installed on the same server, you can set `GAMES_BIND_ADDRESS=127.0.0.1` when NPM connects through the host; if NPM is in a container, keep the LAN binding and forward to the server's LAN IP. The container serves static files only. Browser profiles and progress are kept on each player's device, so clearing browser storage clears their progress.

For updates, back up any edits you made to `data/catalog.json` or the game files, replace the project files, then run `docker compose up -d --build`. Confirm `docker compose ps` reports healthy. To see errors, run `docker compose logs --tail=100 gaming-studio-j`.

### Nginx Proxy Manager
Recommended:
- Domain: `games.v79sl.com`
- Scheme: `http`
- Forward IP: `192.168.100.163`
- Forward port: `8095`
- Enable Websockets
- Request a Let's Encrypt certificate
- Force SSL

Keep port 8095 accessible only on your trusted network if you put it behind NPM. The catalogue builder at `/admin.html` runs in the browser and exports JSON; it does not write to your server. Restrict that page at the reverse proxy if you prefer it private.

## Game controls

Move with A/D or the arrow keys. Jump with W, Up or Space. Shoot with X, freeze with F and ground pound with S or Down while airborne. P pauses. On touchscreens, use the on-screen controls. Briefly pressing jump just before landing or just after leaving a ledge is supported.

## Add a game or app
Open:
`/admin.html`

The Catalogue Builder loads the current catalogue and lets you draft a new title. Click **Download JSON**, then replace:
`data/catalog.json`

The admin helper is intentionally static. It does not change server files itself and is not an authenticated admin panel.

You can also edit `data/catalog.json` directly.

## Game catalogue fields
Each title can declare:
- `type`: game or app
- `status`: playable or coming-soon
- `featured`
- `touchReady`
- `age`
- `url`
- `thumbnail`
- `icon`
- `tags`
- `players`
- `input`

## Cross-game achievements
Supported games write achievement events into:
`gsj_game_events_v1`

Events include the active Gaming Studio J profile ID, so achievements are awarded to the player who launched the game.

Mr. Melon's Adventure is already integrated.

## Updating Mr. Melon
Replace:
`games/mr-melons-adventure/`

Keep its entry point:
`games/mr-melons-adventure/index.html`

If you replace it with a completely new build, re-add the Studio achievement bridge and return-to-Studio links.
