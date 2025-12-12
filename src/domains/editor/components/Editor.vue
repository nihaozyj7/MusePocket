<script setup lang="ts">
import { useHistoryStore } from '@domains/editor/stores/history.store'
import { useSelectedArticleStore } from '@domains/editor/stores/selected-article.store'
import { EntityHover, EntityHoverAutoInsert } from '@domains/library'
import { useEntityStore } from '@domains/library/stores/entities.store'
import { useSettingStore } from '@domains/settings/stores/settings.store'
import type { Entity } from '@shared/types'
import { ChineseInputManager, countNonWhitespace, fixEditorDomLight, getActualLineHeight, getCleanedEditorContent, getQueue, insertText, insertVariableSpan, isCaretInViewport, isCursorInValidNode, moveCaretToEndAndScrollToBottom, newlineToP, restoreCursorPosition, saveCursorPosition, restoreCursorTextPosition, saveCursorTextPosition, scrollCaretDownIntoView, scrollCaretIntoView, StyleManager, trimAndReduceNewlines } from '@shared/utils'
import { throttle } from 'lodash-es'
import { onMounted, onUnmounted, ref } from 'vue'

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
/** 自动完成悬浮层 */
const entityHoverAutoInsertRef = ref<InstanceType<typeof EntityHoverAutoInsert>>()
/** 实体列表 */
const entityStore = useEntityStore()

/** 配置项 */
const settingStore = useSettingStore()
/** 当前文章 */
const selectedArticleStore = useSelectedArticleStore()
/** 历史记录 */
const historyStore = useHistoryStore()

/** 样式管理 */
let styleManager = new StyleManager()

/** 观察者实例 */
let observer: ResizeObserver

let chineseInputManager: ChineseInputManager

/** 状态栏数据 */
const statusBarRight = ref({
  saveState: '✅ 已保存',
  selectedWordCount: 0
})

const emit = defineEmits({
  /** 编辑器内容更新, 传入新内容和更新前的旧内容, skipHistory表示是否跳过历史记录 */
  'update:articleBody': (nc: string, oc?: string, skipHistory?: boolean) => true,
  /** 文章标题更新 */
  'update:articleTitle': (title: string) => true,
  /** 新建章节 */
  'create:article': () => true
})


onMounted(() => {
  // 确保 DOM 元素存在
  if (!bodyRef.value || !bodyBackgroundRef.value) {
    console.error('Editor DOM elements not ready')
    return
  }

  observer = new ResizeObserver(handleResize)
  observer.observe(bodyRef.value)
  document.addEventListener('selectionchange', handleTextSelect)
  settingStore.setEditorWidthMode()

  // 应用编辑区文字尺寸
  bodyRef.value.style.fontSize = `${settingStore.baseSettings.editorFontSize}rem`

  if (settingStore.baseSettings.enableParagraphSpacing) {
    styleManager.add('.body>p', {
      'margin-bottom': settingStore.baseSettings.lineHeight + 'rem'
    })
  }
  styleManager.add('.body>p', { minHeight: settingStore.baseSettings.lineHeight + 'rem' })

  chineseInputManager = new ChineseInputManager(
    () => { },
    handleChineseInputMethodSubmission,
    bodyRef.value as HTMLInputElement
  )

  // 监听中文输入法结束，执行延迟的保存操作
  const checkPendingSave = () => {
    if (!chineseInputManager.isChineseInput && pendingSave) {
      _executeSave()
      pendingSave = false
    }
  }

  // 监听 compositionend 事件
  bodyRef.value?.addEventListener('compositionend', () => {
    setTimeout(checkPendingSave, 50)
  })
})

onUnmounted(() => {
  if (observer) {
    observer.disconnect()
  }
  document.removeEventListener('selectionchange', handleTextSelect)
  styleManager?.clear()
  if (chineseInputManager) {
    chineseInputManager.destroy()
  }
  // 清理自动完成定时器
  if (autoCompleteTimer !== null) {
    clearTimeout(autoCompleteTimer)
    autoCompleteTimer = null
  }
})

/** 执行保存逻辑（不考虑输入法状态） */
const _executeSave = () => {
  const text = trimAndReduceNewlines(bodyRef.value.innerText, { removeBlankLines: true })
  emit('update:articleBody', text, undefined)
}

/** 延迟保存的标记 */
let pendingSave = false

