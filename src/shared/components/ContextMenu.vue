<script setup lang="ts">
import { ref } from 'vue'

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
const isVisable = ref(false)
/** 引用：菜单元素 */
const menuRef = ref<HTMLDivElement | null>(null)

function show(e: MouseEvent, _items: MenuItem[]) {
  e.preventDefault()

  items.value = _items

  const menu = menuRef.value!
  isVisable.value = true

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
  isVisable.value = false
}

defineExpose({ show, hide })
</script>

<template>
  <div class="context-menu absolute rounded bg-secondary border border-color shadow-md z-[1000] text-[0.85rem] overflow-hidden p-1" ref="menuRef" v-show="isVisable">
    <div v-for="item in items" :key="item.title" class="menu-item leading-[1.6rem] px-2 py-1 cursor-pointer transition-all duration-[200ms] ease-in-out rounded hover:bg-primary hover:text-white" @click="item.callback" :title="item?.tips">
      {{ item.title }}
    </div>
  </div>
</template>
