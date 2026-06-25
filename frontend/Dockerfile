FROM node:20
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --legacy-peer-deps
COPY . .
RUN npm run build -- --configuration production
RUN npm install -g serve
EXPOSE 80
CMD ["serve", "-s", "dist/wsscms-frontend/browser", "-l", "80"]
