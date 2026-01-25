### Build stage
FROM node:18-alpine AS build
WORKDIR /app

# Accept Vite API endpoints as build args and expose them as env vars for the build
ARG VITE_API_NEED
ARG VITE_API_RESOURCE
ARG VITE_API_AUTH
ENV VITE_API_NEED=${VITE_API_NEED}
ENV VITE_API_RESOURCE=${VITE_API_RESOURCE}
ENV VITE_API_AUTH=${VITE_API_AUTH}

COPY package*.json ./
RUN npm ci --no-audit --no-fund
COPY . .
# `npm run build` will read the VITE_* env vars and embed them into the built assets
RUN npm run build

### Production stage
FROM nginx:stable-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh
EXPOSE 80
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
