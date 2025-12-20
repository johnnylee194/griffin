# PWA Icons

PWA 图标应该手动生成并提交到 git。

## 生成方法

### 方法 1：使用在线工具（推荐）
1. 访问 https://realfavicongenerator.net/
2. 上传 griffin-icon.svg
3. 选择 "Generate icons for Web, Android, Microsoft, and more"
4. 下载并替换本目录的图标文件

### 方法 2：使用 ImageMagick（本地命令行）
```bash
cd frontend/public
for size in 72 96 128 144 152 192 384 512; do
  convert griffin-icon.svg -resize ${size}x${size} icon-${size}x${size}.png
done
```

### 方法 3：使用设计软件
使用 Figma/Photoshop/Sketch 等工具，导出不同尺寸的 PNG。

## 所需文件
- icon-72x72.png
- icon-96x96.png
- icon-128x128.png
- icon-144x144.png
- icon-152x152.png
- icon-192x192.png
- icon-384x384.png
- icon-512x512.png

注意：这些文件应该提交到 git，服务器直接使用，不需要在服务器上生成。

