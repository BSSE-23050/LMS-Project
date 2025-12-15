FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
# CRUCIAL: Make sure this says 8080, not 3000!
EXPOSE 8080
CMD ["node", "app.js"]