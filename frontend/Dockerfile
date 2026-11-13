FROM node:24-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY index.html ./
COPY vite.config.ts ./
COPY src ./src

# Décommente cette ligne si ton dossier frontend/public existe.
# COPY public ./public

# Le serveur de développement s'exécute avec le compte « node », pas en root.
RUN chown -R node:node /app
USER node

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]