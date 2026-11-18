# --- Stage 1: Build Frontend ---
FROM node:20-alpine AS frontend-builder
WORKDIR /app/client

# 替换 Alpine 镜像源为腾讯云
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.cloud.tencent.com/g' /etc/apk/repositories

COPY frontend/package*.json ./
# 配置淘宝 NPM 镜像
RUN npm config set registry https://registry.npmmirror.com
RUN npm install

COPY frontend/ ./
RUN npm run build

# --- Stage 2: Build Backend ---
FROM node:20-alpine AS backend-builder
WORKDIR /app

COPY backend/package*.json ./

# 配置淘宝 NPM 镜像（仅编译 TS，跳过 better-sqlite3 原生编译）
RUN npm config set registry https://registry.npmmirror.com
RUN npm install --ignore-scripts

COPY backend/ ./
RUN npm run build

# --- Stage 3: Runtime ---
FROM node:20-alpine
WORKDIR /app

# 替换 Alpine 镜像源为腾讯云
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.cloud.tencent.com/g' /etc/apk/repositories

# better-sqlite3 运行时依赖
RUN apk add --no-cache libstdc++

# 复制 package.json
COPY backend/package*.json ./

# 配置淘宝 NPM 镜像及原生模块/Node 头文件国内镜像源（避免访问 GitHub 和 unofficial-builds.nodejs.org 超时）
ENV npm_config_registry=https://registry.npmmirror.com
ENV npm_config_disturl=https://npmmirror.com/mirrors/node
ENV npm_config_better_sqlite3_binary_host=https://npmmirror.com/mirrors/better-sqlite3

# 安装所有生产依赖（先跳过脚本）
RUN npm install --omit=dev --ignore-scripts

# 优先从国内镜像拉取预编译二进制或使用国内 Node headers 编译 better-sqlite3
RUN apk add --no-cache --virtual .build-deps python3 make g++ && \
    npm rebuild better-sqlite3 && \
    apk del .build-deps

# 复制构建产物
COPY --from=backend-builder /app/dist ./dist
COPY --from=frontend-builder /app/client/dist ./client/dist

# 创建数据目录
RUN mkdir -p data

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["npm", "start"]
