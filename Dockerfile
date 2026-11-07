FROM node:22-alpine
WORKDIR /app
COPY package.json ./
COPY server ./server
ENV PORT=3000
EXPOSE 3000
CMD ["npm","start"]
