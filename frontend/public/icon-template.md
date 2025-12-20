# Griffin PWA Icons

需要生成以下尺寸的图标：

- icon-72x72.png
- icon-96x96.png
- icon-128x128.png
- icon-144x144.png
- icon-152x152.png
- icon-192x192.png
- icon-384x384.png
- icon-512x512.png

## 图标设计建议

- 主题：金色狮鹫（Griffin）或麻将相关元素
- 背景：深色 (#1a1a1a)
- 主色：金色 (#d4af37)
- 简洁图标，适合小尺寸显示

## 临时方案

可以使用 griffin-icon.svg 生成不同尺寸的 PNG。

在线工具：
- https://realfavicongenerator.net/
- https://www.favicon-generator.org/

或使用 ImageMagick 批量生成：
```bash
for size in 72 96 128 144 152 192 384 512; do
  convert griffin-icon.svg -resize ${size}x${size} icon-${size}x${size}.png
done
```

