# MusePocket ✨

**你的创作灵感口袋** - 专业的本地写作管理系统

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Vue](https://img.shields.io/badge/Vue-3.5-brightgreen.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)
![Vite](https://img.shields.io/badge/Vite-7.2-646CFF.svg)
![Electron](https://img.shields.io/badge/Electron-33.2-47848F.svg)

<div align="center">
  <p>
    <a href="#-项目简介">项目简介</a> •
    <a href="#-核心特性">核心特性</a> •
    <a href="#-快速开始">快速开始</a> •
    <a href="#️-技术栈">技术栈</a> •
    <a href="#-贡献指南">贡献</a>
  </p>
</div>

## 📖 项目简介

**MusePocket** 是一款专为作家、小说创作者和内容创作者打造的专业本地写作管理系统。它提供了完整的写作工作流支持,从项目管理到内容创作,从版本控制到AI辅助,全方位提升你的创作效率。

### 🎯 核心特性

- 📚 **完整的项目管理** - 多书籍管理、章节组织、智能排序
- ✍️ **专业的编辑体验** - 富文本编辑、自动保存、实时字数统计
- 🎭 **强大的实体系统** - 人物、地点、物品等自定义实体管理与智能标记
- 🕒 **完善的版本控制** - 历史记录、Diff对比、一键回退、撤销重做
- 🤖 **AI智能辅助** - 实体提取、内容校对、灵感建议、智能取名
- 📋 **便捷的草稿系统** - 书籍级草稿管理,灵感随时记录
- 💾 **本地数据存储** - 基于IndexedDB,所有数据安全存储在本地
- 🎨 **高度可定制化** - 视觉样式、编辑偏好、快捷键等全面自定义

## ✨ 功能特性

### 📚 书籍与章节管理

- ✅ **多项目管理** - 同时管理多个书籍项目,支持自定义封面和描述
- ✅ **灵活的章节组织** - 拖拽排序、批量操作、智能序号生成
- ✅ **软删除与回收站** - 文章和书籍回收站机制,防止误删除
- ✅ **字数统计** - 实时显示单章和全书字数
- ✅ **批量导入导出** - 支持书籍、文章的批量导入导出

### ✍️ 专业编辑器

- ✅ **富文本编辑** - 基于 contenteditable 的所见即所得编辑体验
- ✅ **智能保存** - 可配置的自动保存间隔,保障内容安全
- ✅ **一键排版** - 快速优化文章格式,规范段落间距
- ✅ **查找与替换** - 支持全文查找、批量替换功能
- ✅ **实时字数统计** - 编辑时实时显示当前字数
- ✅ **快捷键支持** - 完整的快捷键体系,可自定义配置
- ✅ **文本片段** - 预设常用文本,快速插入

### 🕒 版本控制系统

- ✅ **自动历史记录** - 每次编辑自动生成历史快照
- ✅ **可视化 Diff** - 直观对比不同版本间的差异
- ✅ **一键回退** - 恢复到任意历史版本
- ✅ **撤销/重做** - 支持 Ctrl+Z/Ctrl+Y 操作
- ✅ **快照优化** - 采用增量diff + 定期完整快照策略,优化存储
- ✅ **历史浏览** - 侧边栏快速浏览和管理历史记录

### 🎭 实体管理系统

- ✅ **自定义实体类型** - 人物、地点、物品、组织等自由定义
- ✅ **丰富的实体属性** - 为每个实体添加自定义属性字段
- ✅ **实体标记** - 在文章中标记实体,支持自定义样式(下划线/背景色/文字颜色)
- ✅ **悬停预览** - 鼠标悬停实体标记时显示详细信息
- ✅ **AI 智能提取** - 基于 OpenAI API 自动从文章中提取实体
- ✅ **智能合并** - AI 辅助检测并合并重复实体
- ✅ **实体图片** - 支持为实体添加图片
- ✅ **导入导出** - JSON 格式导入导出实体数据

### 🤖 AI 辅助工具

- ✅ **AI 校对** - 智能检查文章的语法、错别字、标点等问题
- ✅ **AI 灵感建议** - 根据当前内容提供创作灵感和建议
- ✅ **AI 取名工具** - 根据设定自动生成人物、地点等名称
- ✅ **AI 实体提取** - 自动识别并提取文章中的实体信息
- ✅ **自定义提示词** - 支持自定义 AI 提示词模板
- ✅ **多模型支持** - 支持配置多个 AI 模型接口

### 📝 草稿系统

- ✅ **书籍级草稿** - 每本书独立的草稿空间
- ✅ **灵感速记** - 随时记录创作灵感和想法
- ✅ **自动保存** - 草稿内容自动保存
- ✅ **独立编辑器** - 专门的草稿编辑界面

### 🔍 搜索与导航

- ✅ **全局文章搜索** - Ctrl+P 快速搜索和跳转文章
- ✅ **智能匹配** - 支持标题和内容的模糊搜索
- ✅ **上下文菜单** - 右键快捷操作菜单

### 🎨 个性化定制

**视觉定制**
- ✅ 自定义字体大小和行高
- ✅ 段落间距开关
- ✅ 编辑器网格线(实线/虚线)
- ✅ 背景图片自定义,可设置半透明遮罩增强可读性

**编辑偏好**
- ✅ 纯文本粘贴模式
- ✅ 实体插入方式选择
- ✅ 自动保存间隔配置

**配置管理**
- ✅ 快捷键自定义
- ✅ 配置预设保存与切换
- ✅ 文本片段预设
- ✅ AI 提示词模板管理

### 💾 数据管理

- ✅ **本地存储** - 基于 IndexedDB,数据完全本地化
- ✅ **全库导出** - 支持导出完整数据库(含配置)
- ✅ **模块化导入导出** - 书籍、文章、实体、配置独立导入导出
- ✅ **批量操作** - 支持多本书籍同时导入导出
- ✅ **数据隔离** - 不同数据类型分表存储,互不干扰

## 🛠️ 技术栈

### 核心框架
- **前端框架**: Vue 3.5 (Composition API)
- **开发语言**: TypeScript 5.9
- **构建工具**: Vite 7.2
- **状态管理**: Pinia 3.0 + pinia-plugin-persistedstate
- **路由管理**: Vue Router 4.6

### 数据与存储
- **本地数据库**: IndexedDB (idb 8.0)
- **数据持久化**: Pinia 持久化插件

### 样式与UI
- **CSS方案**: UnoCSS (原子化 CSS)
- **通知组件**: Notyf

### 工具库
- **lodash-es**: 实用工具函数
- **nanoid**: 唯一 ID 生成
- **diff**: 文本差异对比
- **pinyin-pro**: 中文拼音处理

### 开发工具
- **rollup-plugin-visualizer**: Bundle 分析
- **vue-tsc**: TypeScript 类型检查

## 📦 快速开始

### 环境要求

- Node.js >= 18.0
- pnpm >= 8.0 (推荐) 或 npm

### 安装依赖

```bash
# 使用 pnpm (推荐)
pnpm install

# 或使用 npm
npm install
```

### 开发调试

```bash
# 启动开发服务器
pnpm dev

# 或
npm run dev
```

访问 http://localhost:5173 查看应用

### 生产构建

```bash
# 构建生产版本
pnpm build

# 或
npm run build
```

构建产物位于 `dist/` 目录,可直接部署到静态服务器或本地打开 `index.html` 使用

### 打包为桌面应用 (Electron)

```bash
# 安装依赖
npm install

# 打包为 Windows exe
npm run electron:build:win

# 或使用批处理脚本（推荐）
build-electron.bat
```

打包后的安装程序位于 `release/` 目录。详细说明请查看 [ELECTRON_GUIDE.md](./ELECTRON_GUIDE.md)

**重要说明：**
- Electron 版本使用 `file://` 协议，确保数据存储独立性
- 数据存储在 `%APPDATA%\MusePocket` 目录，不受域名影响
- 完全离线可用，数据完全本地化

### 预览构建

```bash
# 预览生产构建
pnpm preview

# 或
npm run preview
```

## 📁 项目架构

### 目录结构

```
MusePocket/
├── src/
│   ├── apis/                      # API 接口层
│   │   └── index.ts              # OpenAI API 封装
│   │
│   ├── components/                # 组件层(35+ 组件)
│   │   ├── Editor.vue            # 核心编辑器组件
│   │   ├── HistorySidebar.vue    # 历史版本侧边栏
│   │   ├── EntityManager.vue     # 实体管理器
│   │   ├── EntityAiExtract.vue   # AI 实体提取
│   │   ├── DraftManager.vue      # 草稿管理器
│   │   ├── FindReplacePopup.vue  # 查找替换弹窗
│   │   ├── SearchArticlePopup.vue # 文章搜索弹窗
│   │   ├── ProofreadTool.vue     # AI 校对工具
│   │   ├── AiSuggestionTool.vue  # AI 灵感建议
│   │   ├── NameGeneratorTool.vue # AI 取名工具
│   │   ├── RecycleBinArticlePopup.vue # 文章回收站
│   │   ├── RecycleBinBookPopup.vue    # 书籍回收站
│   │   ├── Setting*.vue          # 设置相关组件
│   │   └── ...
│   │
│   ├── stores/                    # Pinia 状态管理
│   │   ├── SelectedArticleStore.ts  # 当前文章状态
│   │   ├── SelectedBookStore.ts     # 当前书籍状态
│   │   ├── HistoryStore.ts          # 历史记录状态
│   │   ├── EntitysStore.ts          # 实体数据状态
│   │   ├── EntityTypesStore.ts      # 实体类型状态
│   │   ├── SettingStore.ts          # 用户设置状态
│   │   ├── ModelsStore.ts           # AI 模型配置
│   │   ├── PromptsStore.ts          # AI 提示词配置
│   │   ├── PresetsStore.ts          # 配置预设
│   │   └── TextSnippetsStore.ts     # 文本片段
│   │
│   ├── views/                     # 视图层
│   │   ├── BooksView.vue         # 书籍列表页
│   │   └── EditView.vue          # 编辑器页面
│   │
│   ├── plugins/                   # 插件层
│   │   ├── confirm.ts            # 确认对话框插件
│   │   └── notyf.ts              # 通知插件
│   │
│   ├── db.ts                      # IndexedDB 封装
│   ├── types.ts                   # TypeScript 类型定义
│   ├── utils.ts                   # 通用工具函数
│   ├── historyUtils.ts            # 历史记录工具
│   ├── eventManager.ts            # 事件管理器
│   ├── defaultObjects.ts          # 默认对象配置
│   ├── router.ts                  # 路由配置
│   ├── style.css                  # 全局样式
│   ├── variables.css              # CSS 变量
│   └── main.ts                    # 应用入口
│
├── index.html                     # HTML 模板
├── vite.config.ts                 # Vite 构建配置
├── tsconfig.json                  # TypeScript 配置
├── package.json                   # 项目依赖配置
└── README.md                      # 项目文档
```

### 数据库设计

基于 IndexedDB,采用多表分离设计:

- **books** - 书籍信息表
- **articles** - 文章元数据表(标题、字数、排序等)
- **articleBodies** - 文章内容表(与元数据分离,优化性能)
- **entities** - 实体数据表(人物、地点等)
- **histories** - 历史记录表(编辑历史快照)
- **drafts** - 草稿表(书籍级草稿)
- **images** - 图片表(Base64存储)

### 架构设计

- **模块化架构** - 清晰的分层设计,职责明确
- **状态持久化** - 基于 Pinia + 持久化插件
- **事件驱动** - 使用事件管理器解耦组件通信
- **按需加载** - 大型组件采用懒加载策略
- **性能优化** - 节流防抖、虚拟滚动、增量更新

## 🎯 快速上手

### 1. 创建书籍项目

1. 启动应用后,在书籍页面点击 **"📕 新建书籍"**
2. 填写书名、描述,选择封面图片
3. 点击书籍卡片进入编辑页面

### 2. 开始写作

1. 在左侧章节列表点击 **"✏️ 新文章"** 创建章节
2. 双击章节标题可重命名
3. 拖拽章节调整顺序
4. 在编辑器中自由创作,内容自动保存
5. 使用 **Ctrl+S** 手动保存, **Ctrl+F** 查找文本

### 3. 管理实体

**创建实体**
1. 点击右侧 **"实体"** 工具按钮
2. 切换到 **"新建"** 标签
3. 填写实体名称、类型、描述和属性
4. 可为实体添加图片

**标记实体**
1. 在编辑器中选中文本
2. 在实体列表中点击对应实体
3. 文本将被标记,鼠标悬停可查看详情

**AI 提取实体**
1. 切换到 **"AI提取"** 标签
2. 选择要分析的文章
3. 选择提示词模板,点击提取
4. AI 将自动识别并创建实体

### 4. 版本控制

**查看历史**
1. 点击工具栏 **"🕒 历史"** 按钮
2. 侧边栏显示所有历史版本
3. 点击版本查看 Diff 对比

**回退版本**
1. 在历史列表中选择目标版本
2. 点击 **"回退"** 按钮
3. 确认后内容将恢复到该版本

**撤销重做**
- **Ctrl+Z** - 撤销上一步操作
- **Ctrl+Y** - 重做已撤销的操作

### 5. AI 辅助工具

**配置 AI 接口**
1. 点击右上角 **"⚙️ 设置"**
2. 进入 **"AI接口"** 标签
3. 配置 OpenAI API Key 和模型
4. 可添加多个模型配置

**使用 AI 功能**
- **AI 校对** - 检查语法、错别字、标点符号
- **AI 灵感** - 根据当前内容提供创作建议
- **AI 取名** - 根据设定生成人物、地点名称
- **AI 提取** - 自动识别文章中的实体

### 6. 草稿与灵感

1. 点击工具栏 **"草稿"** 按钮
2. 在草稿编辑器中记录灵感
3. 草稿按书籍分类,随时查看

### 7. 数据备份

**导出数据**
1. 在书籍页面或编辑页面点击导入导出按钮
2. 选择导出范围(单本/多本/全库)
3. 下载 JSON 文件保存

**导入数据**
1. 点击导入按钮
2. 选择之前导出的 JSON 文件
3. 系统自动恢复数据

## ⚙️ 高级配置

### 个性化设置

**基础设置**
- 基准字体大小
- 编辑器字体大小
- 行高倍数
- 段落间距开关
- 自动保存间隔

**视觉设置**
- 网格线开关(实线/虚线)
- 背景图片上传
- 图片背景透明度
- 实体标记样式(下划线/背景色/文字颜色)

**编辑偏好**
- 纯文本粘贴模式
- 实体插入为纯文本
- 快捷键自定义

**AI 设置**
- 多模型配置管理
- 自定义提示词模板
- AI 功能开关

### 快捷键

默认快捷键配置(可自定义):

| 功能 | 快捷键 |
|------|--------|
| 保存 | Ctrl+S |
| 查找 | Ctrl+F |
| 替换 | Ctrl+H |
| 搜索文章 | Ctrl+P |
| 一键排版 | Ctrl+Shift+F |
| 撤销 | Ctrl+Z |
| 重做 | Ctrl+Y |

### 性能优化

项目采用多项性能优化策略:

**代码层面**
- Vue 组件按需加载
- Bundle 分包策略(Vue/工具库/数据库)
- 编辑器节流防抖机制
- 虚拟滚动(大数据列表)

**数据层面**
- 文章元数据与内容分表存储
- 历史记录增量 diff + 定期快照
- IndexedDB 索引优化
- 图片 Base64 压缩存储

**渲染层面**
- 按需绘制视觉配置(网格线等)
- 实体悬停延迟加载
- 防止不必要的组件重渲染

## 🚀 开发计划

### 进行中

- [ ] 协同编辑功能
- [ ] 更多 AI 模型支持
- [ ] 移动端适配

### 规划中

- [ ] 导出为 Word/PDF 格式
- [ ] 更多实体类型预设
- [ ] 写作统计与分析
- [ ] 主题系统

## 🤝 贡献指南

欢迎贡献代码、报告问题或提出建议!

### 如何贡献

1. **Fork** 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 **Pull Request**

### 代码规范

- 遵循 Vue 3 Composition API 最佳实践
- 使用 TypeScript 编写类型安全的代码
- 保持组件职责单一
- 添加必要的注释说明

## 📄 开源协议

本项目采用 MIT 协议开源 - 查看 [LICENSE](LICENSE) 文件了解详情

## 👨‍💻 作者

**热爱游戏的猫猫** (BeriCute)

- 🎮 哔哩哔哩: [热爱游戏的猫猫](https://www.bilibili.com/video/BV1HDmxBcEHQ/?spm_id_from=333.1007.tianma.2-3-6.click&vd_source=cb5b4f84bcb3ce17ed093809fcb41e27)
- 💻 GitHub: [@nihaozyj7](https://github.com/nihaozyj7?tab=repositories)
- 💌 一个热爱创作、热爱游戏的开发者

## 🙏 致谢

感谢以下开源项目:

- [Vue.js](https://vuejs.org/) - 渐进式 JavaScript 框架
- [Vite](https://vitejs.dev/) - 下一代前端构建工具
- [Pinia](https://pinia.vuejs.org/) - Vue 状态管理
- [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) - 浏览器端数据库
- [UnoCSS](https://unocss.dev/) - 即时原子化 CSS 引擎

## 🙋 常见问题

**Q: 数据存储在哪里?**
A: 所有数据都存储在浏览器的 IndexedDB 中,完全本地化,不会上传到任何服务器。

**Q: 如何备份数据?**
A: 使用导入导出功能,可以导出完整数据库或指定书籍到 JSON 文件。

**Q: AI 功能需要付费吗?**
A: 需要自行配置 OpenAI API Key,按 OpenAI 的收费标准计费。

**Q: 可以在多台设备同步吗?**
A: 当前版本数据存储在本地,可通过导入导出功能手动同步。

**Q: 支持 Markdown 吗?**
A: 当前使用富文本编辑器,暂不支持 Markdown 语法。

## 📮 反馈与支持

如果你在使用过程中遇到问题或有任何建议:

- 💬 提交 [Issue](https://github.com/nihaozyj7/MusePocket/issues)
- 🎮 B站私信: [热爱游戏的猫猫](https://www.bilibili.com/video/BV1HDmxBcEHQ/?spm_id_from=333.1007.tianma.2-3-6.click&vd_source=cb5b4f84bcb3ce17ed093809fcb41e27)
- 💻 GitHub: [@nihaozyj7](https://github.com/nihaozyj7?tab=repositories)

## 📄 开源协议

本项目采用 [MIT License](LICENSE) 开源协议。

---

<div align="center">

**⭐ 如果这个项目对你有帮助,请给个 Star 支持一下!**

**Made with ❤️ by 热爱游戏的猫猫**

🎮 [B站主页](https://www.bilibili.com/video/BV1HDmxBcEHQ/?spm_id_from=333.1007.tianma.2-3-6.click&vd_source=cb5b4f84bcb3ce17ed093809fcb41e27) | 💻 [GitHub](https://github.com/nihaozyj7?tab=repositories)

</div>
