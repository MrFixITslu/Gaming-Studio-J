FROM node:22-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund \
    && apk add --no-cache libcap \
    && setcap 'cap_net_bind_service=+ep' "$(readlink -f "$(which node)")"

COPY . .
# Source checkouts can inherit a restrictive host umask (for example 077),
# which makes copied static files unreadable by the non-root Node user.
# Normalise application file permissions inside the image while keeping
# runtime data writable only by the application user.
RUN chmod -R a+rX /app \
    && mkdir -p /app/runtime \
    && chown -R node:node /app/runtime \
    && chmod 700 /app/runtime

ENV NODE_ENV=production
ENV PORT=80

USER node

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=8s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/healthz || exit 1

CMD ["node", "server.js"]
