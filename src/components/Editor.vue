<script setup lang="ts">
import { useSelectedArticleStore } from '@/stores/SelectedArticleStore'
import { useSettingStore } from '@/stores/SettingStore'
import { countNonWhitespace, fixEditorDomLight, getActualLineHeight, getQueue, insertText, insertVariableSpan, isCaretInViewport, isCursorInValidNode, moveCaretToEndAndScrollToBottom, newlineToP, restoreCursorPosition, saveCursorPosition, scrollCaretDownIntoView, scrollCaretIntoView, StyleManager, trimAndReduceNewlines } from '@/utils'
import { throttle } from 'lodash-es'
import { nextTick, onMounted, onUnmounted, ref } from 'vue'
import EntityHover from './EntityHover.vue'

interface Props {
  /** update 事件触发的节流时间（毫秒） */
  updateThrottleTime: number
}

const props = defineProps<Props>()

/** 新旧内容 */
const history = getQueue<string>(3)
/** 编辑区容器 */
const bodyRef = ref<HTMLDivElement>()
/** 绘制背景的画布 */
const bodyBackgroundRef = ref<HTMLCanvasElement>()
/** 实体悬浮层 */
const entityHoverRef = ref<InstanceType<typeof EntityHover>>()

/** 配置项 */
const settingStore = useSettingStore()
/** 当前文章 */
const selectedArticleStore = useSelectedArticleStore()

/** 样式管理 */
let styleManager = new StyleManager()

/** 观察者实例 */
let observer: ResizeObserver

/** 状态栏数据 */
const statusBarRight = ref({
  saveState: '✅ 已保存',
  selectedWordCount: 0
})

const emit = defineEmits({
  /** 编辑器内容更新, 传入新内容和更新前的旧内容 */
  'update:articleBody': (nc: string, oc?: string) => true,
  /** 文章标题更新 */
  'update:articleTitle': (title: string) => true,
  /** 新建章节 */
  'create:article': () => true
})

onMounted(() => {
  observer = new ResizeObserver(handleResize)
  observer.observe(bodyRef.value)
  document.addEventListener('selectionchange', handleTextSelect)
  settingStore.setEditorWidthMode()

  if (settingStore.enableParagraphSpacing) {
    styleManager.add('.body>p', {
      'margin-bottom': settingStore.lineHeight + 'rem'
    })
  }
  styleManager.add('.body>p', { minHeight: settingStore.lineHeight + 'rem' })
})

onUnmounted(() => {
  observer.disconnect()
  document.removeEventListener('selectionchange', handleTextSelect)
  styleManager?.clear()
})

const _emitUpdate = () => {
  const text = trimAndReduceNewlines(bodyRef.value.innerText, { removeBlankLines: true })
  history.push(text)
  emit('update:articleBody', history.items[0], history.items[1])
}
/** 节流 触发内容更新事件 */
const emitUpdate = throttle(_emitUpdate, props.updateThrottleTime)

/** 光标跳转到中间 节流 */
const handleJumpToMiddle = throttle(() => {
  scrollCaretDownIntoView(bodyRef.value.parentElement)
}, 100)

/** 监听编辑区大小变化 */
const handleResize = throttle((entries) => {
  const lineHeight = getActualLineHeight(bodyRef.value)
  const containerHeight = bodyRef.value.parentElement.clientHeight
  const center = containerHeight / 2
  const overflow = center - (center % lineHeight)
  const newWidth = entries[0].contentRect.width
  const newHeight = entries[0].contentRect.height + overflow

  // 只在尺寸真正改变时才更新canvas
  if (bodyBackgroundRef.value.width !== newWidth || bodyBackgroundRef.value.height !== newHeight) {
    bodyBackgroundRef.value.width = newWidth
    bodyBackgroundRef.value.height = newHeight

    drawBackground(lineHeight, {
      width: newWidth,
      height: newHeight
    })
  }
}, 100)

