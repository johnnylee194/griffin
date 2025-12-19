# Griffin Nginx 配置指南

## 1. 创建 Nginx 配置文件

在服务器上执行：

```bash
sudo nano /etc/nginx/sites-available/griffin
```

粘贴以下内容：

```nginx
server {
    listen 80;
    server_name griffin.januslab.cn;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

## 2. 启用配置

```bash
# 创建软链接
sudo ln -s /etc/nginx/sites-available/griffin /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重新加载 Nginx
sudo systemctl reload nginx
```

## 3. 配置 DNS

在腾讯云 DNS 控制台添加 A 记录：
- 主机记录：`griffin`
- 记录类型：`A`
- 记录值：你的服务器 IP
- TTL：默认

## 4. （可选）配置 SSL 证书

```bash
# 安装 certbot
sudo apt install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d griffin.januslab.cn

# 自动续期测试
sudo certbot renew --dry-run
```

## 5. 访问应用

- HTTP: `http://griffin.januslab.cn`
- HTTPS (配置 SSL 后): `https://griffin.januslab.cn`

