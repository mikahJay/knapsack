FROM node:18-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --only=prod
COPY src ./src
EXPOSE 4020
CMD ["npm", "start"]
