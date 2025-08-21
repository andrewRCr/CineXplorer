FROM node:alpine3.21
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