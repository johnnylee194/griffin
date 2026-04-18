# 构建阶段
FROM node:20-alpine AS builder

WORKDIR /app

# 替换 Alpine 镜像源为腾讯云
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.cloud.tencent.com/g' /etc/apk/repositories

# 安装编译工具（better-sqlite3 需要）
RUN apk add --no-cache openssl libc6-compat python3 make g++

# 复制依赖文件
COPY package*.json ./

# 配置淘宝 NPM 镜像
RUN npm config set registry https://registry.npmmirror.com

# 安装依赖（包括编译 better-sqlite3）
RUN npm install

# 复制源代码
COPY . .

# 编译 TypeScript
RUN npm run build

# 生产阶段
FROM node:20-alpine

WORKDIR /app

# 替换 Alpine 镜像源为腾讯云
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.cloud.tencent.com/g' /etc/apk/repositories

# 安装运行时依赖（better-sqlite3 需要 libstdc++）
RUN apk add --no-cache openssl libc6-compat libstdc++

# 复制依赖文件
COPY package*.json ./

# 配置淘宝 NPM 镜像
RUN npm config set registry https://registry.npmmirror.com

# 安装所有生产依赖（包括 better-sqlite3 的源码）
RUN npm install --only=production --ignore-scripts

# 临时安装编译工具，重新编译 better-sqlite3，然后删除编译工具
RUN apk add --no-cache --virtual .build-deps python3 make g++ && \
    npm rebuild better-sqlite3 && \
    apk del .build-deps

# 从构建阶段复制编译后的代码
COPY --from=builder /app/dist ./dist

# 暴露端口
EXPOSE 3000

# 启动脚本
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "dist/index.js"]
