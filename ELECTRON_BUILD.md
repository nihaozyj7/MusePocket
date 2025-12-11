# Electron 打包说明

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install
# 或
pnpm install
```

### 2. 开发模式

在 Electron 窗口中运行应用：

```bash
npm run electron:dev
```

### 3. 打包为 exe

```bash
npm run electron:build:win
```

打包完成后，安装包位于 `release` 目录下。

## 📝 重要说明

### 数据存储隔离

本应用使用 **file:// 协议**，确保数据存储的独立性：

- ✅ 不使用 HTTP 协议，避免域名同源问题
- ✅ 数据存储在用户本地 `%APPDATA%\MusePocket` 目录
- ✅ IndexedDB 数据库独立存储，不会与其他应用冲突
- ✅ 使用 `partition: 'persist:musepocket'` 确保数据持久化

### 数据存储路径

Windows 系统下，数据存储在：
```
C:\Users\{用户名}\AppData\Roaming\MusePocket\
```

每次运行的 Electron 应用都会使用这个独立的存储空间，即使有多个版本也不会互相干扰。

## 🔧 打包配置

### electron-builder.json

关键配置：
- `appId`: 应用唯一标识
- `partition`: 独立数据分区
- `files`: 打包文件列表
- `nsis`: Windows 安装程序配置

### vite.config.ts

关键配置：
- `base: './'`: 使用相对路径，确保 file:// 协议下资源正常加载
- `assetsDir`: 资源目录配置

## 📦 打包产物

成功打包后会生成：

```
release/
├── MusePocket-1.0.0-x64.exe          # 安装程序
└── win-unpacked/                      # 未打包的程序文件（用于测试）
```

## 🐛 常见问题

### Q: 打包后数据丢失？
A: 数据存储在 `%APPDATA%\MusePocket`，卸载应用时会询问是否保留数据。

### Q: 多个版本数据冲突？
A: 使用 `partition: 'persist:musepocket'` 确保所有版本共享同一数据源。

### Q: IndexedDB 无法访问？
A: 确保 `webPreferences` 中没有禁用 IndexedDB 相关权限。

## 🎯 开发建议

1. **开发阶段**: 使用 `npm run electron:dev` 进行调试
2. **测试阶段**: 先构建后在 `win-unpacked` 中测试
3. **发布阶段**: 使用 `npm run electron:build:win` 生成安装包

## 📄 技术细节

### 协议隔离
- 使用 `file://` 协议加载本地 HTML
- 禁止导航到外部链接
- 自定义协议注册（可选）

### 安全配置
```javascript
webPreferences: {
  nodeIntegration: false,      // 禁用 Node 集成
  contextIsolation: true,      // 启用上下文隔离
  webSecurity: true,           // 启用 Web 安全
  partition: 'persist:musepocket'  // 独立数据分区
}
```

### 数据持久化
- IndexedDB 自动持久化到本地
- Pinia 状态也会通过插件持久化
- 图片等资源存储在 IndexedDB 中

## 🌟 最佳实践

1. **定期备份**: 使用应用内的导出功能备份数据
2. **版本管理**: 每次更新前导出数据，更新后验证
3. **测试环境**: 在虚拟机或测试机上先测试新版本
