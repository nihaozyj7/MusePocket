import { customAlphabet } from "nanoid"
import { useSettingStore } from "./stores/SettingStore"

let _uid: () => string
if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
  _uid = () => crypto.randomUUID()
} else {
  _uid = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

/** 生成一个唯一的 UUID v4 */
export const uid = customAlphabet('023456789ABCDEFGHIKLMNOPQRSTUVWXYZ', 10)

/** 根据图片ID获取图标Base64 URL */
export function getImageBase64ByID(id: string): string {
  return '/cover/default.png'
}


/**
 * 根据书籍 ID 和现有章节标题生成一个新的默认章节名。
 *
 * 规则：
 * - titles 中每项形如 "第 1 章 xxx"
 * - 需要解析其中的数字部分，找到最大章节号
 * - 返回 "第 n 章"（n = 最大章节号 + 1）
 *
 */
export function getNewChapterName(titles: { title: string }[]): string {
  // 提取数字的正则：匹配 "第 xxx 章"
  const chapterReg = /第\s*(\d+)\s*章/

  let maxNumber = 0

  // 遍历所有标题，解析出章节号
  for (const item of titles) {
    const match = item.title.match(chapterReg)
    if (match) {
      const num = Number(match[1])
      if (!Number.isNaN(num)) {
        // 记录最大章节号
        maxNumber = Math.max(maxNumber, num)
      }
    }
  }
  // 返回下一章编号
  const next = maxNumber + 1
  return `第${next}章 `
}

function _getActualLineHeight(element: Element): number {
  const tempDiv = document.createElement('div')
  tempDiv.style.position = 'absolute'
  tempDiv.style.top = '-9999px'
  tempDiv.style.left = '-9999px'
  tempDiv.style.visibility = 'hidden'
  tempDiv.style.whiteSpace = 'nowrap'
  tempDiv.style.fontSize = getComputedStyle(element).fontSize
  tempDiv.style.fontFamily = getComputedStyle(element).fontFamily
  tempDiv.style.lineHeight = getComputedStyle(element).lineHeight
  tempDiv.style.padding = '0'
  tempDiv.style.margin = '0'

  tempDiv.textContent = 'A'

  document.body.appendChild(tempDiv)
  const rect = tempDiv.getBoundingClientRect()
  const actualLineHeight = rect.height

  document.body.removeChild(tempDiv)
  return actualLineHeight
}

/** 精确获取指定元素中单行文本的真实行高（单位：像素）*/
export const getActualLineHeight = (() => {
  let lineHeight: number, element: Element, result: number
  let settingStore: { lineHeight: number }

  return (e: Element) => {
    if (!settingStore) settingStore = useSettingStore()

    if (lineHeight === undefined || lineHeight !== settingStore.lineHeight) {
      lineHeight = useSettingStore().lineHeight
      element = e
      result = _getActualLineHeight(element)
      return result
    }

    if (e !== element) {
      element = e
      result = _getActualLineHeight(element)
      return result
    }

    return result
  }
})()

/**
 * 统计字符串中的非空白字符数量。
 *
 * 非空白字符指：除空格、换行、制表符等所有空白符以及零宽字符以外的字符。
 *
 * @param text 要统计的字符串
 * @returns 非空白字符数量
 */
export function countNonWhitespace(text: string): number {
  if (!text) return 0
  // 使用正则移除所有空白字符（\s）以及零宽字符（\u200B）
  // 注意：\s 不包含 \u200B，因此需单独处理
  const cleaned = text.replace(/[\s\u200B]+/g, "")
  return cleaned.length
}

/**
 * 在当前光标位置插入文本，同时支持换行
 * @param text 要插入的文本，换行用 \n 表示
 */
export function insertText(text: string) {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0) return

  const range = sel.getRangeAt(0)
  range.deleteContents()

  // 将换行符转成 <br> 并创建 DOM 片段
  const lines = text.split('\n')
  const frag = document.createDocumentFragment()

  lines.forEach((line, i) => {
    frag.appendChild(document.createTextNode(line))
    if (i < lines.length - 1) {
      frag.appendChild(document.createElement('br'))
    }
  })

  range.insertNode(frag)

  // 光标移动到插入内容末尾
  range.collapse(false)
  sel.removeAllRanges()
  sel.addRange(range)
}


/** 删除光标前的字符 */
export function deleteBackward() {
  const sel = window.getSelection()
  if (!sel || !sel.rangeCount) return

  const range = sel.getRangeAt(0)

  if (!range.collapsed) {
    range.deleteContents()
    return
  }

  // collapsed，删除前一个字符
  range.setStart(range.startContainer, range.startOffset - 1)
  range.deleteContents()
}

/** 零宽字符 */
export const ZERO_WIDTH_CHAR = '\u200B'

