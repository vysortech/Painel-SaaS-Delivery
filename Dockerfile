# Estágio 1: Build do Frontend
FROM node:18-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ .
RUN npm run build

# Estágio 2: Backend e Servidor
FROM node:18-alpine
WORKDIR /app/backend

# Copia package.json e instala dependências do backend
COPY backend/package*.json ./
RUN npm install --production

# Copia o código do backend
COPY backend/ .
# Transpila o TypeScript do backend (assumindo que há um script de build, ou executamos com ts-node/tsx)
RUN npm install -g typescript tsx

# Copia os arquivos estáticos do frontend buildados para serem servidos (opcional, se quiser servir tudo junto)
COPY --from=frontend-builder /app/frontend/dist /app/frontend-dist

# Expõe a porta do backend
EXPOSE 4000

# Comando para rodar em produção
CMD ["npx", "tsx", "src/index.ts"]
