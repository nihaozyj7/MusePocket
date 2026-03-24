# UnoCSS 配置总结

## ✅ 已完成的配置

### 1. 安装依赖
```bash
pnpm add -D unocss
```

### 2. 配置文件

#### `uno.config.ts`（根目录）
```typescript
import { defineConfig, presetAttributify, presetIcons, presetTypography, presetUno, transformerDirectives, transformerVariantGroup } from 'unocss'

export default defineConfig({
  presets: [
    presetUno(),
    presetAttributify(),
    presetIcons(),
    presetTypography(),
  ],
  transformers: [
    transformerDirectives(),
    transformerVariantGroup(),
  ],
  shortcuts: {
    // 布局类
    'flex-center': 'flex items-center justify-center',
    'flex-between': 'flex items-center justify-between',
    'flex-col': 'flex flex-col',
    'flex-1': 'flex-1',
    'w-full': 'w-full',
    'h-full': 'h-full',
    
    // 主题色
    'text-primary': 'color-[var(--text-primary)]',
    'text-secondary': 'color-[var(--text-secondary)]',
    'text-tertiary': 'color-[var(--text-tertiary)]',
    'bg-primary': 'bg-[var(--background-primary)]',
    'bg-secondary': 'bg-[var(--background-secondary)]',
    'bg-tertiary': 'bg-[var(--background-tertiary)]',
    'border-color': 'border-color-[var(--border-color)]',
    
    // 按钮类
    'btn-base': 'px-2 py-1 text-sm rounded cursor-pointer transition-all duration-200 border border-[var(--border-color)] bg-[var(--background-tertiary)] text-[var(--text-primary)] hover:opacity-60 disabled:opacity-50 disabled:cursor-not-allowed',
    'btn-primary': 'btn-base bg-[var(--primary)] text-white border-none hover:opacity-90',
    'btn-secondary': 'btn-base hover:bg-[var(--background-secondary)]',
    'btn-danger': 'btn-base bg-[var(--danger)] text-white border-none hover:opacity-90',
    'btn-small': 'btn-base px-3 py-1',
    
    // 表单类
    'input-base': 'w-full px-2 py-2 border border-[var(--border-color)] rounded bg-[var(--background-secondary)] text-[var(--text-primary)] text-sm focus:border-[var(--primary)] focus:outline-none transition-colors',
    'form-item': 'mb-4',
    
    // 组件类
    'card-base': 'p-4 bg-[var(--background-secondary)] border border-[var(--border-color)] rounded-lg hover:border-[var(--primary)] hover:shadow-md transition-all',
    'empty-state': 'flex flex-col items-center justify-center p-12 text-center text-[var(--text-tertiary)]',
    'tabs-base': 'flex justify-between bg-[var(--background-tertiary)] h-9 rounded overflow-hidden m-2',
    'tab-button': 'flex-1 px-2 py-1 border-r border-[var(--border-color)] rounded-none bg-transparent text-[var(--text-secondary)] cursor-pointer transition-all hover:text-[var(--text-primary)] last:border-r-0',
    'tab-button-active': 'text-[var(--primary)] border-b-2 border-[var(--primary)]',
    'popup-base': 'absolute bg-[var(--background-primary)] rounded border border-[var(--border-color)] p-2 shadow-md',
    'scroll-container': 'w-full h-full overflow-auto',
    'actions': 'flex gap-2',
    'actions-center': 'flex gap-2 justify-center',
    'actions-end': 'flex gap-2 justify-end',
    'divider': 'h-px bg-[var(--border-color)] my-4',
    'description': 'text-[var(--text-secondary)] text-[0.85rem] leading-normal mb-3',
    'info-box': 'bg-[var(--background-secondary)] border-l-3 border-[var(--primary)] p-3 rounded my-4',
    'warning-box': 'p-3 bg-[rgba(255,193,7,0.1)] border border-[rgba(255,193,7,0.3)] rounded text-[var(--text-primary)] text-sm',
    'progress-base': 'p-2 bg-[var(--background-tertiary)] rounded text-sm text-[var(--text-secondary)] text-center',
    'checkbox-label': 'flex items-center gap-2 text-sm cursor-pointer select-none',
    'select-box': 'w-full px-2 py-2 border border-[var(--border-color)] rounded bg-[var(--background-tertiary)] text-[var(--text-primary)] text-sm cursor-pointer focus:border-[var(--primary)] focus:outline-none transition-colors',
    'textarea-box': 'w-full px-2 py-2 border border-[var(--border-color)] rounded bg-[var(--background-secondary)] text-[var(--text-primary)] text-sm resize-y min-h-[80px] focus:border-[var(--primary)] focus:outline-none transition-colors font-inherit',
  },
  rules: [
    ['border-l-3', { 'border-left-width': '3px' }],
  ],
  theme: {
    colors: {
      primary: 'var(--primary)',
      'primary-light': 'var(--primary-light)',
      'primary-dark': 'var(--primary-dark)',
      secondary: 'var(--secondary)',
      success: 'var(--success)',
      warning: 'var(--warning)',
      danger: 'var(--danger)',
      info: 'var(--info)',
    },
  },
})
```

#### `vite.config.ts`（更新）
```typescript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import UnoCSS from 'unocss/vite'  // 新增
import path from 'path'
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig({
  base: './',
  plugins: [
    vue(),
    UnoCSS(),  // 新增
    visualizer({
      filename: './dist/stats.html',
      open: true,
      gzipSize: true,
      brotliSize: true
    })
  ],
  // ... 其他配置保持不变
})
```

