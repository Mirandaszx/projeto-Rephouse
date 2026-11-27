# Imagem do RepHouse para o Render: API e interface no mesmo serviço, com migrações na partida.
# A imagem de produção local (Dockerfile na raiz, distroless) e a demo em Kubernetes continuam como estão.
FROM node:24-trixie-slim@sha256:4d00acb4bcc42c454c4eb801526f7ad7f772ea3bd4fd168c5cc2e384abcbb9d4 AS base
RUN apt-get update && apt-get upgrade -y && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

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

FROM base AS interface
WORKDIR /workspace/interface
COPY interface/package.json interface/package-lock.json ./
RUN npm ci
COPY interface ./
COPY integracao /workspace/integracao
RUN npm run build

# Mantém as dependências completas: o Prisma CLI aplica as migrações na partida.
FROM compilacao AS producao
COPY --from=interface /workspace/interface/dist ./interface-dist
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack \
  /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack
ENV NODE_ENV=production INTERFACE_DIR=/app/interface-dist
USER node
EXPOSE 10000
CMD ["node", "dist/comandos/iniciar-render.js"]
