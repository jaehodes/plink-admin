# plink-admin 이미지
# 환경(development/production)과 무관한 단일 이미지. APP_ENV와 EXTERNAL_API_URL은 실행 시 주입한다.
# NEXT_PUBLIC_* 값은 빌드 시 고정되므로 환경별 값에 쓰지 않는다. (app/lib/app-env.ts 참고)
# 실행 방법은 docs/deploy/docker.md 참고.

FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# 화면 헤더에 표시하는 버전. deploy/build-push.sh가 git sha를 넘긴다.
ARG APP_VERSION=""
ENV NEXT_PUBLIC_APP_VERSION=$APP_VERSION \
    NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-slim
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    TZ=Asia/Seoul \
    PORT=3000 \
    HOSTNAME=0.0.0.0
WORKDIR /app
# standalone에는 static과 public이 들어 있지 않아 따로 복사한다.
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
USER node
EXPOSE 3000
CMD ["node", "server.js"]