/**
 * 将字符串按行转换为 <p> 段落
 * @param text 原始字符串
 * @param options 配置项
 * @param options.collapse 是否折叠多余空行（多个连续换行只保留一个）
 * @returns 处理后的 HTML 字符串，可用于 innerHTML
 */
export function newlineToP(
  text: string,
  options: { collapse?: boolean } = {}
): string {
  const { collapse = false } = options

  if (text === '') return `<p>${ZERO_WIDTH_CHAR}</p>`

  // 按换行符分割文本为多行
  let lines = text.split(/\r?\n/)

  // 是否折叠多余空行：把连续空行折叠为 1 行
  if (collapse) {
    const result: string[] = []
    let prevEmpty = false

    for (const line of lines) {
      const isEmpty = line.trim() === ''

      // 如果当前行为空，并且前一行也是空，则跳过
      if (isEmpty && prevEmpty) continue

      result.push(line)
      prevEmpty = isEmpty
    }

    lines = result
  }

  // 将每一行转换为 <p>XXX</p>
  const html = lines
    .map(line => `<p>${line === '' ? ZERO_WIDTH_CHAR : line}</p>`)
    .join('')

  return html
}

/**
 * 清理多余换行，并可选移除“空白行”（只包含空格 / 制表符 / 全角空格 / &nbsp; / 零宽字符 的行）
 * @param text 原始字符串
 * @param options 配置项
 * @param options.removeBlankLines 是否移除空白行（默认 false）
 * @returns 处理后的字符串（已移除所有零宽字符）
 */
export function trimAndReduceNewlines(text: string, options: { removeBlankLines?: boolean } = {}): string {
  if (!text) return ''

  const { removeBlankLines = false } = options

  // 移除所有零宽字符（\u200B）——在处理前统一清除，简化后续逻辑
  let cleanedText = text.replace(/\u200B/g, '')

  // 按行拆分
  let lines = cleanedText.split(/\r?\n/)

  // 移除空白行：只包含空格、制表符、全角空格、&nbsp; 等不可见字符的行
  if (removeBlankLines) {
    lines = lines.filter(line => {
      // 移除所有空白字符（包括全角空格 \u3000）和 &nbsp;
      // 注意：此时已无 \u200B，但为健壮性也可保留通用空白处理
      const stripped = line.replace(/[\s\u3000]+/g, '').replace(/&nbsp;/g, '')
      return stripped !== ''
    })
  }

  // 折叠多余空行：多个连续空行 → 保留一个
  const collapsed: string[] = []
  let prevEmpty = false



  for (const line of lines) {
    const isEmpty = line.trim() === ''
    if (isEmpty && prevEmpty) continue // 跳过连续空行
    collapsed.push(line)
    prevEmpty = isEmpty
  }

  // 去除首尾空行
  while (collapsed.length > 0 && collapsed[0].trim() === '') {
    collapsed.shift()
  }
  while (collapsed.length > 0 && collapsed[collapsed.length - 1].trim() === '') {
    collapsed.pop()
  }

  return collapsed.join('\n')
}


/**
 * 检测光标是否在可视区
 * @param container 编辑器容器（contenteditable 的 div）
 * @returns true 表示光标完全在可视区内，false 表示部分或完全不可见
 */
export function isCaretInViewport(container: HTMLElement): boolean {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0) return false

  const range = sel.getRangeAt(0)
  let node = range.endContainer as HTMLElement
  if (node.nodeType === Node.TEXT_NODE) node = node.parentElement!

  const rect = node.getBoundingClientRect()
  const cRect = container.getBoundingClientRect()

  // 检查节点是否完全在容器可视区域
  return rect.top >= cRect.top && rect.bottom <= cRect.bottom
}

/**
 * 将光标滚动到可视区
 * @param container 编辑器容器（contenteditable 的 div）
 * @param behavior 可选滚动方式 'smooth' | 'auto'，默认 'auto'
 */
export function scrollCaretIntoView(container: HTMLElement, behavior: ScrollBehavior = 'auto') {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0) return

  const range = sel.getRangeAt(0)
  let node = range.endContainer as HTMLElement
  if (node.nodeType === Node.TEXT_NODE) node = node.parentElement!

  const rect = node.getBoundingClientRect()
  const cRect = container.getBoundingClientRect()

  // 光标中心相对容器可视区的偏移（尽量滚动到中间）
  const caretMiddle = rect.top + rect.height / 2
  const containerMiddle = cRect.top + cRect.height / 2
  let scrollOffset = caretMiddle - containerMiddle

  // 边界判断：滚动量不能超出容器顶部或底部
  const maxScrollUp = -container.scrollTop
  const maxScrollDown = container.scrollHeight - container.clientHeight - container.scrollTop
  if (scrollOffset < maxScrollUp) scrollOffset = maxScrollUp
  if (scrollOffset > maxScrollDown) scrollOffset = maxScrollDown

  container.scrollBy({ top: scrollOffset, behavior })
}

