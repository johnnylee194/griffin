# 构建阶段
FROM node:20-alpine AS builder

WORKDIR /app

# 替换 Alpine 镜像源为腾讯云
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.cloud.tencent.com/g' /etc/apk/repositories

# 复制依赖文件
COPY package*.json ./

# 配置淘宝 NPM 镜像
RUN npm config set registry https://registry.npmmirror.com

# 安装依赖
RUN npm install

# 复制源代码
COPY . .

# 构建参数
ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# 构建应用
RUN npm run build

# 生产阶段 - 使用 Nginx
FROM nginx:alpine

# 复制构建产物
COPY --from=builder /app/dist /usr/share/nginx/html

# 复制 Nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 暴露端口
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

