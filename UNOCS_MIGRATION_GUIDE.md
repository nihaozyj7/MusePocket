# UnoCSS 迁移指南

## 配置完成内容

### 1. 已安装和配置
- ✅ 安装 `unocss` 包
- ✅ 创建 `uno.config.ts` 配置文件
- ✅ 在 `vite.config.ts` 中添加 UnoCSS 插件
- ✅ 在 `main.ts` 中导入 `virtual:uno.css`
- ✅ 更新 `tsconfig.app.json` 添加类型支持
- ✅ 创建 `src/vite-env.d.ts` 声明文件

### 2. 预设的快捷方式（Shortcuts）

在 `uno.config.ts` 中已经配置了以下快捷方式，可以直接使用：

#### 布局类
- `flex-center` - flex items-center justify-center
- `flex-between` - flex items-center justify-between
- `flex-col` - flex flex-col
- `flex-1` - flex-1
- `w-full` / `h-full` - 宽高 100%
- `scroll-container` - 滚动容器

#### 主题色
- `text-primary` / `text-secondary` / `text-tertiary` - 文字颜色
- `bg-primary` / `bg-secondary` / `bg-tertiary` - 背景颜色
- `border-color` - 边框颜色

#### 按钮类
- `btn-base` - 基础按钮样式
- `btn-primary` - 主要按钮（蓝色）
- `btn-secondary` - 次要按钮
- `btn-danger` - 危险按钮（红色）
- `btn-small` - 小按钮

#### 表单类
- `input-base` - 基础输入框
- `select-box` - 下拉选择框
- `textarea-box` - 文本域
- `form-item` - 表单项容器

#### 组件类
- `card-base` - 卡片容器
- `popup-base` - 弹出层基础样式
- `empty-state` - 空状态
- `tabs-base` - 标签页容器
- `tab-button` / `tab-button-active` - 标签按钮
- `info-box` - 信息框
- `warning-box` - 警告框
- `progress-base` - 进度提示
- `divider` - 分割线
- `description` - 描述文字
- `checkbox-label` - 复选框标签
- `actions` / `actions-center` / `actions-end` - 按钮组

## 迁移步骤

### 方案一：渐进式迁移（推荐）

适合大型项目，可以逐步替换：

1. **保留现有 CSS 文件**
   - 继续使用 `variables.css`（CSS 变量定义）
   - 保留 `common-components.css` 中的类名作为 fallback

2. **新组件使用 UnoCSS**
   - 新创建的组件直接使用原子类
   - 使用 `shortcuts` 简化常用组合

3. **逐步重构旧组件**
   - 每次修改组件时，顺便将其样式改为 UnoCSS
   - 优先重构使用频率高的组件

### 方案二：快速迁移

适合想要快速切换的场景：

1. **使用 @apply 指令**
   ```vue
   <style scoped>
   .my-component {
     @apply p-4 bg-secondary rounded border-color;
   }
   </style>
   ```

2. **使用 shortcuts**
   - 将现有的 CSS 类名添加到 `uno.config.ts` 的 `shortcuts` 中
   - 这样现有的 class 名称仍然有效

3. **删除旧 CSS 文件**
   - 确认所有组件都迁移后，删除旧的 CSS 文件

## 使用示例

### 示例 1：基础按钮
```vue
<!-- 旧写法 -->
<template>
  <button class="btn-primary">提交</button>
</template>
<style scoped>
.btn-primary {
  padding: 0.5rem 1rem;
  background-color: var(--primary);
  color: white;
  border: none;
  border-radius: 0.25rem;
  cursor: pointer;
}
</style>

<!-- 新写法 -->
<template>
  <button class="btn-primary">提交</button>
</template>
<!-- 无需 style，使用预设的 shortcut -->
```

### 示例 2：表单组件
```vue
<!-- 旧写法 -->
<template>
  <div class="form-item">
    <label>用户名</label>
    <input type="text" class="input-box" />
  </div>
</template>

<!-- 新写法 - 使用原子类 -->
<template>
  <div class="mb-4">
    <label class="block mb-2 text-sm text-secondary font-medium">用户名</label>
    <input type="text" class="input-base" />
  </div>
</template>

<!-- 或者使用 shortcuts -->
<template>
  <div class="form-item">
    <label>用户名</label>
    <input type="text" class="input-base" />
  </div>
</template>
```

