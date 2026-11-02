FROM node:22-alpine

WORKDIR /app

# sqlite3 tem binário nativo; as ferramentas de build cobrem o caso de não haver binário pronto.
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci --omit=dev

COPY index.js ./
COPY src ./src

ENV PORT=3000 \
    DB_STORAGE=/data/database.sqlite

VOLUME ["/data"]
EXPOSE 3000

CMD ["node", "index.js"]
