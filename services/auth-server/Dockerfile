FROM node:18-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --only=prod
COPY src ./src
EXPOSE 4001
CMD ["npm", "start"]