/** 触发内容更新事件（考虑中文输入法状态） */
const _emitUpdate = () => {
  // 如果正在进行中文输入，延迟保存
  if (chineseInputManager && chineseInputManager.isChineseInput) {
    pendingSave = true
    return
  }

  // 正常保存
  _executeSave()
  pendingSave = false
}

/** 强制立即保存（不考虑输入法状态，用于失焦、Ctrl+S等场景） */
const _forceSave = () => {
  _executeSave()
  pendingSave = false
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

    // 检查是否启用网格线
    if (!settingStore.baseSettings.enableGridLines) {
      return // 未启用网格线，不绘制
    }

    // 根据设置决定线条样式
    if (settingStore.baseSettings.gridLineStyle === 'dashed') {
      ctx.setLineDash([5, 5]) // 虚线
    } else {
      ctx.setLineDash([]) // 实线
    }
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
  emit('update:articleTitle', selectedArticleStore.v.title)
}

/** 输入框获取焦点时 移动光标到末尾并滚动到底部 */
function scrollToCursor() {
  setTimeout(() => {
    const scroll = bodyRef.value.parentElement as HTMLElement
    if (!isCaretInViewport(scroll)) scrollCaretIntoView(scroll)
  }, 50)
}


/** 文本复制时 */
function handleBodyCopy(e: ClipboardEvent) {
  // 如果不使用纯文本复制，则由浏览器接管
  if (!settingStore.baseSettings.usePlainTextPaste) {
    return
  }

  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return

  e.preventDefault()

  // 获取选中的内容
  const range = sel.getRangeAt(0)
  const fragment = range.cloneContents()

  // 通过临时DOM提取文本，保留段落换行
  const tempDiv = document.createElement('div')
  tempDiv.appendChild(fragment)

  // 遍历所有<p>标签，用换行符连接
  const paragraphs = Array.from(tempDiv.querySelectorAll('p'))
  let cleanedText = ''

  if (paragraphs.length > 0) {
    // 如果有p标签，按p标签提取文本并用换行连接
    cleanedText = paragraphs.map(p => p.innerText || p.textContent || '').join('\n')
  } else {
    // 如果没有p标签（单行选择），直接使用innerText
    cleanedText = tempDiv.innerText || tempDiv.textContent || ''
  }

  // 写入剪贴板
  e.clipboardData?.setData('text/plain', cleanedText)
}

/** 文本输入时 */
function handleBodyInput(e: InputEvent) {
  autoComplete(e)

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
  // 如果不使用纯文本粘贴，则由浏览器接管，但仍然需要触发保存
  if (!settingStore.baseSettings.usePlainTextPaste) {
    // 浏览器默认粘贴行为，但粘贴后需要触发保存
    setTimeout(() => {
      _forceSave()
    }, 50)
    return
  }

  e.preventDefault()

  // 优先获取纯文本格式，保留换行符
  let cleanedText = e.clipboardData.getData('text/plain')

  // 如果没有纯文本，则尝试从HTML中提取
  if (!cleanedText) {
    const htmlText = e.clipboardData.getData('text/html')
    if (htmlText) {
      const tempDiv = document.createElement('div')
      tempDiv.innerHTML = htmlText
      cleanedText = tempDiv.innerText
    }
  }

  // 不要使用trim()，保留换行符
  insertText(cleanedText)

  // 粘贴后自动触发排版
  setTimeout(() => {
    const bodyElement = bodyRef.value
    if (!bodyElement) return

    // 保存光标的文本位置（基于纯文本偏移量）
    const cursorOffset = saveCursorTextPosition(bodyElement)
    const formattedContent = getCleanedEditorContent(bodyElement)
    resetBody(formattedContent)

    // 根据文本偏移量恢复光标位置
    setTimeout(() => {
      restoreCursorTextPosition(bodyRef.value, cursorOffset)
      scrollToCursor()
      _forceSave()  // 粘贴后立即保存
    }, 10)
  }, 10)
}

/** 控制鼠标悬浮多少秒才会显示悬浮层 */
let hoverTimer = 500
/** 是否已经显示悬浮窗 */
let isHovering = false
/** 鼠标悬浮延迟定时器 */
let hoverTimerId: number | null = null
/** 上次悬浮层关闭的时间，如果小于 hoverTimer ，则无需等待，直接显示 */
let lastTimer = 0

