# Compilação em Debian 13 (trixie), a mesma base do runtime distroless: os módulos nativos
# (argon2, sharp) são compilados contra a mesma glibc em que vão rodar.
FROM node:24-trixie-slim@sha256:4d00acb4bcc42c454c4eb801526f7ad7f772ea3bd4fd168c5cc2e384abcbb9d4 AS base
# upgrade aplica as correções de segurança já publicadas pelo Debian.
# A data (passada pelo operar.mjs) refaz esta camada a cada dia: sem ela, o cache do Docker
# reaproveitava um upgrade antigo e a imagem ficava sem correções já publicadas.
ARG ATUALIZACOES_SEGURANCA=manual
RUN echo "atualizações de segurança: ${ATUALIZACOES_SEGURANCA}" && apt-get update && apt-get upgrade -y && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

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
# O npm sai da imagem final (o Prisma roda direto pelo node); o openssl continua,
# porque a demo gera o certificado do Elasticsearch com esta imagem.
FROM compilacao AS migracoes
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack \
  /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack
USER node
CMD ["node", "node_modules/prisma/build/index.js", "migrate", "deploy"]

FROM dependencias AS dependencias-producao
RUN npm prune --omit=dev

# Runtime distroless: só Node e bibliotecas essenciais, sem shell, apt, perl ou npm.
# O node é o entrypoint da imagem (/nodejs/bin/node); o usuário padrão é 65532 (nonroot).
FROM gcr.io/distroless/nodejs24-debian13:nonroot@sha256:39b0407357c9fadf1a9708d22088f02de21f0e1e8a688474eea2d8701e7d5693 AS runtime
ENV NODE_ENV=production PORT=3000
WORKDIR /app
COPY --from=dependencias-producao /app/node_modules ./node_modules
COPY --from=compilacao /app/dist ./dist
COPY package.json ./
EXPOSE 3000
CMD ["dist/server.js"]
