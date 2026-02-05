FROM node:20
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --legacy-peer-deps
COPY . .
RUN npm run build -- --configuration production
RUN npm install -g http-server
EXPOSE 80
CMD ["http-server","dist/wsscms-frontend/browser","-p","80","-c-1"]
