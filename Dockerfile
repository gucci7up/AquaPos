# Dockerfile for AquaPos (Vite React App)
FROM node:20-alpine as build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Use Nginx to serve the static files
FROM nginx:stable-alpine
COPY --from=build /app/dist /usr/share/nginx/html
# Copy a custom nginx config if needed for SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
