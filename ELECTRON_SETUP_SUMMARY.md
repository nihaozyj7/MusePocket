# MusePocket Electron 打包配置完成总结

## ✅ 已完成的工作

### 1. Electron 主进程配置
**文件：** `electron/main.js`

关键特性：
- ✅ 使用 **file:// 协议** 加载本地文件
- ✅ 配置独立数据分区 `partition: 'persist:musepocket'`
- ✅ 禁用 Node.js 集成，启用安全隔离
- ✅ 禁止导航到外部链接
- ✅ 支持开发模式和生产模式切换

### 2. 打包配置
**文件：** `electron-builder.json`

配置内容：
- ✅ 应用信息（名称、版本、作者）
- ✅ Windows NSIS 安装程序配置
- ✅ 文件打包策略
- ✅ 输出目录设置（release/）
- ✅ 自定义安装脚本支持

### 3. Vite 构建优化
**文件：** `vite.config.ts`

修改内容：
- ✅ 设置 `base: './'` 使用相对路径
- ✅ 配置资源目录 `assetsDir: 'assets'`
- ✅ 确保在 file:// 协议下资源正确加载

### 4. Package.json 更新
**文件：** `package.json`

新增脚本：
- ✅ `electron:dev` - Electron 开发模式
- ✅ `electron:build` - 打包 Electron 应用
- ✅ `electron:build:win` - 打包为 Windows exe

新增依赖：
- ✅ electron ^33.2.1
- ✅ electron-builder ^25.1.8
- ✅ concurrently ^9.1.0
- ✅ cross-env ^7.0.3
- ✅ wait-on ^8.0.1

### 5. 辅助文件

**批处理脚本：**
- ✅ `build-electron.bat` - 一键打包脚本
- ✅ `dev-electron.bat` - 开发模式启动脚本

**安装器配置：**
- ✅ `build/installer.nsh` - NSIS 安装器自定义脚本

**文档：**
- ✅ `ELECTRON_BUILD.md` - 打包说明文档
- ✅ `ELECTRON_GUIDE.md` - 详细使用指南
- ✅ `public/ICON_README.md` - 图标配置说明
- ✅ `README.md` - 更新了 Electron 打包说明

### 6. .gitignore 更新
- ✅ 忽略 release/ 目录
- ✅ 忽略 .exe, .dmg, .AppImage 等打包产物
- ✅ 忽略 Electron 缓存文件

## 🎯 数据存储方案

### 为什么使用 file:// 协议？

根据你的需求，项目配置为使用 **file:// 协议**而非 HTTP 协议：

1. **避免同源策略问题**
   - HTTP 协议下，不同域名会导致 IndexedDB 数据隔离
   - 更换域名后，之前的数据将无法访问
   - file:// 协议确保数据路径固定

2. **独立数据存储**
   ```javascript
   partition: 'persist:musepocket'
   ```
   - 创建独立的数据分区
   - 数据存储在固定位置：`%APPDATA%\MusePocket\`
   - 不受浏览器缓存清理影响

3. **本地优先**
   - 完全离线可用
   - 无需网络连接
   - 数据完全在本地，安全可控

### 数据存储位置

Windows 系统：
```
C:\Users\{用户名}\AppData\Roaming\MusePocket\Partitions\persist_musepocket\
```

包含：
- IndexedDB 数据库（书籍、文章、实体等）
- LocalStorage 数据
- Pinia 持久化状态
- 图片等二进制数据

## 🚀 使用方法

### 方法一：使用批处理脚本（推荐新手）

1. **开发模式**
   ```
   双击 dev-electron.bat
   ```

2. **打包应用**
   ```
   双击 build-electron.bat
   ```

### 方法二：使用命令行

1. **首次使用，安装依赖**
   ```bash
   npm install
   ```

2. **开发模式**
   ```bash
   npm run electron:dev
   ```

3. **打包为 exe**
   ```bash
   npm run electron:build:win
   ```

### 方法三：分步执行

```bash
# 1. 安装依赖
npm install

# 2. 构建 Vue 应用
npm run build

