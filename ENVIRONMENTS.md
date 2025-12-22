# Griffin 环境配置说明

Griffin 使用不同的 docker-compose 配置文件来管理多个环境。

## 📋 环境列表

| 环境 | 配置文件 | 容器名称 | 端口 | 域名 |
|------|---------|---------|------|------|
| 生产环境 | `docker-compose.yml` | griffin | 4000 | https://griffin.januslab.cn |
| 测试环境 | `docker-compose.test.yml` | griffin-test | 4001 | https://test.griffin.januslab.cn |
| 本地开发 | `docker-compose.dev.yml` | griffin-dev | 4002 | http://localhost:4002 |

## 🚀 使用方式

### 生产环境
```bash
cd ~/griffin
docker compose up -d --build
```

### 测试环境
```bash
cd ~/griffin-test
docker compose -f docker-compose.test.yml up -d --build
```

### 本地开发
```bash
docker compose -f docker-compose.dev.yml up -d --build
```

## 🔧 环境变量

每个环境都有两个关键环境变量：

- `NODE_ENV`: 控制 Node.js 运行模式（development/production）
- `APP_ENV`: 标识应用环境（dev/test/production），用于显示环境标识

### 生产环境
```yaml
NODE_ENV=production
APP_ENV=production
```

### 测试环境
```yaml
NODE_ENV=production  # 使用生产模式以确保性能
APP_ENV=test         # 标识为测试环境
```

### 本地开发
```yaml
NODE_ENV=development
APP_ENV=dev
```

## 📝 修改配置

1. 编辑对应的 `docker-compose.*.yml` 文件
2. 提交到 Git
3. 在对应环境重新部署

## 🔄 工作流程

```
开发 → push到main → 部署到测试环境 → 测试通过 → 打tag → 部署到生产环境
```

## 🗄️ 数据库

每个环境有独立的数据库文件：
- 生产：`~/griffin/data/griffin.db`
- 测试：`~/griffin-test/data/griffin.db`
- 本地：`./data/griffin.db`

## ⚠️ 注意事项

1. **不要**在生产环境直接测试新功能
2. 测试环境数据可随时清空
3. 生产环境数据需要定期备份
4. 所有配置文件都纳入版本控制

