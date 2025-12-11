# 图标文件说明

请在此目录放置以下图标文件：

## 需要的图标文件

1. **icon.png** (512x512 或更大)
   - 用于开发和部分平台

2. **icon.ico** (多尺寸)
   - Windows 安装程序图标
   - 建议包含尺寸：16x16, 32x32, 48x48, 64x64, 128x128, 256x256

## 快速生成图标

### 在线工具
- https://www.icoconverter.com/
- https://convertio.co/zh/png-ico/

### 使用命令行工具
```bash
# 安装 electron-icon-builder
npm install -g electron-icon-builder

# 从 PNG 生成所有平台图标
electron-icon-builder --input=./logo.png --output=./public
```

## 临时方案

如果暂时没有图标，可以注释掉 electron/main.js 和 electron-builder.json 中的图标配置：

**electron/main.js**
```javascript
// icon: path.join(__dirname, '../public/icon.png'),
```

**electron-builder.json**
```json
// "icon": "public/icon.ico",
```
