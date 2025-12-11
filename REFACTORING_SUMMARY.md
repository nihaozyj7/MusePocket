# MusePocket 项目重构总结

## 重构完成时间
2025-12-11

## 重构目标
按"分层 + 按领域聚合"的方式梳理目录结构,文件定位更直观、跨文件依赖更明确、可扩展性更好,同时迁移成本可控。

## 新的目录结构

```
src/
├── app/                       # 应用级入口与全局能力
│   ├── main.ts               # 应用入口文件
│   ├── router/               # 路由配置
│   │   └── index.ts
│   ├── plugins/              # 插件集合
│   │   ├── confirm.ts
│   │   ├── notyf.ts
│   │   └── index.ts
│   └── styles/               # 全局样式
│       ├── index.css
│       └── variables.css
│
├── shared/                    # 跨领域通用模块
│   ├── components/           # 通用基础组件
│   │   ├── Popup.vue
│   │   ├── ContextMenu.vue
│   │   ├── ConfirmDialog.vue
│   │   ├── EditBookPopup.vue
│   │   ├── SelectCoverPopup.vue
│   │   ├── HistoryViewPopup.vue
│   │   └── index.ts
│   ├── db/                   # 数据库封装
│   │   └── index.ts
│   ├── types/                # TypeScript 类型定义
│   │   └── index.ts
│   ├── utils/                # 通用工具函数
│   │   ├── index.ts
│   │   ├── event-bus.ts
│   │   └── entity-mapping.ts
│   └── constants/            # 常量定义
│       └── defaults.ts
│
├── core/                      # 核心基础设施
│   └── api/                  # API 客户端
│       ├── openai.client.ts
│       └── index.ts
│
├── domains/                   # 按领域聚合的业务模块
│   ├── editor/               # 编辑器领域
│   │   ├── components/       # 编辑器相关组件
│   │   │   ├── Editor.vue
│   │   │   ├── FindReplacePopup.vue
│   │   │   ├── ProofreadTool.vue
│   │   │   ├── AiSuggestionTool.vue
│   │   │   ├── NameGeneratorTool.vue
│   │   │   ├── DraftManager.vue
│   │   │   ├── SearchArticlePopup.vue
│   │   │   └── InsertSnippetPopup.vue
│   │   ├── stores/            # 编辑器状态管理
│   │   │   ├── history.store.ts
│   │   │   ├── selected-article.store.ts
│   │   │   └── text-snippets.store.ts
│   │   ├── services/          # 编辑器业务逻辑
│   │   │   └── history.service.ts
│   │   └── index.ts
│   │
│   ├── library/              # 文库/书籍与文章领域
│   │   ├── components/       # 文库相关组件
│   │   │   ├── HistorySidebar.vue
│   │   │   ├── RecycleBinArticlePopup.vue
│   │   │   ├── RecycleBinBookPopup.vue
│   │   │   ├── ArticleImportExport.vue
│   │   │   ├── BookImportExport.vue
│   │   │   ├── EntityManager.vue
│   │   │   ├── EntityAiExtract.vue
│   │   │   ├── EntityCreate.vue
│   │   │   ├── EntityDetail.vue
│   │   │   ├── EntityHover.vue
│   │   │   ├── EntityHoverAutoInsert.vue
│   │   │   ├── EntityImportExport.vue
│   │   │   ├── EntityList.vue
│   │   │   └── EntityMapping.vue
│   │   ├── stores/            # 文库状态管理
│   │   │   ├── selected-book.store.ts
│   │   │   ├── entities.store.ts
│   │   │   └── entity-types.store.ts
│   │   └── index.ts
│   │
│   └── settings/             # 设置与配置领域
│       ├── components/       # 设置相关组件
│       │   ├── SettingPopup.vue
│       │   ├── SettingBase.vue
│       │   ├── SettingAiInterface.vue
│       │   ├── SettingImage.vue
│       │   ├── SettingPreset.vue
│       │   ├── SettingPrompt.vue
│       │   ├── SettingRegarding.vue
│       │   ├── SettingShortcutKey.vue
│       │   ├── SettingTextSnippet.vue
│       │   └── ConfigImportExport.vue
│       ├── stores/            # 设置状态管理
│       │   ├── settings.store.ts
│       │   ├── models.store.ts
│       │   ├── prompts.store.ts
│       │   └── presets.store.ts
│       └── index.ts
│
└── pages/                     # 页面级组件
    ├── BooksPage.vue
    └── EditPage.vue
```

