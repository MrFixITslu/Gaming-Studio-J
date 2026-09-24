#!/bin/sh
set -eu

PROXY_CONTAINER="${PROXY_CONTAINER:-v79_nginx_proxy}"
APP_CONTAINER="${APP_CONTAINER:-gaming-studio-j}"
CONFIG_SOURCE="${CONFIG_SOURCE:-deploy/v79-nginx-proxy/gaming-studio-j.conf}"
CONFIG_DEST="/etc/nginx/conf.d/gaming-studio-j.conf"

echo "Gaming Studio J -> v79 nginx proxy installer"
echo "Proxy container: ${PROXY_CONTAINER}"
echo "App container:   ${APP_CONTAINER}"

if ! docker inspect "${PROXY_CONTAINER}" >/dev/null 2>&1; then
  echo "ERROR: proxy container '${PROXY_CONTAINER}' does not exist." >&2
  exit 1
fi

if ! docker inspect "${APP_CONTAINER}" >/dev/null 2>&1; then
  echo "ERROR: app container '${APP_CONTAINER}' does not exist." >&2
  exit 1
fi

if [ ! -f "${CONFIG_SOURCE}" ]; then
  echo "ERROR: missing ${CONFIG_SOURCE}" >&2
  exit 1
fi

echo "Checking shared proxy_network membership..."
for c in "${PROXY_CONTAINER}" "${APP_CONTAINER}"; do
  if ! docker inspect "${c}" --format '{{json .NetworkSettings.Networks}}' | grep -q '"proxy_network"'; then
    echo "ERROR: ${c} is not attached to proxy_network." >&2
    exit 1
  fi
done

echo "Checking app health from inside ${PROXY_CONTAINER}..."
if docker exec "${PROXY_CONTAINER}" sh -c 'command -v wget >/dev/null 2>&1'; then
  docker exec "${PROXY_CONTAINER}" wget -q -O - "http://${APP_CONTAINER}:80/healthz" | grep -q '^ok$'
elif docker exec "${PROXY_CONTAINER}" sh -c 'command -v curl >/dev/null 2>&1'; then
  docker exec "${PROXY_CONTAINER}" curl -fsS "http://${APP_CONTAINER}:80/healthz" | grep -q '^ok$'
else
  echo "ERROR: neither wget nor curl is available in ${PROXY_CONTAINER}." >&2
  exit 1
fi

TMP_CONFIG="/tmp/gaming-studio-j.conf"
docker cp "${CONFIG_SOURCE}" "${PROXY_CONTAINER}:${TMP_CONFIG}"

# Back up an existing generated config if present.
docker exec "${PROXY_CONTAINER}" sh -c "
  if [ -f '${CONFIG_DEST}' ]; then
    cp '${CONFIG_DEST}' '${CONFIG_DEST}.bak'
  fi
  cp '${TMP_CONFIG}' '${CONFIG_DEST}'
"

echo "Validating nginx configuration..."
if ! docker exec "${PROXY_CONTAINER}" nginx -t; then
  echo "ERROR: nginx validation failed. Restoring previous config." >&2
  docker exec "${PROXY_CONTAINER}" sh -c "
    if [ -f '${CONFIG_DEST}.bak' ]; then
      mv '${CONFIG_DEST}.bak' '${CONFIG_DEST}'
    else
      rm -f '${CONFIG_DEST}'
    fi
  "
  exit 1
fi

echo "Reloading nginx..."
docker exec "${PROXY_CONTAINER}" nginx -s reload

echo "Validating proxied health endpoint..."
if docker exec "${PROXY_CONTAINER}" sh -c 'command -v wget >/dev/null 2>&1'; then
  docker exec "${PROXY_CONTAINER}" wget -q -O - --header='Host: games.v79sl.com' http://127.0.0.1/healthz | grep -q '^ok$'
else
  docker exec "${PROXY_CONTAINER}" curl -fsS -H 'Host: games.v79sl.com' http://127.0.0.1/healthz | grep -q '^ok$'
fi

echo "SUCCESS: v79_nginx_proxy is routing games.v79sl.com to gaming-studio-j:80."
echo
echo "NOTE: this installs the config inside the running proxy container."
echo "If v79_nginx_proxy is recreated, mount deploy/v79-nginx-proxy/gaming-studio-j.conf"
echo "into /etc/nginx/conf.d/gaming-studio-j.conf from the proxy's own compose project."
