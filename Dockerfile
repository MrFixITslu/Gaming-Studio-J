FROM node:22-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund \
    && apk add --no-cache libcap \
    && setcap 'cap_net_bind_service=+ep' "$(readlink -f "$(which node)")"

COPY . .
RUN mkdir -p /app/runtime \
    && chown -R node:node /app/runtime

ENV NODE_ENV=production
ENV PORT=80

USER node

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=8s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/healthz || exit 1

CMD ["node", "server.js"]
