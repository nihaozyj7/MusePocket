<script setup lang="ts">
import { ref, onUnmounted, nextTick, watch, computed } from 'vue'

const props = defineProps({
  /** 弹出层标题 */
  title: { type: String, default: '' },
  /** 可拖拽 */
  draggable: { type: Boolean, default: false },
  /** 每次显示时重置窗口位置（居中） */
  resetPosition: { type: Boolean, default: false },
  /** 是否显示遮罩层 */
  mask: { type: Boolean, default: true },
  /** mask === true 时，遮罩层是否可单击关闭 */
  maskClosable: { type: Boolean, default: false },
  /** 隐藏后销毁（使用 v-if），为 false 时使用 v-show */
  destroyOnClose: { type: Boolean, default: false }
})

/** 关闭事件 */
const emit = defineEmits(['close'])

/** header 元素引用（拖拽把手） */
const headerRef = ref<HTMLElement | null>(null)
/** 窗口元素引用 */
const windowRef = ref<HTMLElement | null>(null)
/** 显示状态（内部控制） */
const isVisible = ref(false)

/** 当前窗口内联样式（用于 left/top/transform）——便于调试与绑定 */
const windowStyle = computed(() => ({ left: windowLeft.value, top: windowTop.value, transform: windowTransform.value }))

/** 是否处于拖拽中 */
let dragging = false
/** 鼠标/触摸到窗口左上角的偏移（像素） */
let offsetX = 0
let offsetY = 0

/** 内联 left/top 字符串（带 px 或百分比） */
const windowLeft = ref<string>('50%')
const windowTop = ref<string>('50%')
const windowTransform = ref<string>('translate(-50%, -50%)')

/**
 * 将窗口居中（用于 resetPosition）
 */
function resetWindowPosition() {
  windowLeft.value = '50%'
  windowTop.value = '50%'
  windowTransform.value = 'translate(-50%, -50%)'
}

/**
 * 设置窗口为像素坐标（移除 translate），以避免拖拽开始时跳动
 * 接受元素的 DOMRect 与当前页面滚动来计算绝对像素位置
 */
function setWindowPixelPositionFromRect(rect: DOMRect) {
  // rect.left/top 已包含滚动偏移（getBoundingClientRect 是相对于视口）
  // 我们直接使用视口坐标做样式（position: absolute 相对于包含块）
  // 为尽量兼容，转换为 px 字符串
  windowLeft.value = `${rect.left}px`
  windowTop.value = `${rect.top}px`
  windowTransform.value = ''
}

function clearDragEvents() {
  document.removeEventListener('mousemove', onDragMoveMouse)
  document.removeEventListener('mouseup', onDragEndMouse)
  document.removeEventListener('touchmove', onDragMoveTouch)
  document.removeEventListener('touchend', onDragEndTouch)
  endDragging()
}

/** 打开弹窗 */
function show() {
  isVisible.value = true
  if (props.resetPosition) nextTick(() => resetWindowPosition())

  if (props.draggable && headerRef.value) {
    headerRef.value.style.cursor = 'move'
  }

  // 确保 headerRef 及其父元素存在后再设置样式
  if (headerRef.value && headerRef.value.parentElement && headerRef.value.parentElement.parentElement) {
    if (props.maskClosable) {
      headerRef.value.parentElement.parentElement.style.cursor = 'pointer'
    } else {
      headerRef.value.parentElement.parentElement.style.cursor = 'default'
    }
  }
}

/** 关闭弹窗 */
function close() {
  isVisible.value = false
  clearDragEvents()
  emit('close')
}

defineExpose({ show, close })

/** 遮罩点击：仅当 mask && maskClosable 时触发 close */
function onMaskClick() {
  if (props.mask && props.maskClosable) close()
}

/**
 * 开始拖拽（鼠标）
 * - 读取当前窗口位置 rect，并把窗口定位到像素坐标（避免 transform 导致跳动）
 * - 计算偏移值（mouse - rect.left/top）
 * - 绑定 document 的 move/up 事件
 */
function onDragStartMouse(e: MouseEvent) {
  if (!props.draggable) return
  const win = windowRef.value
  if (!win) return

  const rect = win.getBoundingClientRect()
  setWindowPixelPositionFromRect(rect)

  offsetX = e.clientX - rect.left
  offsetY = e.clientY - rect.top

  beginDragging()

  document.addEventListener('mousemove', onDragMoveMouse)
  document.addEventListener('mouseup', onDragEndMouse, { once: true })
}

/**  拖拽移动（鼠标） */
function onDragMoveMouse(e: MouseEvent) {
  if (!dragging) return
  const left = e.clientX - offsetX
  const top = e.clientY - offsetY
  applyWindowPositionWithinBounds(left, top)
}