### 示例 3：卡片布局
```vue
<!-- 旧写法 -->
<template>
  <div class="card">
    <h3>标题</h3>
    <p>内容</p>
  </div>
</template>
<style scoped>
.card {
  padding: 1rem;
  background-color: var(--background-secondary);
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
}
</style>

<!-- 新写法 -->
<template>
  <div class="card-base">
    <h3 class="text-primary mb-2">标题</h3>
    <p class="text-secondary">内容</p>
  </div>
</template>
```

### 示例 4：Flex 布局
```vue
<!-- 旧写法 -->
<template>
  <div class="flex-between">
    <span>左侧</span>
    <button>操作</button>
  </div>
</template>
<style scoped>
.flex-between {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
</style>

<!-- 新写法 - 直接使用原子类 -->
<template>
  <div class="flex-between">
    <span>左侧</span>
    <button>操作</button>
  </div>
</template>
<!-- shortcuts 已定义 flex-between -->
```

## 常用原子类对照表

| CSS 属性 | UnoCSS 原子类 | 示例 |
|---------|-------------|------|
| `padding: 1rem` | `p-4` | 4 = 1rem (0.25 * 4) |
| `margin: 0.5rem` | `m-2` | 2 = 0.5rem (0.25 * 2) |
| `font-size: 0.875rem` | `text-[0.875rem]` | 任意值用 [] |
| `color: var(--primary)` | `text-primary` | 使用 shortcut |
| `background-color: var(--bg)` | `bg-secondary` | 使用 shortcut |
| `border-radius: 0.25rem` | `rounded` | 默认 0.25rem |
| `border-radius: 0.5rem` | `rounded-lg` | lg = 0.5rem |
| `display: flex` | `flex` | |
| `align-items: center` | `items-center` | |
| `justify-content: center` | `justify-center` | |
| `gap: 0.5rem` | `gap-2` | |
| `width: 100%` | `w-full` | |
| `height: 100%` | `h-full` | |
| `font-weight: 500` | `font-medium` | |
| `text-align: center` | `text-center` | |
| `cursor: pointer` | `cursor-pointer` | |
| `transition: all 0.2s` | `transition-all duration-200` | |

## 主题变量使用

项目中已经配置了 CSS 变量，可以直接在 UnoCSS 中使用：

```vue
<!-- 方式 1：使用 shortcut（推荐） -->
<div class="text-primary bg-secondary"></div>

<!-- 方式 2：使用任意值 -->
<div class="text-[var(--text-primary)] bg-[var(--background-secondary)]"></div>

<!-- 方式 3：使用 @apply -->
<style scoped>
.my-class {
  @apply text-[var(--text-primary)] bg-[var(--background-secondary)];
}
</style>
```

## 注意事项

1. **CSS 变量保留**
   - `variables.css` 必须保留，因为 shortcuts 依赖这些 CSS 变量
   - 主题切换功能不受影响

2. **Notyf 样式**
   - 第三方库的样式（`notyf.min.css`）保持不变

3. **全局样式**
   - 滚动条样式、全局重置等样式保留在 `index.css`
   - 或者可以迁移到 `uno.config.ts` 的 `preflights` 配置

4. **性能优化**
   - UnoCSS 会按需生成 CSS，未使用的类不会被打包
   - 生产环境构建体积会更小

## 开发建议

1. **使用 IDE 插件**
   - 安装 `UnoCSS` VSCode 扩展
   - 获得自动补全和实时预览

2. **查看生成结果**
   - 开发时可以在 DevTools 查看生成的 CSS
   - 使用 `unocss inspector`（访问 `http://localhost:5173/__unocss__`）

3. **团队协作**
   - 将常用的组合定义为 `shortcuts`
   - 保持命名一致性

## 回滚方案

如果需要回滚到纯 CSS：

1. 恢复 `main.ts` 中的 CSS 导入
2. 移除 `virtual:uno.css` 导入
3. 移除 `vite.config.ts` 中的 UnoCSS 插件
4. 卸载 `unocss` 包

## 参考资源

- [UnoCSS 官方文档](https://unocss.dev/)
- [预设快捷方式](https://unocss.dev/presets/attributify)
- [原子化 CSS 最佳实践](https://unocss.dev/tools/inspector)
