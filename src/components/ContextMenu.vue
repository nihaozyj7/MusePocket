<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, type Ref } from 'vue'

/** 菜单项 */
export interface MenuItem {
  /** 标题 */
  title: string,
  /** 悬浮提示，原生标签的title属性 */
  tips?: string,
  /** 菜单项被单击后的回调方法 */
  callback: () => void
}

const items = ref<MenuItem[]>([])

/** 状态：是否显示菜单 */
const isVisible = ref(false)
/** 引用：菜单元素 */
const menuRef = ref<HTMLDivElement | null>(null)

function show(e: MouseEvent, _items: MenuItem[]) {
  e.preventDefault()

  items.value = _items

  const menu = menuRef.value!
  isVisible.value = true

  const menuRect = menu.getBoundingClientRect()
  const menuWidth = menuRect.width
  const menuHeight = menuRect.height
  const windowWidth = window.innerWidth
  const windowHeight = window.innerHeight
  let left = e.clientX
  let top = e.clientY

  if (left + menuWidth > windowWidth) {
    left = windowWidth - menuWidth
  }

  if (top + menuHeight > windowHeight) {
    top = windowHeight - menuHeight
  }

  left = Math.max(0, left)
  top = Math.max(0, top)

  menu.style.left = `${left}px`
  menu.style.top = `${top}px`

  setTimeout(() => document.addEventListener('click', hide, { once: true }))
}

function hide() {
  isVisible.value = false
}

defineExpose({ show, hide })
</script>

<template>
  <div class="context-menu" ref="menuRef" :style="{ display: isVisible ? 'block' : 'none' }">
    <div v-for="item in items" :key="item.title" class="menu-item" @click="item.callback" :title="item?.tips">
      {{ item.title }}
    </div>
  </div>
</template>

<style scoped>
.context-menu {
  position: absolute;
  border-radius: 0.25rem;
  background-color: var(--background-secondary);
  border: 1px solid var(--border-color);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  font-size: 0.8rem;
  overflow: hidden;
}

.menu-item {
  line-height: 1.6rem;
  padding: 0.25rem 0.5rem;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.menu-item:hover {
  background-color: var(--background-tertiary);
}
</style>
