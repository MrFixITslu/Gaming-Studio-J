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

## Docker deployment

```bash
git pull origin main
docker compose up -d --build
docker compose ps
```

Gaming Studio J does **not** publish a host port directly. It listens on port `80` inside its Docker container and joins:

`proxy_network`

The shared V79 Nginx container reaches it at:

`http://gaming-studio-j:80`

The public routing architecture is:

```text
Internet
  ↓ HTTPS
Nginx Proxy Manager (v79sl_DOMAIN)
  ↓ HTTP to server port 8095
v79_nginx_proxy:80
  ↓ proxy_network
gaming-studio-j:80
```

Host port `8095` belongs to `v79_nginx_proxy`, not to the Gaming Studio J container.

The persistent `games.v79sl.com` virtual-host configuration is maintained in the separate repository:

`MrFixITslu/V79-Course-Builder`

in:

`nginx.conf`

That repository's Docker Compose publishes:

`8095:80`

for `v79_nginx_proxy`.

## Nginx Proxy Manager

Configure the Proxy Host for `games.v79sl.com` as:

- Scheme: `http`
- Forward Hostname / IP: `192.168.100.163`
- Forward Port: `8095`
- Websockets Support: enabled
- SSL certificate: Let's Encrypt
- Force SSL: enabled

Nginx Proxy Manager should preserve the original Host header. The V79 Nginx proxy uses `games.v79sl.com` to select the Gaming Studio J server block.

## Health checks

From the Gaming Studio J container:

```bash
docker exec gaming-studio-j wget -q -O - http://127.0.0.1/healthz
```

From `v79_nginx_proxy`:

```bash
docker exec v79_nginx_proxy wget -S -O- \
  --header='Host: games.v79sl.com' \
  http://127.0.0.1/healthz
```

Through the host-published proxy port:

```bash
curl -i -H 'Host: games.v79sl.com' http://127.0.0.1:8095/healthz
```

Through the public domain:

```bash
curl -i https://games.v79sl.com/healthz
```

Each should return `200 OK` with body `ok`.

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
