# 历史记录与历史版本功能实现说明

## 功能概述

项目已成功实现了**统一的历史记录与历史版本系统**，该系统支持：

1. **历史记录**：单步撤销和重做操作（Undo/Redo）
2. **历史版本**：一次性回退到任意历史版本，并支持 diff 预览

## 核心设计

### 统一模型

历史记录和历史版本本质上是**同一套版本系统**，只是操作方式不同：

- **历史记录**：在版本链上一步一步移动（撤销/重做）
- **历史版本**：在版本链上一次跳多步，并可在回退前预览差异

### 数据结构

#### ArticleHistoryRecord（历史记录类型）

```typescript
interface ArticleHistoryRecord {
  id: string                    // 记录ID
  articleId: string             // 所属文章ID
  diffFromPrev: string | null   // 从上一版本到本版本的diff（JSON字符串）
  fullContent: string | null    // 完整快照（只有栈顶版本有值）
  createdTime: number           // 创建时间
  modifiedTime: number          // 修改时间
  deletedTime: number           // 删除时间
}
```

### 核心机制

#### 1. 只保留栈顶快照

- **栈顶版本**（最新版本）：保存完整内容快照（`fullContent`）和 diff
- **其他版本**：只保存 diff（`diffFromPrev`），`fullContent` 为 null
- 优势：大幅减少存储空间，避免冗余

#### 2. 反向应用 diff 重建历史版本

重建任意版本 `Vk` 的内容：

1. 从栈顶快照开始（最新版本 `Vn`）
2. 从 `n` 反向走到 `k`，依次应用**反向 diff**
3. 最终得到 `Vk` 的完整内容

#### 3. 保存时生成 diff

- 每次保存文章时：
  1. 获取数据库中的旧内容 `oldContent`
  2. 获取编辑器中的新内容 `newContent`（经过清洗）
  3. 生成 `diff = computeDiff(oldContent, newContent)`
  4. 清除旧栈顶的快照
  5. 创建新栈顶记录，保存 `fullContent` 和 `diffFromPrev`

## 文件结构

### 1. 类型定义
- `src/shared/types/index.ts`
  - 定义 `ArticleHistoryRecord` 接口
  - 扩展 `AppDB` 接口，添加 `articleHistories` 表

### 2. 数据库操作
- `src/shared/db/index.ts`
  - `historydb` 类：提供历史记录的 CRUD 操作
  - `createHistory()`: 创建历史记录
  - `getArticleHistories()`: 获取文章的所有历史（按创建时间倒序）
  - `getTopHistory()`: 获取栈顶快照
  - `clearOldTopSnapshot()`: 清除旧栈顶的 fullContent

### 3. 服务层
- `src/domains/editor/services/history.service.ts`
  - `computeDiff()`: 计算两个文本之间的 diff（基于行）
  - `applyDiff()`: 应用 diff 到文本
  - `reverseDiff()`: 反向 diff（用于撤销）
  - `reconstructContentAtIndex()`: 重建指定版本的内容
  - `saveNewVersion()`: 保存新版本

### 4. 状态管理
- `src/domains/editor/stores/history.store.ts`
  - 管理历史记录状态
  - `initArticle()`: 初始化文章的历史记录
  - `undo()`: 单步撤销
  - `redo()`: 单步重做
  - `revertToHistory()`: 回退到指定历史版本
  - `getHistoryContent()`: 获取指定版本内容（用于预览）

### 5. UI 组件
- `src/domains/library/components/HistorySidebar.vue`
  - 历史版本列表展示
  - 点击版本查看 diff 预览
  - 一键回退到选中版本

- `src/pages/EditPage.vue`
  - 集成历史记录功能
  - 保存时触发历史记录
  - 撤销/重做快捷键绑定

## 使用方式

### 1. 撤销/重做（单步操作）

- **撤销**：调用 `historyStore.undo()`
  - 从当前版本往历史方向移动一步
  - 返回上一版本的内容

- **重做**：调用 `historyStore.redo()`
  - 从当前版本往最新方向移动一步
  - 返回下一版本的内容

### 2. 历史版本回退（多步操作）

1. 打开历史版本侧边栏
2. 点击某个历史版本，预览 diff
3. 查看"从当前版本到目标版本"的差异
4. 点击"回退到此版本"按钮
5. 系统会：
   - 重建目标版本内容
   - 保存当前内容作为新版本（回退操作也会生成历史记录）
   - 更新编辑器内容

### 3. Diff 预览

Diff 展示逻辑：
- **方向**：从当前版本 → 目标版本
- **+（绿色）**：回退后会新增的行
- **-（红色）**：回退后会删除的行
- **空（灰色）**：不变的行

顶部高亮提示：
> 💡 以下差异展示的是：从当前版本回退到所选历史版本后的内容变化

## 技术细节

### Diff 算法

使用 `diff` 库的 `diffLines()` 方法：
- 基于行级（line-level）对比
- 性能优于字符级对比
- 适合文本编辑场景

### 版本排序

- 按 `createdTime` 倒序排列
- 最新版本在前（索引 0）
- 符合用户直觉

### 数据一致性

- 保存操作**必须触发**历史记录
- 历史记录基于**数据库清洗后的内容**生成 diff
- 回退操作会生成新版本（保留操作历史）

## 注意事项

1. **栈顶快照丢失问题**
   - 如果栈顶快照丢失，无法重建任何历史版本
   - 确保在清除快照前，新版本已成功保存

2. **性能考虑**
   - 长文本 diff 计算可能较慢
   - 建议对超长文章显示 loading 状态

3. **未保存修改冲突**
   - 执行撤销/重做/回退前，建议提示用户保存当前修改
   - 或自动保存当前状态

## 未来优化方向

1. **版本压缩**
   - 定期合并过多历史版本
   - 保留关键节点版本

2. **版本标签**
   - 支持用户为重要版本添加标签/备注

3. **性能优化**
   - 使用 Web Worker 处理 diff 计算
   - 实现增量 diff

4. **协作功能**
   - 支持多人编辑的版本冲突解决
   - 版本合并功能
