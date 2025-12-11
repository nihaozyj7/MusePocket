# MusePocket Electron 版本使用指南

## 📋 目录

1. [快速开始](#快速开始)
2. [数据存储说明](#数据存储说明)
3. [打包步骤](#打包步骤)
4. [常见问题](#常见问题)

## 🚀 快速开始

### 方法一：使用批处理脚本（推荐）

1. 双击运行 `build-electron.bat`
2. 等待自动完成安装依赖、构建和打包
3. 在 `release` 文件夹找到生成的 exe 安装包

### 方法二：手动命令

```bash
# 1. 安装依赖
npm install

# 2. 开发模式（可选）
npm run electron:dev

# 3. 打包为 exe
npm run electron:build:win
```

## 💾 数据存储说明

### 为什么使用 file:// 协议？

本项目使用 **file:// 协议**而非 HTTP 协议，原因如下：

1. **避免同源策略冲突**
   - HTTP 协议下，不同域名会导致 IndexedDB 数据隔离
   - 如果更换域名，之前的数据将无法访问
   - file:// 协议确保数据存储路径固定

2. **独立数据存储**
   - 使用 `partition: 'persist:musepocket'` 创建独立存储空间
   - 数据存储在 `%APPDATA%\MusePocket\` 目录
   - 不受浏览器缓存清理影响

3. **本地优先**
   - 完全离线可用
   - 无需网络连接
   - 数据完全在本地

### 数据存储位置

Windows 系统：
```
C:\Users\{用户名}\AppData\Roaming\MusePocket\Partitions\persist_musepocket\
```

包含以下数据：
- IndexedDB 数据库（书籍、文章、实体等）
- LocalStorage 数据
- Session 数据
- 图片缓存

## 🔧 打包步骤详解

### 步骤 1：准备环境

确保已安装：
- Node.js >= 18.0
- npm 或 pnpm

### 步骤 2：安装依赖

```bash
npm install
```

关键依赖：
- `electron`: Electron 框架
- `electron-builder`: 打包工具
- `concurrently`: 并发运行工具
- `wait-on`: 等待服务启动

### 步骤 3：构建 Vue 应用

```bash
npm run build
```

这一步会：
- 编译 TypeScript
- 打包 Vue 组件
- 优化资源文件
- 生成 `dist` 目录

### 步骤 4：打包 Electron

```bash
npm run electron:build:win
```

这一步会：
- 读取 `electron-builder.json` 配置
- 将 `dist` 目录和 `electron` 目录打包
- 生成 NSIS 安装程序
- 输出到 `release` 目录

## 📦 打包产物

```
release/
├── MusePocket-1.0.0-x64.exe          # 安装程序（约 100-150MB）
├── win-unpacked/                      # 未打包版本（用于测试）
│   ├── MusePocket.exe
│   ├── resources/
│   └── ...
└── builder-effective-config.yaml     # 构建配置（调试用）
```

## 🎯 开发调试

### 开发模式

```bash
npm run electron:dev
```

这会：
1. 启动 Vite 开发服务器（http://localhost:5173）
2. 等待服务就绪
3. 启动 Electron 窗口并加载页面
4. 自动打开开发者工具

### 测试打包结果

构建后测试：
```bash
npm run build
.\release\win-unpacked\MusePocket.exe
```

## 🐛 常见问题

### Q1: 打包失败，提示找不到图标文件

**解决方案：**
图标配置已被注释，可以正常打包。如需添加图标：

1. 准备 `icon.png` (512x512) 和 `icon.ico`
2. 放到 `public/` 目录
3. 取消 `electron/main.js` 和 `electron-builder.json` 中的图标注释

### Q2: 打包后数据丢失

**原因：** 测试时可能使用了不同的数据分区

**解决方案：**
- 确保 `partition: 'persist:musepocket'` 配置正确
- 检查数据目录：`%APPDATA%\MusePocket`
- 使用应用内导出功能备份数据

### Q3: 安装包太大

**说明：** Electron 应用通常较大（100-150MB），因为包含了：
- Chromium 内核
- Node.js 运行时
- 应用代码和资源

**优化方案：**
- 使用 NSIS 压缩（已配置）
- 使用 asar 打包（electron-builder 默认）
- 考虑使用便携版（无需安装）

### Q4: IndexedDB 数据无法访问

**检查清单：**
1. `webPreferences.webSecurity` 未禁用
2. `partition` 配置正确
3. 使用 file:// 协议加载
4. 检查控制台错误信息

### Q5: 多个版本数据不共享

**说明：** 这是预期行为，但可以通过以下方式共享：

1. 保持 `partition: 'persist:musepocket'` 不变
2. 使用相同的 `appId`: `com.bericute.musepocket`
3. 所有版本安装到相同位置

或者使用导入导出功能手动迁移数据。

## 🔐 安全说明

### 已启用的安全特性

- ✅ `nodeIntegration: false` - 禁用 Node.js 集成
- ✅ `contextIsolation: true` - 启用上下文隔离
- ✅ `webSecurity: true` - 启用 Web 安全
- ✅ 禁止导航到外部链接

### 数据安全

- 所有数据存储在本地
- 不涉及网络传输
- 用户完全控制数据
- 卸载时可选择保留数据

## 📝 修改配置

### 修改应用名称

编辑 `electron-builder.json`:
```json
{
  "productName": "你的应用名称"
}
```

### 修改应用 ID

编辑 `electron-builder.json`:
```json
{
  "build": {
    "appId": "com.yourname.yourapp"
  }
}
```

**注意：** 修改 appId 会导致数据存储路径改变！

### 修改窗口大小

编辑 `electron/main.js`:
```javascript
mainWindow = new BrowserWindow({
  width: 1400,    // 修改宽度
  height: 900,    // 修改高度
  // ...
})
```

## 🌟 最佳实践

1. **开发阶段**
   - 使用 `npm run electron:dev` 快速调试
   - 修改代码后自动热重载

2. **测试阶段**
   - 先在 `win-unpacked` 中测试
   - 验证功能和数据持久化

3. **发布阶段**
   - 更新版本号
   - 完整打包并测试安装流程
   - 准备更新日志

4. **数据安全**
   - 定期使用导出功能备份
   - 升级前导出数据
   - 测试新版本后再正式使用

## 📞 获取帮助

遇到问题？

1. 查看 [ELECTRON_BUILD.md](./ELECTRON_BUILD.md)
2. 检查 Electron 官方文档
3. 查看 electron-builder 文档
4. 提交 Issue

---

**祝你打包顺利！** 🎉
