# npm 镜像源配置指南

## 为什么需要配置镜像源？

在国内使用npm默认源（registry.npmjs.org）可能会很慢，甚至无法访问。配置国内镜像源可以大幅提升安装速度。

## 常用镜像源

### 1. 腾讯云镜像（推荐，在腾讯云服务器上使用）
```bash
npm config set registry https://mirrors.cloud.tencent.com/npm/
```

**优势：**
- 在腾讯云服务器上速度最快
- 官方维护，稳定可靠
- 同步速度快

### 2. 淘宝镜像（npmmirror.com，原cnpm）
```bash
npm config set registry https://registry.npmmirror.com
```

**优势：**
- 国内最常用的镜像源
- 同步速度快
- 支持范围广

### 3. 华为云镜像
```bash
npm config set registry https://repo.huaweicloud.com/repository/npm/
```

### 4. 中科大镜像
```bash
npm config set registry https://npmreg.proxy.ustclug.org/
```

## 配置方法

### 方法1：全局配置（推荐）

```bash
# 设置镜像源
npm config set registry https://mirrors.cloud.tencent.com/npm/

# 查看当前配置
npm config get registry

# 查看所有配置
npm config list
```

### 方法2：单次使用

```bash
# 单次安装时指定镜像源
npm install --registry=https://mirrors.cloud.tencent.com/npm/
```

### 方法3：使用 .npmrc 文件

在项目根目录创建 `.npmrc` 文件：

```
registry=https://mirrors.cloud.tencent.com/npm/
```

### 方法4：使用 cnpm（淘宝官方工具）

```bash
# 安装cnpm
npm install -g cnpm --registry=https://registry.npmmirror.com

# 使用cnpm代替npm
cnpm install
```

## 恢复默认源

如果需要恢复npm默认源：

```bash
npm config set registry https://registry.npmjs.org/
```

## 针对本项目的建议

### 腾讯云后端服务器
```bash
# 推荐使用腾讯云镜像
npm config set registry https://mirrors.cloud.tencent.com/npm/
cd backend
npm install
```

### 美国VPS
```bash
# 如果VPS在国外，使用默认源即可
# 如果VPS在国内或访问npm较慢，可以使用淘宝镜像
npm config set registry https://registry.npmmirror.com
cd ~/gemini-proxy
npm install
```

## 验证配置

安装完成后，可以通过以下命令验证：

```bash
# 查看npm配置
npm config list

# 测试安装速度
time npm install express
```

## 常见问题

### Q: 配置镜像源后仍然很慢？
A: 
1. 检查网络连接
2. 尝试其他镜像源
3. 清除npm缓存：`npm cache clean --force`

### Q: 某些包安装失败？
A: 
1. 某些包可能只在官方源有，临时切换：`npm install package-name --registry=https://registry.npmjs.org/`
2. 或者使用 `--registry` 参数临时指定源

### Q: 如何为不同项目使用不同源？
A: 在项目根目录创建 `.npmrc` 文件，设置项目特定的镜像源。

