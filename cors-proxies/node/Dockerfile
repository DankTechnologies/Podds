FROM node:slim
WORKDIR /app
COPY server.js .
RUN npm install node-fetch
CMD ["node", "server.js"]