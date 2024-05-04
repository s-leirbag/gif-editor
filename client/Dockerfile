FROM node:20-alpine3.17

WORKDIR /app

COPY package.json .

RUN npm install

COPY . .

EXPOSE 3000

CMD npm start --host 0.0.0.0 --port 3000 --disableHostCheck true