## 路径别名配置

在 `vite.config.ts` 和 `tsconfig.app.json` 中配置了以下路径别名:

```typescript
{
  '@': 'src/',
  '@app': 'src/app/',
  '@shared': 'src/shared/',
  '@core': 'src/core/',
  '@domains': 'src/domains/',
  '@pages': 'src/pages/'
}
```

## 主要改进

### 1. 清晰的分层架构
- **app/**: 应用入口、路由、插件、全局样式
- **shared/**: 跨领域通用模块,无业务含义
- **core/**: 核心基础设施封装(API、错误处理等)
- **domains/**: 按领域聚合的业务模块,高内聚
- **pages/**: 页面级组件,对应路由

### 2. 按领域聚合
每个 domain 内自带:
- `components/`: 领域特定的组件
- `stores/`: 领域状态管理
- `services/`: 领域业务逻辑
- `index.ts`: 统一导出

### 3. 命名规范
- **Store**: 使用小写短横线 + `.store.ts`
- **Service**: 使用 `.service.ts`
- **组件**: PascalCase
- **页面**: 统一 `Page` 后缀

### 4. 更清晰的依赖关系
- 应用入口从 `src/main.ts` 移至 `src/app/main.ts`
- 所有导入使用路径别名,减少相对路径
- 通过 barrel files (`index.ts`) 统一导出

## 已删除的旧文件

以下旧目录和文件已被删除:
- `src/views/` (已迁移到 `pages/`)
- `src/components/` (已分散到各 domain 和 shared/)
- `src/stores/` (已分散到各 domain/)
- `src/apis/` (已迁移到 `core/api/`)
- `src/plugins/` (已迁移到 `app/plugins/`)
- `src/main.ts` (已迁移到 `app/main.ts`)
- `src/router.ts` (已迁移到 `app/router/index.ts`)
- `src/style.css` (已迁移到 `app/styles/index.css`)
- `src/variables.css` (已迁移到 `app/styles/variables.css`)
- `src/db.ts` (已迁移到 `shared/db/index.ts`)
- `src/types.ts` (已迁移到 `shared/types/index.ts`)
- `src/utils.ts` (已迁移到 `shared/utils/index.ts`)
- `src/defaultObjects.ts` (已迁移到 `shared/constants/defaults.ts`)
- `src/eventManager.ts` (已迁移到 `shared/utils/event-bus.ts`)
- `src/entityMappingService.ts` (已迁移到 `shared/utils/entity-mapping.ts`)
- `src/historyUtils.ts` (已迁移到 `domains/editor/services/history.service.ts`)

## 迁移工具

项目中包含以下迁移辅助脚本:
- `update-imports.ps1`: 批量更新导入路径
- `fix-relative-imports.ps1`: 修复相对导入路径

## 验证

重构后应用成功编译和启动,无编译错误,所有功能正常运行。

开发服务器: http://localhost:5174/

## 未来优化建议

1. **类型拆分**: 将 `shared/types/index.ts` 按领域拆分为多个文件
2. **数据库层**: 引入 repositories 模式,将实体数据访问分离到各 domain
3. **组合式函数**: 为常用业务逻辑创建 `composables/`
4. **单元测试**: 在各 domain 就近添加测试文件
5. **文档**: 为每个 domain 添加 README 说明其职责

## 注意事项

- 所有 store 的命名已改为小写短横线形式(如 `history.store.ts`)
- 导入路径全部更新为使用路径别名
- 组件的相对导入已修复为使用 `@shared/components`
- 入口文件路径已在 `index.html` 中更新

## 迁移完成

重构工作已完成,项目结构更加清晰、可维护性更强,为未来扩展打下了良好的基础。