/** 鼠标进入时 */
function handleBodyMouseover(e: MouseEvent) {
  const target = e.target as HTMLElement
  const _ht = (Date.now() - lastTimer < hoverTimer) ? 0 : hoverTimer
  if (target.dataset.entityId) {
    hoverTimerId = setTimeout(() => {
      isHovering = true
      document.addEventListener('mousemove', handleBodyMousemove)
      entityHoverRef.value.show(entityStore.v.find(e => e.id === target.dataset.entityId), e.clientX + 20, e.clientY)
    }, _ht)
  }
}

/** 鼠标移动时 */
function handleBodyMousemove(e: MouseEvent) {
  isHovering && entityHoverRef.value.move(e.clientX + 20, e.clientY)
}

/** 鼠标移出时 */
function handleBodyMouseout(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (target.dataset.entityId) {
    clearTimeout(hoverTimerId)
    isHovering = false
    entityHoverRef.value.hide()
    lastTimer = Date.now()
    document.removeEventListener('mousemove', handleBodyMousemove)
  }
}

/** 鼠标单击时 */
function handleBodyClick(e: MouseEvent) {
  // 点击时隐藏实体提示
  entityHoverAutoInsertRef.value.hide()

  const target = e.target as HTMLElement
  if (target.dataset.key) {
    console.log(target.dataset.key)
  }
}

function getCaretRect(): DOMRect | null {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0) return null

  const range = sel.getRangeAt(0)
  if (range.collapsed === false) return null

  const rect = range.getClientRects()[0]
  return rect || null
}

/**
 * 获取光标位置前的文本（最多截取 maxLength 个字符）
 * @param maxLength 最大截取长度
 * @returns 光标前的文本
 */
function getTextBeforeCursor(maxLength: number = 50): string {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0) return ''

  const range = sel.getRangeAt(0)
  if (!range.collapsed) return ''

  // 获取当前光标位置
  const startContainer = range.startContainer
  const startOffset = range.startOffset

  // 如果在文本节点中
  if (startContainer.nodeType === Node.TEXT_NODE) {
    const textContent = startContainer.textContent || ''
    const start = Math.max(0, startOffset - maxLength)
    return textContent.substring(start, startOffset)
  }

  // 如果在元素节点中，尝试获取前面的文本
  return ''
}

/**
 * 从光标位置向前删除指定长度的文本
 * @param length 要删除的长度
 */
function deleteTextBeforeCursor(length: number) {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0) return

  const range = sel.getRangeAt(0)
  if (!range.collapsed) return

  const startContainer = range.startContainer
  const startOffset = range.startOffset

  // 如果在文本节点中
  if (startContainer.nodeType === Node.TEXT_NODE) {
    const textNode = startContainer as Text
    const deleteStart = Math.max(0, startOffset - length)
    textNode.deleteData(deleteStart, startOffset - deleteStart)

    // 设置光标位置
    range.setStart(textNode, deleteStart)
    range.setEnd(textNode, deleteStart)
  }
}

let chars = ''
/** 自动完成延迟定时器 */
let autoCompleteTimer: number | null = null

/** 中文输入提交时 */
const handleChineseInputMethodSubmission = (data: string) => {
  // 中文输入法确认后，触发自动完成
  triggerAutoComplete()
}

const hoverMove = () => {
  const rect = getCaretRect()
  if (!rect) return
  const { x, y } = rect
  entityHoverAutoInsertRef.value.move(x, y)
}

/** 触发自动完成 */
function triggerAutoComplete() {
  // 清除之前的定时器
  if (autoCompleteTimer !== null) {
    clearTimeout(autoCompleteTimer)
    autoCompleteTimer = null
  }

  autoCompleteTimer = setTimeout(() => {
    const textBeforeCursor = getTextBeforeCursor(50)

    if (!textBeforeCursor) {
      entityHoverAutoInsertRef.value.hide()
      return
    }

    // 更新匹配结果
    entityHoverAutoInsertRef.value.update(textBeforeCursor)

    // 更新位置
    const rect = getCaretRect()
    if (rect) {
      const { x, y } = rect
      entityHoverAutoInsertRef.value.show(x, y)
      hoverMove()
    }
  }, settingStore.baseSettings.autoCompleteDelay)
}

