# --- Stage 1: Build Frontend ---
FROM node:18-alpine AS frontend-builder
WORKDIR /app/client

# 替换 Alpine 镜像源为腾讯云
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.cloud.tencent.com/g' /etc/apk/repositories

COPY frontend/package.json ./
# 配置淘宝 NPM 镜像
RUN npm config set registry https://registry.npmmirror.com
RUN npm install

COPY frontend/ ./
RUN npm run build

# --- Stage 2: Build Backend ---
FROM node:18-alpine AS backend-builder
WORKDIR /app

# 替换 Alpine 镜像源为腾讯云
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.cloud.tencent.com/g' /etc/apk/repositories

# better-sqlite3 需要编译工具
RUN apk add --no-cache python3 make g++

COPY backend/package.json ./

# 配置淘宝 NPM 镜像
RUN npm config set registry https://registry.npmmirror.com
RUN npm install

COPY backend/ ./
RUN npm run build

# --- Stage 3: Runtime ---
FROM node:18-alpine
WORKDIR /app

# 替换 Alpine 镜像源为腾讯云
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.cloud.tencent.com/g' /etc/apk/repositories

# better-sqlite3 运行时依赖（只需要运行时库，不需要编译工具）
RUN apk add --no-cache libstdc++

# 复制 package.json
COPY backend/package.json ./

# 配置淘宝 NPM 镜像
RUN npm config set registry https://registry.npmmirror.com

# 安装纯 JS 依赖（跳过 better-sqlite3）
RUN npm install --only=production --ignore-scripts

# 复制构建阶段已编译好的 node_modules（包含 better-sqlite3）
# better-sqlite3 需要完整复制，包括 build 目录
COPY --from=backend-builder /app/node_modules/better-sqlite3 ./node_modules/better-sqlite3
COPY --from=backend-builder /app/node_modules/bcryptjs ./node_modules/bcryptjs
# 确保复制所有必要的依赖
COPY --from=backend-builder /app/node_modules/bindings ./node_modules/bindings

# 复制构建产物
COPY --from=backend-builder /app/dist ./dist
COPY --from=frontend-builder /app/client/dist ./client/dist

# 创建数据目录
RUN mkdir -p data

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["npm", "start"]

