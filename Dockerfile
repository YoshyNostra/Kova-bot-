# Kova — image de production pour Railway / Docker
FROM node:20-alpine

WORKDIR /app

# Dépendances d'abord (cache de build)
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund

# Code du bot
COPY . .

# Dossiers de données — remplacés par le volume si tu en montes un
RUN mkdir -p /app/data /app/backups /app/transcripts

# Utilisateur non-root
RUN addgroup -S kova && adduser -S kova -G kova && chown -R kova:kova /app
USER kova

ENV NODE_ENV=production
ENV DATA_DIR=/app/data
ENV BACKUP_DIR=/app/backups

CMD ["node", "index.js"]