# 3. 打包 Electron（可选使用 electron-builder）
npx electron-builder --win
```

## 📦 打包产物

成功打包后，在 `release/` 目录下会生成：

```
release/
├── MusePocket-1.0.0-x64.exe          # Windows 安装程序（约 100-150MB）
├── win-unpacked/                      # 未打包版本（用于测试）
│   ├── MusePocket.exe                # 可执行文件
│   ├── resources/                    # 资源文件
│   │   └── app.asar                  # 应用代码包
│   └── ...
└── builder-effective-config.yaml     # 构建配置（调试用）
```

## ⚙️ 关键配置说明

### 1. 数据分区（Partition）

```javascript
partition: 'persist:musepocket'
```

作用：
- 创建独立的数据存储空间
- 确保不同版本共享数据
- 持久化存储，不会被清理

### 2. 安全配置

```javascript
webPreferences: {
  nodeIntegration: false,      // 禁用 Node.js 集成
  contextIsolation: true,      // 启用上下文隔离
  webSecurity: true,           // 启用 Web 安全
}
```

### 3. 协议处理

```javascript
// 生产模式：使用 file:// 协议
mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))

// 开发模式：使用 HTTP 协议
mainWindow.loadURL('http://localhost:5173')
```

## 🔧 常见问题及解决方案

### Q1: 图标问题

**问题：** 打包时提示找不到图标文件

**解决：** 图标配置已被注释，可以正常打包。需要图标时：
1. 准备 `icon.png` (512x512) 和 `icon.ico`
2. 放到 `public/` 目录
3. 取消 `electron/main.js` 和 `electron-builder.json` 中的注释

### Q2: 数据丢失

**问题：** 打包后找不到之前的数据

**原因：**
- 开发模式和生产模式使用不同的数据分区
- 多个版本可能使用不同的 appId

**解决：**
- 使用应用内的导出功能备份数据
- 保持 `partition: 'persist:musepocket'` 不变
- 保持 `appId: 'com.bericute.musepocket'` 不变

### Q3: 打包体积大

**说明：** Electron 应用通常较大（100-150MB）

**原因：**
- 包含完整的 Chromium 浏览器内核
- 包含 Node.js 运行时
- 包含应用代码和资源

**优化：**
- 已使用 asar 打包（electron-builder 默认）
- 已配置 NSIS 压缩
- 可考虑使用便携版（无需安装）

### Q4: 安装器自定义

**需求：** 修改安装器行为

**方法：** 编辑 `build/installer.nsh`
- 自定义安装步骤
- 添加注册表项
- 配置卸载行为

## 📋 后续优化建议

### 1. 添加图标
- [ ] 设计应用图标
- [ ] 生成多尺寸 .ico 文件
- [ ] 取消图标配置注释

### 2. 自动更新
- [ ] 配置 electron-updater
- [ ] 设置更新服务器
- [ ] 添加更新检查逻辑

### 3. 代码签名
- [ ] 申请代码签名证书
- [ ] 配置 electron-builder 签名
- [ ] 避免 Windows SmartScreen 警告

### 4. 多平台支持
- [ ] 配置 macOS 打包
- [ ] 配置 Linux 打包
- [ ] 测试跨平台兼容性

### 5. 性能优化
- [ ] 启用懒加载
- [ ] 优化启动速度
- [ ] 减小安装包体积

## 📚 参考文档

- [Electron 官方文档](https://www.electronjs.org/docs)
- [electron-builder 文档](https://www.electron.build/)
- [Vite 官方文档](https://vitejs.dev/)
- [Vue 3 文档](https://vuejs.org/)

## 🎉 完成清单

- ✅ Electron 主进程配置
- ✅ 打包配置文件
- ✅ Vite 构建优化
- ✅ Package.json 更新
- ✅ 批处理脚本
- ✅ 安装器自定义
- ✅ 完整文档
- ✅ .gitignore 更新
- ✅ 数据存储方案（file:// 协议）
- ✅ 安全配置

## 🚀 立即开始

1. **安装依赖**
   ```bash
   npm install
   ```

2. **开发测试**
   ```bash
   npm run electron:dev
   ```

3. **打包发布**
   ```bash
   npm run electron:build:win
   ```
   或双击 `build-electron.bat`

---

**祝你打包顺利！** 🎊

有问题请查看 [ELECTRON_GUIDE.md](./ELECTRON_GUIDE.md) 获取详细帮助。