/** 绘制背景 */
const drawBackground = (function () {
  let ctx: CanvasRenderingContext2D

  return (lineHeight: number, rect: { width: number, height: number }) => {
    if (!ctx) {
      ctx = bodyBackgroundRef.value.getContext('2d')
    }

    // 清除画布
    ctx.clearRect(0, 0, rect.width, rect.height)

    // 设置画笔样式 - 使用CSS变量以支持主题
    ctx.setLineDash([5, 5])
    ctx.lineDashOffset = 0

    // 使用CSS变量获取主题颜色
    const computedStyle = getComputedStyle(document.documentElement)
    const theme = computedStyle.getPropertyValue('--theme')
    ctx.strokeStyle = theme?.trim() === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(73, 80, 87, 0.5)'
    ctx.lineWidth = 1

    ctx.beginPath()

    // 只绘制可见的线，提高性能
    for (let y = Math.ceil(lineHeight); y <= rect.height; y += lineHeight) {
      ctx.moveTo(0, y)
      ctx.lineTo(rect.width, y)
    }

    ctx.stroke()
  }
})()

/** 统计非空白字符个数 */
function handleTextSelect() {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0) return

  const range = sel.getRangeAt(0)
  const container = range.commonAncestorContainer

  if (!bodyRef.value.contains(container)) return

  if (!sel.isCollapsed) {
    statusBarRight.value.selectedWordCount = countNonWhitespace(sel.toString())
  } else {
    statusBarRight.value.selectedWordCount = 0
  }
}

/** 文章标题更改时 */
function handleSaveArticleTitle() {
  emit('update:articleTitle', selectedArticleStore.selectedArticle.title)
}

/** 输入框获取焦点时 移动光标到末尾并滚动到底部 */
function scrollToCursor() {
  setTimeout(() => {
    const scroll = bodyRef.value.parentElement as HTMLElement
    if (!isCaretInViewport(scroll)) scrollCaretIntoView(scroll)
  }, 50)
}

/** 文本输入时 */
function handleBodyInput(e: InputEvent) {
  statusBarRight.value.saveState = '⏳ 等待保存'
  if (bodyRef.value.innerText === "") {
    resetBody()
  }

  const isCursorValid = isCursorInValidNode(bodyRef.value)

  if (!isCursorValid) {
    // 仅光标位置不合法时才执行修正（性能优化核心）
    const cursorPos = saveCursorPosition() // 保存光标
    fixEditorDomLight(bodyRef.value, cursorPos) // 精准修正
    restoreCursorPosition(cursorPos) // 恢复光标
  }

  handleJumpToMiddle()
  emitUpdate()
}

/** 文本粘贴时 */
function handleBodyPaste(e: ClipboardEvent) {
  e.preventDefault()
  const text = e.clipboardData.getData('text/plain')
  insertText(text)
  scrollToCursor()
  _emitUpdate()
}

/** 控制鼠标悬浮多少秒才会显示悬浮层 */
let hoverTimer: number
/** 是否已经显示悬浮窗 */
let isHovering = false

/** 鼠标进入时 */
function handleBodyMouseover(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (target.dataset.entityId) {
    setTimeout(() => {
      isHovering = true
      document.addEventListener('mousemove', handleBodyMousemove)
      entityHoverRef.value.show({
        id: '',
        type: '人物',
        title: '陈兰玫',
        bookId: '',
        description: '陈兰玫陈兰玫陈兰玫陈兰玫陈兰玫陈兰玫',
        attrs: [],
        imgID: '/public/cover/default.png',
        deletedTime: 0,
        modifiedTime: 0,
        createdTime: 0

      }, e.clientX + 20, e.clientY)
    })
  }
}

/** 鼠标移动时 */
function handleBodyMousemove(e: MouseEvent) {
  isHovering && entityHoverRef.value.move(e.clientX + 20, e.clientY)
}

/** 鼠标移出时 */
function handleBodyMouseout(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (target.dataset.key) {
    isHovering = false
    entityHoverRef.value.hide()
    document.removeEventListener('mousemove', handleBodyMousemove)
  }
}

/** 鼠标单击时 */
function handleBodyClick(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (target.dataset.key) {
    console.log(target.dataset.key)
  }
}

