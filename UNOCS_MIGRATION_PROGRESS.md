# UnoCSS 迁移进度报告

**开始时间：** 2026-03-24  
**迁移策略：** 方案 B - 完全原子化（保留部分复杂 CSS）

---

## ✅ 已完成（10 个组件）

### 基础组件 (6 个)
1. ✅ `src/shared/components/ConfirmDialog.vue` 
2. ✅ `src/shared/components/Popup.vue`
3. ✅ `src/shared/components/ContextMenu.vue`
4. ✅ `src/shared/components/EditBookPopup.vue`
5. ✅ `src/shared/components/SelectCoverPopup.vue`
6. ✅ `src/shared/components/HistoryViewPopup.vue`

### 页面组件 (3 个)
7. ✅ `src/pages/BooksPage.vue` - 主要样式已迁移，保留复杂 CSS
8. ✅ `src/pages/EditPage.vue` - 主要样式已迁移，保留复杂 CSS
9. ✅ `src/App.vue` - 根组件

### 其他组件 (1 个)
10. ✅ `src/shared/components/ConfirmDialog.vue`

---

## 📋 配置文件状态

### ✅ 已完成
- `uno.config.ts` - 配置 preflights（全局样式）和 shortcuts
- `vite.config.ts` - 已添加 UnoCSS 插件
- `src/app/main.ts` - 已导入 `virtual:uno.css`
- `tsconfig.app.json` - 已添加 UnoCSS 类型
- `src/vite-env.d.ts` - UnoCSS 类型声明
- `src/vue-shim.d.ts` - Vue 文件类型支持

### 📝 保留的文件
- `src/app/styles/variables.css` - **必须保留**（CSS 变量定义，主题系统依赖）
- `notyf.min.css` - 第三方库样式

---

## 📂 待迁移组件（36 个）

### 优先级排序

#### 🔴 高优先级（基础&常用）
1. `src/pages/EditPage.vue` - 编辑器页面
2. `src/App.vue` - 根组件
3. `src/shared/components/EditBookPopup.vue` ✅
4. `src/domains/library/components/EntityManager.vue`
5. `src/domains/editor/components/Editor.vue`

#### 🟡 中优先级（Library 模块 - 11 个）
- `RecycleBinBookPopup.vue`
- `RecycleBinArticlePopup.vue`
- `EntityDetail.vue`
- `EntityCreate.vue`
- `EntityList.vue`
- `EntityMapping.vue`
- `EntityHover.vue`
- `EntityClickPopup.vue`
- `EntityAiExtract.vue`
- `EntityImportExport.vue`
- `EntityHoverAutoInsert.vue`
- `HistorySidebar.vue`
- `MergeSuggestionsList.vue`
- `ArticleSelector.vue`
- `BookImportExport.vue`
- `ArticleImportExport.vue`

#### 🟢 低优先级（Editor 模块 - 6 个）
- `ProofreadTool.vue`
- `ProofreadResultPopup.vue`
- `NameGeneratorTool.vue`
- `LocalProofreadTool.vue`
- `InsertSnippetPopup.vue`
- `FindReplacePopup.vue`
- `AiSuggestionTool.vue`
- `DraftManager.vue`
- `SearchArticlePopup.vue`

#### 🔵 低优先级（Settings 模块 - 8 个）
- `SettingPopup.vue`
- `SettingBase.vue`
- `SettingAiInterface.vue`
- `SettingImage.vue`
- `SettingPreset.vue`
- `SettingPrompt.vue`
- `SettingRegarding.vue`
- `SettingShortcutKey.vue`
- `SettingTextSnippet.vue`
- `ConfigImportExport.vue`

---

## 🎯 迁移策略总结

### 已应用的策略
1. **布局样式** → 完全原子化（flex, p-4, gap-2 等）
2. **主题色** → 使用 shortcuts（text-primary, bg-secondary）
3. **基础组件类** → 保留为 shortcuts（btn-primary, form-item）
4. **全局样式** → 迁移到 preflights
5. **复杂选择器** → 保留 scoped CSS
   - `:nth-child()` 选择器
   - `:hover` 状态（部分）
   - `::-webkit-scrollbar` 等伪元素
   - `-webkit-line-clamp` 等特殊属性

