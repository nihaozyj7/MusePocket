# MusePocket

✨ 一款功能强大的本地写作管理工具,助力你的创作之旅

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Vue](https://img.shields.io/badge/Vue-3.5-brightgreen.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)

## 📖 项目简介

MusePocket 是一款专为作家、小说创作者和内容创作者打造的本地写作管理工具。它提供了完整的写作工作流支持,包括书籍管理、章节编辑、实体管理(人物、地点等)、历史版本控制、草稿管理等功能。所有数据完全存储在本地浏览器中,确保你的创作内容安全私密。

## ✨ 核心功能

### 📚 书籍与章节管理
- **多书籍管理**:支持创建和管理多个书籍项目
- **章节组织**:灵活的章节创建、排序、拖拽调整顺序
- **智能命名**:自动生成章节序号(第一章、第二章...)
- **软删除机制**:文章和书籍回收站,防止误删
- **字数统计**:实时统计每章字数

### ✍️ 强大的编辑器
- **所见即所得编辑**:contenteditable 富文本编辑体验
- **自动保存**:可配置的自动保存间隔,防止内容丢失
- **实时字数统计**:编辑时实时显示字数
- **一键排版**:快速优化文章格式
- **查找替换**:高效的内容查找和替换功能
- **快捷键支持**:Ctrl+S 保存、Ctrl+F 查找等常用快捷键

### 🕒 历史版本控制
- **编辑历史记录**:自动记录每次编辑操作
- **Diff 对比**:可视化显示版本差异(新增/删除内容)
- **版本回退**:一键恢复到历史版本
- **撤销/重做**:支持 Ctrl+Z 撤销和 Ctrl+Y 重做
- **快照机制**:定期创建完整快照,优化存储性能

### 🎭 实体管理系统
- **自定义实体类型**:人物、地点、物品等自定义分类
- **实体属性**:为每个实体添加自定义属性(年龄、性格、地理位置等)
- **实体标记**:在文章中标记实体,支持自定义样式(下划线、背景色、文字颜色)
- **悬停预览**:鼠标悬停实体时显示详细信息
- **AI 提取**:集成 OpenAI API,从文章中自动提取实体信息
- **智能合并**:AI 辅助检测和合并重复实体
- **导入导出**:JSON 格式导入导出实体数据

### 📝 草稿管理
- **独立草稿箱**:创建临时草稿,灵感随时记录
- **自动/手动保存**:支持自动保存和手动保存两种模式
- **草稿编辑器**:独立的草稿编辑界面

### 📋 大纲导航
- **标题大纲**:自动提取和管理文章标题结构(H1-H6)
- **大纲编辑**:可视化编辑大纲,调整层级和顺序
- **快速插入**:点击将大纲标题插入编辑器
- **批量插入**:一键插入完整大纲结构

### 🎨 个性化设置
- **视觉定制**
  - 字体大小、行高调整
  - 段落间距控制
  - 编辑器网格线(实线/虚线)
  - 背景图片自定义
- **编辑偏好**
  - 纯文本粘贴模式
  - 实体插入方式
  - 自动保存间隔
- **快捷键配置**:自定义快捷键绑定
- **配置预设**:保存和切换不同的设置方案
- **文本预设**:快速插入常用文本片段

### 🔍 搜索功能
- **全局文章搜索**:快捷键 Ctrl+P 快速搜索文章
- **智能匹配**:支持标题和内容搜索

### 💾 数据管理
- **本地存储**:基于 IndexedDB,所有数据存储在本地
- **导入导出**:支持备份和恢复功能
- **数据隔离**:书籍、文章、实体分表存储

## 🛠️ 技术栈

- **前端框架**:Vue 3.5 (Composition API)
- **开发语言**:TypeScript 5.9
- **构建工具**:Vite 7.2
- **状态管理**:Pinia 3.0 + pinia-plugin-persistedstate
- **路由管理**:Vue Router 4.6
- **本地数据库**:IndexedDB (idb 8.0)
- **样式方案**:UnoCSS (原子化 CSS)
- **工具库**:
  - lodash-es:实用工具函数
  - nanoid:唯一 ID 生成
  - diff:文本差异对比
  - notyf:通知提示

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

### 预览构建

```bash
# 预览生产构建
pnpm preview

# 或
npm run preview
```

## 📁 项目结构

```
MusePocket/
├── src/
│   ├── apis/              # API 接口(OpenAI 等)
│   ├── components/        # Vue 组件
│   │   ├── Editor.vue              # 主编辑器
│   │   ├── HistorySidebar.vue      # 历史记录侧边栏
│   │   ├── EntityManager.vue       # 实体管理器
│   │   ├── DraftManager.vue        # 草稿管理
│   │   ├── OutlineNavigator.vue    # 大纲导航
│   │   ├── SearchArticlePopup.vue  # 文章搜索
│   │   └── ...
│   ├── stores/            # Pinia 状态管理
│   │   ├── SelectedArticleStore.ts  # 当前文章状态
│   │   ├── SelectedBookStore.ts     # 当前书籍状态
│   │   ├── HistoryStore.ts          # 历史记录状态
│   │   ├── EntitysStore.ts          # 实体状态
│   │   ├── SettingStore.ts          # 设置状态
│   │   └── ...
│   ├── views/             # 页面视图
│   │   ├── BooksView.vue           # 书籍列表页
│   │   └── EditView.vue            # 编辑页面
│   ├── db.ts              # IndexedDB 数据库封装
│   ├── types.ts           # TypeScript 类型定义
│   ├── utils.ts           # 工具函数
│   ├── historyUtils.ts    # 历史记录工具
│   └── main.ts            # 应用入口
├── index.html             # HTML 模板
├── vite.config.ts         # Vite 配置
├── tsconfig.json          # TypeScript 配置
└── package.json           # 项目配置
```

## 🎯 使用指南

### 1. 创建你的第一本书

1. 启动应用后,在书籍页面点击 **"📕 新建书籍"**
2. 编辑书名、描述和封面
3. 点击进入书籍开始创作

### 2. 编写章节

1. 在编辑页面左侧点击 **"✏️ 新文章"** 创建章节
2. 双击章节标题可重命名
3. 拖拽章节可调整顺序
4. 在右侧编辑器中编写内容,系统会自动保存

### 3. 管理实体

1. 点击右侧工具栏的 **"实体"** 按钮
2. 切换到 **"新建"** 标签创建人物、地点等
3. 在编辑器中选中文本,点击实体可快速标记
4. 鼠标悬停实体标记可查看详细信息

### 4. 使用历史版本

1. 点击工具栏的 **"🕒 历史"** 按钮
2. 在历史列表中选择版本查看差异
3. 点击 **"回退"** 可恢复到历史版本
4. 使用 **Ctrl+Z** 撤销,**Ctrl+Y** 重做

### 5. AI 辅助功能(可选)

1. 在设置中配置 OpenAI API(需要 API Key)
2. 进入实体管理 → AI 提取
3. 选择文章和提示词,让 AI 自动提取实体

## 🔧 配置说明

### IndexedDB 数据库结构

应用使用 IndexedDB 存储数据,包含以下表:

- `books` - 书籍信息
- `articles` - 文章元数据
- `articleBodies` - 文章内容
- `entities` - 实体数据
- `histories` - 历史记录
- `drafts` - 草稿
- `images` - 图片(Base64)

### 性能优化

项目采用了多项性能优化措施:

- **代码分割**:Vue 组件懒加载
- **Bundle 优化**:Vue、工具库、数据库分包打包
- **节流防抖**:编辑器更新采用节流机制
- **快照策略**:历史记录采用 diff + 定期快照

## 🤝 贡献指南

欢迎贡献代码、报告问题或提出建议!

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 开源协议

本项目采用 MIT 协议开源 - 查看 [LICENSE](LICENSE) 文件了解详情

## 👨‍💻 作者

**BeriCute**

## 🙏 致谢

感谢以下开源项目:

- [Vue.js](https://vuejs.org/) - 渐进式 JavaScript 框架
- [Vite](https://vitejs.dev/) - 下一代前端构建工具
- [Pinia](https://pinia.vuejs.org/) - Vue 状态管理
- [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) - 浏览器端数据库
- [UnoCSS](https://unocss.dev/) - 即时原子化 CSS 引擎

## 📮 反馈与支持

如果你在使用过程中遇到问题或有任何建议,欢迎通过以下方式联系:

- 提交 [Issue](https://github.com/yourusername/musepocket/issues)
- 发送邮件至:your-email@example.com

---

⭐ 如果这个项目对你有帮助,请给个 Star 支持一下!