/** 自动监听输入，匹配实体 */
function autoComplete(e: InputEvent) {
  if (!e.data) return

  // 忽略一些不需要触发实体提示的字符（空格、换行、常见标点符号）
  const ignoredChars = /[\s\n\r。，！？、；：“”‘’（）《》〈〉『』「」.!?,;:\[\](){}"'<>]/

  // 如果输入的是需要忽略的字符
  if (ignoredChars.test(e.data)) {
    entityHoverAutoInsertRef.value.hide()
    return
  }

  // 触发自动完成
  triggerAutoComplete()
}

/** 在文本框中按下按键时 */
function handleBodyKeydown(e: KeyboardEvent) {
  if (e.key === 'Backspace') {
    // 删除时也触发自动完成
    setTimeout(() => triggerAutoComplete(), 10)
  } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    // 方向键移动光标时，如果不是上下键，则隐藏提示
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      entityHoverAutoInsertRef.value.hide()
    }
  } else if (e.ctrlKey) {
    if (e.key === 's') {
      _forceSave()  // Ctrl+S 强制立即保存
      e.preventDefault()
    } else if (e.key === 'z') {
      // Ctrl+Z 撤销
      handleUndo()
      e.preventDefault()
    } else if (e.key === 'y') {
      // Ctrl+Y 重做
      handleRedo()
      e.preventDefault()
    }
  } else if (e.key === 'Tab') {
    e.preventDefault()
  }
}

function entityHoverAutoInsertClose(entity: Entity, coverLength?: number) {
  if (!entity) {
    return
  }

  // 根据 coverLength 删除对应长度的文本
  if (coverLength && coverLength > 0) {
    deleteTextBeforeCursor(coverLength)
  }

  // 根据配置决定插入实体还是纯文本
  if (settingStore.baseSettings.insertEntityAsPlainText) {
    // 插入纯文本
    insertText(entity.title)
  } else {
    // 插入实体span元素
    insertVariableSpan(entity.id, entity.title)
  }
}

/** 撤销操作 */
async function handleUndo() {
  // 功能已移除，仅保留空实现
}

/** 重做操作 */
async function handleRedo() {
  // 功能已移除，仅保留空实现
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

/** 更新编辑器中所有指定实体的标题 */
function updateEntityTitle(entityId: string, newTitle: string) {
  if (!bodyRef.value) return

  // 查找所有带有该实体ID的span元素
  const entitySpans = bodyRef.value.querySelectorAll(`span[data-entity-id="${entityId}"]`)

  // 更新每个span的文本内容
  entitySpans.forEach(span => {
    span.textContent = newTitle
  })

  // 如果更新了内容，触发保存
  if (entitySpans.length > 0) {
    _emitUpdate()
  }
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
  /** 手动触发输入处理（用于外部插入内容后触发保存） */
  handleInput() { _emitUpdate() },
  /** 强制立即保存（用于失焦、Ctrl+S等场景） */
  forceSave() { _forceSave() },
  /** 撤销 */
  undo: handleUndo,
  /** 重做 */
  redo: handleRedo,
  /** 更新实体标题 */
  updateEntityTitle,
})

</script>

<template>

  <main>
    <div class="tu-container">
      <!-- 文章标题 -->
      <div class="title">
        <input type="text" placeholder="请输入章节标题" v-model="selectedArticleStore.v.title" @blur="handleSaveArticleTitle" v-if="selectedArticleStore.v"></input>
      </div>
      <!-- 文字编辑区 -->
      <div class="edit scroll-container">
        <div class="body" contenteditable ref="bodyRef" @input="handleBodyInput" @paste="handleBodyPaste" @copy="handleBodyCopy" @keydown="handleBodyKeydown" @click="handleBodyClick" @mouseover="handleBodyMouseover" @mouseout="handleBodyMouseout"></div>
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
      <div class="center">{{ selectedArticleStore.v?.wordCount }}</div>
      <div class="right">
        <span class="margin-right" v-if="statusBarRight.selectedWordCount">(已选择:{{ statusBarRight.selectedWordCount }})</span>
        <span>{{ statusBarRight.saveState }}</span>
      </div>
    </div>
    <!-- 实体信息浮窗 -->
    <EntityHover ref="entityHoverRef" />
    <!-- 自动完成悬浮层 -->
    <EntityHoverAutoInsert ref="entityHoverAutoInsertRef" @close="entityHoverAutoInsertClose" />
  </main>

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
  padding: 2rem calc((100% - 720px) / 2) .5rem calc((100% - 720px) / 2);
}

.tu-container .title {
  height: 2rem;
  font-size: 1.2rem;
  font-weight: bold;
  margin-bottom: 1rem;
  padding-right: 4.5rem;
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

main .statusbar .left button {
  font-size: .8rem;
  padding: .25rem .5rem !important;
  background-color: transparent !important;
  border: none;
}

main .statusbar .right {
  width: 30%;
  display: flex;
  justify-content: flex-end;
  align-items: center;
}
</style>
