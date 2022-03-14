FROM node:12.18.1

WORKDIR /app/

COPY package*.json /app/

RUN npm install 

COPY . .

EXPOSE 3000

CMD [ "node", "store.js" ]

