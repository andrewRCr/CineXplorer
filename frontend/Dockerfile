FROM node:26-alpine AS dev
LABEL maintainer="andrew.creekmore@me.com"

WORKDIR /frontend

EXPOSE 5173

# install dependencies
COPY package*.json .
RUN npm ci

# copy frontend source code
COPY . .

# run
CMD ["npm", "run", "dev"]

FROM node:26-alpine AS build
WORKDIR /frontend
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run typegen && npm run build

FROM caddy:2.11-alpine AS production
COPY --from=build /frontend/dist /srv
COPY --from=infra Caddyfile.prod /etc/caddy/Caddyfile
