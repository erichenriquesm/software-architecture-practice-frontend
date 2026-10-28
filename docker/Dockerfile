FROM node:26-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

FROM deps AS dev
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev"]

FROM dev AS build
RUN npm run check && npm run build

FROM nginx:1.29-alpine AS runtime
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
