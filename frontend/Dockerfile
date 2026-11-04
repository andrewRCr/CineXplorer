FROM node:26-alpine@sha256:c6ad9e9c1d80f6eb607c26b4b0a132ff7a2344fad1c78ea3baa2a7d4c8de6d94 AS dev
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

FROM node:26-alpine@sha256:c6ad9e9c1d80f6eb607c26b4b0a132ff7a2344fad1c78ea3baa2a7d4c8de6d94 AS build
WORKDIR /frontend
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run typegen && npm run build

FROM caddy:2.11-alpine@sha256:e70b164da81ef698b3ad19af799ea6086ce6d9e48ed4079eb9fe26f6fbf14ee5 AS production
COPY --from=build /frontend/dist /srv
COPY --from=infra Caddyfile.prod /etc/caddy/Caddyfile
