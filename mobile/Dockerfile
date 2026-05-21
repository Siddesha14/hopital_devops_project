FROM node:20-bookworm-slim

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .

EXPOSE 8090

CMD ["npx", "expo", "start", "--web", "--host", "lan", "--port", "8090", "-c"]
