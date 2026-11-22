# Imagen de la API de pedidos (sin dependencias externas)
FROM node:22-alpine

ENV NODE_ENV=production
WORKDIR /app

COPY package.json ./
COPY src ./src

# Ejecutar como usuario sin privilegios
USER node

ARG APP_VERSION=dev
ENV APP_VERSION=${APP_VERSION}
ENV PORT=3000
EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "src/server.js"]
