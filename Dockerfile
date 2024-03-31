FROM node:20 AS build
WORKDIR /app
COPY . .
RUN npm i
RUN npm run build

FROM node:20 AS deps
WORKDIR /app
COPY --from=build /app/package.json .
RUN npm i --omit=dev

FROM gcr.io/distroless/nodejs20-debian12
WORKDIR /app
COPY --from=build /app/build/ ./build/
COPY --from=deps /app/package.json .
COPY --from=deps /app/node_modules/ ./node_modules/
CMD ["./build/index.js"]