FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY entrypoint.sh ./

RUN npm install

RUN chmod +x entrypoint.sh

COPY . .

EXPOSE 3000

ENTRYPOINT ["sh", "entrypoint.sh"]