#### `src/app/main.ts`（更新）
```typescript
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import 'virtual:uno.css'  // 新增：导入 UnoCSS
import './styles/variables.css'  // 保留 CSS 变量
import 'notyf/notyf.min.css'
// 移除了旧的 CSS 文件导入
// import './styles/index.css'
// import '@shared/styles/common-components.css'
import App from '@/App.vue'
import router from './router'
import { useSettingStore } from '@domains/settings/stores/settings.store'
import { preventDuplicateTab } from '@shared/utils'

// ... 其余代码保持不变
```

#### `tsconfig.app.json`（更新）
```json
{
  "extends": "@vue/tsconfig/tsconfig.dom.json",
  "compilerOptions": {
    "types": [
      "vite/client",
      "unocss/vite"  // 新增
    ],
    // ... 其他配置保持不变
  }
}
```

#### `src/vite-env.d.ts`（新增）
```typescript
/// <reference types="vite/client" />
/// <reference types="unocss/vite" />

declare module 'virtual:uno.css' {
  export default string
}
```

#### `src/vue-shim.d.ts`（新增，解决 Vue 文件类型问题）
```typescript
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}
```

## 📝 使用方式

### 1. 使用 Shortcuts（推荐）
```vue
<template>
  <div class="flex-between">
    <h3 class="text-primary">标题</h3>
    <button class="btn-primary">操作</button>
  </div>
</template>
```

### 2. 使用原子类
```vue
<template>
  <div class="flex items-center justify-between p-4 bg-secondary rounded">
    <span class="text-primary">内容</span>
    <button class="px-4 py-2 bg-primary text-white rounded hover:opacity-90">
      按钮
    </button>
  </div>
</template>
```

### 3. 使用 @apply 指令
```vue
<style scoped>
.custom-card {
  @apply p-4 bg-secondary rounded border border-color hover:border-primary;
}
</style>
```

### 4. 使用 variant group
```vue
<template>
  <div class="hover:(bg-primary text-white) dark:(bg-gray-800 text-gray-200)">
    内容
  </div>
</template>
```

## 🎨 可用的 Shortcuts

### 布局
- `flex-center` - 居中 Flex 布局
- `flex-between` - 两端对齐 Flex 布局
- `flex-col` - 垂直 Flex 布局
- `w-full` / `h-full` - 宽高 100%
- `scroll-container` - 滚动容器

### 主题色
- `text-primary` / `text-secondary` / `text-tertiary` - 文字颜色
- `bg-primary` / `bg-secondary` / `bg-tertiary` - 背景颜色
- `border-color` - 边框颜色

### 按钮
- `btn-primary` - 主要按钮（蓝色）
- `btn-secondary` - 次要按钮
- `btn-danger` - 危险按钮（红色）
- `btn-small` - 小按钮

### 表单
- `input-base` - 输入框
- `select-box` - 下拉框
- `textarea-box` - 文本域
- `form-item` - 表单项

### 组件
- `card-base` - 卡片
- `popup-base` - 弹出层
- `empty-state` - 空状态
- `tabs-base` - 标签页
- `info-box` - 信息框
- `warning-box` - 警告框
- `actions` - 按钮组
- `divider` - 分割线

## 🔄 迁移策略

### 方案 A：渐进式迁移（推荐）
1. 保留 `variables.css`（必须）
2. 新组件直接使用 UnoCSS
3. 修改旧组件时逐步迁移
4. 最后删除旧的 CSS 文件

### 方案 B：快速迁移
1. 将所有旧 CSS 类名添加到 `shortcuts`
2. 保持现有 class 名称不变
3. 逐步替换为原子类

## 🛠️ 开发工具

### VSCode 扩展
安装 **UnoCSS** 扩展获得：
- 自动补全
- 类名提示
- 实时预览

### UnoCSS Inspector
开发时访问：`http://localhost:5173/__unocss__`
- 查看已使用的类
- 查看生成的 CSS
- 调试样式

## 📊 优势

1. **更小的打包体积** - 按需生成，未使用的类不会打包
2. **更快的开发速度** - 无需想类名，直接写原子类
3. **更好的可维护性** - 样式集中管理，避免分散在多个文件
4. **主题支持** - 完美支持现有的 CSS 变量主题系统
5. **零配置** - 预设了所有常用样式

## ⚠️ 注意事项

1. **CSS 变量文件必须保留** - `variables.css` 定义了主题变量
2. **第三方样式保持不变** - 如 `notyf.min.css`
3. **全局样式** - 滚动条等全局样式可以保留在 CSS 文件或迁移到 `preflights`

## 📚 学习资源

- [UnoCSS 官方文档](https://unocss.dev/)
- [Preset Uno](https://unocss.dev/presets/uno)
- [Preset Attributify](https://unocss.dev/presets/attributify)
- [Transformers](https://unocss.dev/transformers/directives)

## 🚀 快速开始

```bash
# 1. 安装依赖（已完成）
pnpm add -D unocss

# 2. 启动开发服务器
npm run dev

# 3. 访问 UnoCSS Inspector
# http://localhost:5173/__unocss__
```

## ✅ 验证配置

运行开发服务器，如果没有错误说明配置成功：
```bash
npm run dev
```

查看生成的 CSS：
1. 打开浏览器 DevTools
2. 查看应用的样式
3. 确认 UnoCSS 生成的 CSS 已加载