### Shortcuts 分类
- **布局**: flex-center, flex-between, flex-col, w-full, h-full
- **主题色**: text-primary, bg-secondary, border-color
- **按钮**: btn-primary, btn-secondary, btn-danger, btn-small
- **表单**: input-base, form-item, select-box, textarea-box
- **组件**: card-base, empty-state, tabs-base, popup-base

---

## 📊 统计数据

| 类别 | 已迁移 | 待迁移 | 总计 | 完成率 |
|------|--------|--------|------|--------|
| 基础组件 | 6 | 3 | 9 | 67% |
| 页面组件 | 3 | 0 | 3 | 100% |
| Library 模块 | 0 | 16 | 16 | 0% |
| Editor 模块 | 0 | 9 | 9 | 0% |
| Settings 模块 | 0 | 10 | 10 | 0% |
| **总计** | **10** | **33** | **43** | **23%** |

---

## 🗑️ 清理工作（待完成）

### CSS 文件删除
- [ ] 删除 `src/app/styles/index.css`（内容已迁移到 preflights）
- [ ] 删除 `src/shared/styles/common-components.css`（内容已迁移到 shortcuts）
- [x] 保留 `src/app/styles/variables.css`（必须）

### main.ts 清理
- [x] 移除 `./styles/index.css` 导入
- [x] 移除 `@shared/styles/common-components.css` 导入
- [x] 添加 `virtual:uno.css` 导入

---

## ⚠️ 注意事项

### 已处理的特殊情况
1. **Notyf 样式** - 保留第三方 CSS 文件
2. **滚动条样式** - 迁移到 preflights
3. **全局重置** - 迁移到 preflights
4. **动态样式** - 保持内联样式不变
5. **复杂 CSS** - 保留必要的 scoped 样式

### 主题兼容性
所有 shortcuts 使用 CSS 变量，确保主题切换正常工作：
```typescript
// ✅ 正确
'btn-primary': 'bg-[var(--primary)] text-white'
```

---

## 🚀 下一步计划

### 阶段 1：完成基础组件 ✅
- [x] Popup 相关组件
- [x] ContextMenu
- [x] EditBookPopup

### 阶段 2：完成页面组件
- [ ] EditPage.vue
- [ ] App.vue

### 阶段 3：完成 Library 模块
- [ ] Entity 相关组件
- [ ] 回收站组件
- [ ] 导入导出组件

### 阶段 4：完成 Editor 模块
- [ ] Editor 组件
- [ ] 校对工具
- [ ] 其他工具组件

### 阶段 5：完成 Settings 模块
- [ ] 设置相关组件

### 阶段 6：清理和测试
- [ ] 删除旧 CSS 文件
- [ ] 全面功能测试
- [ ] 主题切换测试
- [ ] 构建验证

---

## 📝 迁移技巧总结

### 常用替换对照表
| CSS | UnoCSS |
|-----|--------|
| `display: flex` | `flex` |
| `align-items: center` | `items-center` |
| `justify-content: center` | `justify-center` |
| `padding: 1rem` | `p-4` |
| `margin: 0.5rem` | `m-2` |
| `border-radius: 0.25rem` | `rounded` |
| `background-color: var(--primary)` | `bg-primary` |
| `color: var(--text-secondary)` | `text-secondary` |
| `width: 100%` | `w-full` |
| `height: 100%` | `h-full` |
| `font-size: 0.85rem` | `text-[0.85rem]` |
| `border: 1px solid var(--border-color)` | `border border-color` |

### 复杂样式保留原则
以下情况保留为 scoped CSS：
1. `:nth-child()`, `:first-child` 等伪类
2. 多级嵌套选择器
3. `-webkit-line-clamp` 等特殊属性
4. 复杂的 `:hover` 组合状态
5. 需要继承的样式规则

---

**最后更新：** 2026-03-24  
**下次计划：** 继续迁移 EditPage.vue 和 Library 模块组件
