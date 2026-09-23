# Gaming Studio J — V2

Gaming Studio J is a self-hosted, touch-first game and app portal for Kash's projects.

## Included
- Roblox-style discovery layout without copying Roblox branding or assets
- Mr. Melon's Adventure bundled and playable
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

Family mode is a local content filter. It is **not** strong parental access control because a person with access to the browser can change the setting.

## Deploy with Docker
```bash
cd gaming-studio-j
docker compose up -d --build
```

The default host port is:
`8095`

Open:
`http://YOUR-SERVER-IP:8095`

### Nginx Proxy Manager
Recommended:
- Domain: `games.v79sl.com`
- Scheme: `http`
- Forward IP: `192.168.100.163`
- Forward port: `8095`
- Enable Websockets
- Request a Let's Encrypt certificate
- Force SSL

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