/**
 * 将光标移动到内容末尾，并且将容器滚动到最底部（直接等于元素高度）
 * @param container 编辑器容器（contenteditable 的 div）
 * @param behavior 可选滚动方式 'smooth' | 'auto'，默认 'auto'
 */
export function moveCaretToEndAndScrollToBottom(
  container: HTMLElement,
  behavior: ScrollBehavior = 'auto'
): void {
  // 确保容器获得焦点
  container.focus()
  // 获取当前 Selection，失败则直接返回
  const sel = window.getSelection()
  if (!sel) return
  // 创建一个 Range 并折叠到容器内容末尾（光标移动到最末）
  const range = document.createRange()
  range.selectNodeContents(container)
  range.collapse(false)
  // 将新 Range 设置为选区
  sel.removeAllRanges()
  sel.addRange(range)
  // 滚动到父元素的最底部
  container.parentElement.scrollTo({ top: container.clientHeight, behavior })
}


/**
 * 将光标向下滚动到容器可视区（只考虑向下滚动）
 * @param container 编辑器容器（contenteditable 的 div）
 * @param behavior 可选滚动方式 'smooth' | 'auto'，默认 'auto'
 */
export function scrollCaretDownIntoView(
  container: HTMLElement,
  behavior: ScrollBehavior = 'auto'
): void {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0) return

  const range = sel.getRangeAt(0)
  let node = range.endContainer as HTMLElement
  if (node.nodeType === Node.TEXT_NODE) node = node.parentElement!

  const rect = node.getBoundingClientRect()
  const cRect = container.getBoundingClientRect()

  const caretMiddle = rect.top + rect.height / 2
  const containerMiddle = cRect.top + cRect.height / 2

  // 期望向下滚动量（只允许正数，表示向下）
  let scrollOffset = caretMiddle - containerMiddle

  // 若光标本来就在中间或上方，则不滚动（保证只向下滚）
  if (scrollOffset <= 0) return

  // 能向下滚动的最大值
  const maxScrollDown = container.scrollHeight - container.clientHeight - container.scrollTop

  // 如果期望滚动超出实际能滚动的范围，则使用实际极限
  if (scrollOffset > maxScrollDown) scrollOffset = maxScrollDown

  // 最终滚动
  container.scrollBy({ top: scrollOffset, behavior })
}

/** 在用户的鼠标出弹出一个提示框，鼠标移除后自动消失 */
export function showTipsPopup(message: string, timeout = 1500) {
  const popup = document.createElement('div')
  popup.className = 'popup'
  popup.textContent = message
  document.body.appendChild(popup)

  const handleMouseMove = (e: MouseEvent) => {
    popup.style.left = `${e.clientX + 30}px`
    popup.style.top = `${e.clientY}px`
  }

  // 鼠标移动时更新位置
  document.addEventListener('mousemove', handleMouseMove)

  // 定时移除提示框并解绑事件
  setTimeout(() => {
    popup.remove()
    document.removeEventListener('mousemove', handleMouseMove)
  }, timeout)
}


/**
 * 导出文本文件（txt）
 * @param filename 文件名，例如 "example.txt"
 * @param content 文本内容
 */
export function exportTxt(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.txt') ? filename : `${filename}.txt`
  a.click()

  URL.revokeObjectURL(url) // 释放 URL 对象
}


/**
 * 将 HTML 字符串解析为 HTMLElement
 * @param html 要转换的 HTML 字符串（必须只有一个根节点）
 * @returns HTMLElement
 */
export function htmlToElement(html: string): HTMLElement {
  // 使用 DOMParser 将字符串解析成 Document
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, "text/html")

  // 取得第一个元素节点
  const el = doc.body.firstElementChild

  if (!el) {
    throw new Error("HTML 中未找到有效的 HTMLElement")
  }

  return el as HTMLElement
}

class Queue<T> {
  private readonly maxLength: number
  private readonly queue: T[]
  constructor(maxLength: number) {
    this.queue = []
    this.maxLength = maxLength
  }
  push(item: T): void {
    if (this.queue.length >= this.maxLength - 1) {
      this.queue.pop()
    }
    this.queue.unshift(item)
  }

  get length(): number {
    return this.queue.length
  }

  get items(): T[] {
    return this.queue
  }

  clear(): void {
    this.queue.length = 0
  }
}

/** 获取一个定长的队列，舍弃旧数据，添加新数据，第一个元素是最新的 */
export function getQueue<T>(maxLength: number): Queue<T> {
  return new Queue<T>(maxLength)
}