/** 结束拖拽（鼠标）*/
function onDragEndMouse() {
  endDragging()
  document.removeEventListener('mousemove', onDragMoveMouse)
}

/* -------------------- 触摸支持（mobile） -------------------- */
function onDragStartTouch(e: TouchEvent) {
  if (!props.draggable) return
  const win = windowRef.value
  if (!win) return
  const touch = e.touches[0]
  if (!touch) return

  const rect = win.getBoundingClientRect()
  setWindowPixelPositionFromRect(rect)

  offsetX = touch.clientX - rect.left
  offsetY = touch.clientY - rect.top

  beginDragging()
  document.addEventListener('touchmove', onDragMoveTouch, { passive: false })
  document.addEventListener('touchend', onDragEndTouch, { once: true })
}

function onDragMoveTouch(e: TouchEvent) {
  if (!dragging) return
  e.preventDefault()

  const touch = e.touches[0]
  if (!touch) return
  const left = touch.clientX - offsetX
  const top = touch.clientY - offsetY
  applyWindowPositionWithinBounds(left, top)
}

function onDragEndTouch() {
  endDragging()
  document.removeEventListener('touchmove', onDragMoveTouch)
}

/** 开始拖拽时的通用处理（设置状态 / 禁用选中） */
function beginDragging() {
  dragging = true
  document.body.style.userSelect = 'none'
  document.body.style.cursor = 'move'  // 全局光标
  if (headerRef.value) headerRef.value.style.cursor = 'move'
}

/** 结束拖拽时的通用处理（恢复状态） */
function endDragging() {
  dragging = false
  document.body.style.userSelect = ''
  document.body.style.cursor = ''
  if (headerRef.value) headerRef.value.style.cursor = props.draggable ? 'move' : 'default'
}

/**
 * 把像素位置应用到 window 的样式并做边界约束（避免拖出屏幕）
 * @param leftPx left（像素）
 * @param topPx top（像素）
 */
function applyWindowPositionWithinBounds(leftPx: number, topPx: number) {
  const win = windowRef.value
  if (!win) return

  const winRect = win.getBoundingClientRect()
  const docW = document.documentElement.clientWidth
  const docH = document.documentElement.clientHeight

  const w = winRect.width
  const h = winRect.height

  let left = leftPx
  let top = topPx
  const minVisible = 20
  if (left + w < minVisible) left = minVisible - w
  if (left > docW - minVisible) left = docW - minVisible
  if (top + h < minVisible) top = minVisible - h
  if (top > docH - minVisible) top = docH - minVisible

  windowLeft.value = `${Math.round(left)}px`
  windowTop.value = `${Math.round(top)}px`
  windowTransform.value = ''
}
onUnmounted(() => clearDragEvents())

watch(
  () => props.draggable,
  (val) => {
    if (headerRef.value) headerRef.value.style.cursor = val ? 'move' : 'default'
  },
  { immediate: true }
)
</script>

<template>
  <div class="mask" v-if="props.destroyOnClose ? isVisible : true" v-show="props.destroyOnClose ? true : isVisible" @click="onMaskClick">
    <div class="window" ref="windowRef" @click.stop :style="windowStyle">
      <header ref="headerRef" @mousedown.prevent="onDragStartMouse" @touchstart.passive.prevent="onDragStartTouch">
        <h3>{{ props.title }}</h3>
        <button class="close" @click="close">❌</button>
      </header>

      <main>
        <slot></slot>
      </main>
    </div>

    <div class="tips" v-show="props.mask && props.maskClosable">点击空白处关闭</div>
  </div>
</template>

<style scoped>
.mask {
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  background-color: #0005;
  z-index: 999;
}

.tips {
  position: absolute;
  bottom: 1rem;
  font-size: 0.8rem;
  color: var(--text-tertiary);
}

.tips.hide {
  display: none;
}

.window {
  background-color: var(--background-primary);
  border: 1px solid var(--border-color);
  border-radius: 0.25rem;
  overflow: hidden;
  cursor: default;
  display: flex;
  flex-direction: column;
  position: absolute;
}

header {
  width: 100%;
  height: 2rem;
  background-color: var(--background-tertiary);
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 0.5rem;
  user-select: none;
}

.close {
  padding: 0.5rem;
  margin-right: -0.5rem;
}

header>h3 {
  line-height: 1rem;
  font-size: 0.8rem;
  padding: 0;
  margin: 0;
}

main {
  flex: 1;
  height: 0;
  display: flex;
}

.popup-dragging {
  cursor: move !important;
}
</style>
