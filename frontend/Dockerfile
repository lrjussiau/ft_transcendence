FROM node:14

WORKDIR /app

COPY . /app/

RUN npm install -g serve

CMD ["serve", "-s", ".", "-l", "3000"]
