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
git pull origin main
cp -n .env.example .env
docker compose up -d --build
docker compose ps
```

The container listens on port `80` inside Docker and joins the existing external Docker network:

`proxy_network`

For local diagnostics only, Docker publishes:

`127.0.0.1:8095 -> gaming-studio-j:80`

Test it from the Ubuntu server with:

```bash
curl -i http://127.0.0.1:8095/healthz
```

Expected body:

```text
ok
```

Browser profiles and progress are kept on each player's device, so clearing browser storage clears their progress.

For updates:

```bash
git pull origin main
docker compose up -d --build
docker compose ps
docker compose logs --tail=100 gaming-studio-j
```

## v79 Nginx reverse proxy

Gaming Studio J is designed to use the existing container:

`v79_nginx_proxy`

Both containers must be connected to:

`proxy_network`

The reverse proxy must send traffic directly to:

`http://gaming-studio-j:80`

Do **not** proxy to `gaming-studio-j:8095`. Port `8095` is only the host-side diagnostic port.

The repository includes:

`deploy/v79-nginx-proxy/gaming-studio-j.conf`

This configuration defines `games.v79sl.com` and proxies it to `gaming-studio-j:80`.

### Install the proxy configuration

From the Gaming Studio J project directory:

```bash
chmod +x scripts/install-v79-nginx-proxy.sh
./scripts/install-v79-nginx-proxy.sh
```

The script:

- verifies `gaming-studio-j` and `v79_nginx_proxy` exist
- verifies both containers are on `proxy_network`
- verifies the application health endpoint from inside the proxy
- copies the Gaming Studio J server block into `v79_nginx_proxy`
- runs `nginx -t`
- restores the previous config if validation fails
- reloads Nginx only after validation succeeds
- checks the proxied `/healthz` endpoint

You can manually verify connectivity with:

```bash
docker exec v79_nginx_proxy wget -S -O- http://gaming-studio-j:80/healthz
```

and verify the proxy configuration with:

```bash
docker exec v79_nginx_proxy nginx -t
docker exec v79_nginx_proxy nginx -T
```

### Persistence note

The installer copies the server block into the running `v79_nginx_proxy` container. If that proxy container is recreated, changes made only inside it will disappear.

For permanent deployment, mount:

`deploy/v79-nginx-proxy/gaming-studio-j.conf`

from the host into:

`/etc/nginx/conf.d/gaming-studio-j.conf`

in the Compose project that owns `v79_nginx_proxy`.

The application itself does not need its host port exposed to the LAN because the proxy reaches it directly through Docker networking.

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
