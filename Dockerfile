FROM node:24-bookworm-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

FROM base AS dependencias
WORKDIR /app
COPY package.json package-lock.json ./
COPY ferramentas/contrato/package.json ./ferramentas/contrato/package.json
RUN npm ci

FROM dependencias AS compilacao
COPY tsconfig.json prisma.config.ts ./
COPY prisma ./prisma
COPY codigo ./codigo
RUN npm run build

# A ferramenta de migrations fica fora da imagem que atende requisições.
FROM compilacao AS migracoes
USER node
CMD ["npm", "run", "db:deploy"]

FROM dependencias AS dependencias-producao
RUN npm prune --omit=dev

FROM base AS runtime
ENV NODE_ENV=production PORT=3000
WORKDIR /app
COPY --from=dependencias-producao /app/node_modules ./node_modules
COPY --from=compilacao /app/dist ./dist
COPY package.json ./
USER node
EXPOSE 3000
CMD ["node", "dist/server.js"]
