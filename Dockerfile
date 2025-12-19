# --- Stage 1: Build Frontend ---
FROM node:20-alpine AS frontend-builder
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
FROM node:20-alpine AS backend-builder
WORKDIR /app

# 替换 Alpine 镜像源为腾讯云
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.cloud.tencent.com/g' /etc/apk/repositories

COPY backend/package.json ./
COPY backend/prisma ./prisma/

# 配置淘宝 NPM 镜像
RUN npm config set registry https://registry.npmmirror.com
RUN npm install

COPY backend/ ./
RUN npx prisma generate
RUN npm run build

# --- Stage 3: Runtime ---
FROM node:20-alpine
WORKDIR /app

# 替换 Alpine 镜像源为腾讯云
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.cloud.tencent.com/g' /etc/apk/repositories

# 安装运行时依赖（Prisma 可能需要）
RUN apk add --no-cache python3 make g++

COPY backend/package.json ./
COPY backend/prisma ./prisma/

# 配置淘宝 NPM 镜像
RUN npm config set registry https://registry.npmmirror.com
RUN npm install --only=production

# 复制构建产物
COPY --from=backend-builder /app/dist ./dist
COPY --from=frontend-builder /app/client/dist ./client/dist
COPY --from=backend-builder /app/node_modules/.prisma ./node_modules/.prisma

# 创建数据目录
RUN mkdir -p data

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# 启动脚本
COPY start.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/start.sh

CMD ["start.sh"]