/** 在文本框中按下按键时 */
function handleBodyKeydown(e: KeyboardEvent) {
  if (bodyRef.value.innerText === ' ') {
    if (e.key === 'Backspace' || e.key === 'Delete') return e.preventDefault()
  }

  if (e.key === 'Delete') {

  } else if (e.key === 'Backspace') {

  } else if (e.ctrlKey) {
    if (e.key === 'i') {
      insertVariableSpan('学生成绩表', '学生成绩表')
    } else if (e.key === 's') {
      _emitUpdate()
      e.preventDefault()
    }
  }
}

function resetBody(text: string = "") {
  bodyRef.value.innerHTML = newlineToP(text, { collapse: true })
}

function focus() {
  bodyRef.value.focus()
}

function getBodyText() {
  return bodyRef.value.innerText
}

function setSaveState(state: string) {
  statusBarRight.value.saveState = state
}

defineExpose({
  /** 重置编辑区内容 */
  resetBody,
  /** 获取焦点 */
  focus,
  /** 获取Body内容 */
  getBodyText,
  /** 设置保存状态说明 */
  setSaveState,
  /** 获取编辑区REF */
  getBody() { return bodyRef.value },
})

</script>

<template>

  <main>
    <div class="tu-container">
      <!-- 文章标题 -->
      <div class="title">
        <input type="text" placeholder="请输入章节标题" v-model="selectedArticleStore.selectedArticle.title" @blur="handleSaveArticleTitle"></input>
      </div>
      <!-- 文字编辑区 -->
      <div class="edit scroll-container">
        <div class="body" contenteditable ref="bodyRef" @input="handleBodyInput" @paste="handleBodyPaste" @keydown="handleBodyKeydown" @click="handleBodyClick" @mouseover="handleBodyMouseover" @mouseout="handleBodyMouseout"></div>
        <!-- 绘制背景，比如编辑区自定义图片，网格，线段等 -->
        <canvas ref="bodyBackgroundRef" @click="moveCaretToEndAndScrollToBottom(bodyRef)"></canvas>
      </div>
    </div>
    <!-- 状态栏 -->
    <div class="statusbar">
      <div class="left">
        <button @click="() => emit('create:article')">➕ 新章节</button>
        <button @click="settingStore.setEditorWidthMode(!settingStore.isAutoWidthMode)" class="margin-left">{{ settingStore.editorWidthModeText }}列宽</button>
      </div>
      <div class="center">{{ selectedArticleStore.selectedArticle?.wordCount }}</div>
      <div class="right">
        <span class="margin-right" v-if="statusBarRight.selectedWordCount">(已选择:{{ statusBarRight.selectedWordCount }})</span>
        <span>{{ statusBarRight.saveState }}</span>
      </div>
    </div>
  </main>

  <EntityHover ref="entityHoverRef" />
</template>

<style scoped>
main {
  flex: 1;
  width: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.tu-container {
  display: flex;
  flex: 1;
  flex-direction: column;
  height: 0;
  padding: 2rem .5rem;
}

.tu-container.narrow-margin {
  padding: 2rem calc((100% - 720px) / 2);
}

.tu-container .title {
  height: 2rem;
  font-size: 1.2rem;
  font-weight: bold;
  margin-bottom: 1rem;
}

.tu-container .title input {
  width: 100%;
  margin: 0 2rem 0 2.2rem;
}

.tu-container .edit {
  flex: 1;
  position: relative;
  height: 0;
  overflow: hide;
  padding-right: .25rem;
}

.tu-container .edit .body {
  position: relative;
  z-index: 2;
  line-height: 2.5rem;
  text-indent: 2em;
  white-space: pre-line;
  min-height: calc(50%);
  margin: 0 2rem 0 2.2rem;
}

.tu-container .edit canvas {
  position: absolute;
  z-index: 1;
  top: 0;
  left: 0;
  cursor: text;
  margin: 0 2rem 0 2.2rem;
}

main .statusbar {
  height: 2rem;
  font-size: .8rem;
  display: flex;
  padding: 0 1rem;
  justify-content: space-between;
  align-items: center;
  color: var(--text-tertiary);
  background-color: var(--background-secondary);
}

main .statusbar .left {
  width: 30%;
  display: flex;
  justify-content: flex-start;
  align-items: center;
}

main .statusbar .right {
  width: 30%;
  display: flex;
  justify-content: flex-end;
  align-items: center;
}
</style>
