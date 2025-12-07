import { customAlphabet } from "nanoid"
import { useSettingStore } from "./stores/SettingStore"

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
 * 在当前光标位置插入文本（按换行符拆分为独立p标签，避免p嵌套）
 * @param text 要插入的文本，换行用 \n 表示
 */
export function insertText(text: string) {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0) return

  const range = sel.getRangeAt(0)
  // 修复：先将commonAncestorContainer转为Element（处理文本节点等非元素节点）
  let container: Node = range.commonAncestorContainer
  // 如果是文本节点/注释节点等，取其父元素
  const targetElement = container.nodeType === Node.ELEMENT_NODE
    ? (container as Element)
    : container.parentElement

  // 找到光标所在的顶层p标签（确保不处理嵌套p）
  const targetP = targetElement?.closest('p')
  if (!targetP) return

  // 1. 拆分原p标签中光标前后的内容
  // 光标前内容
  const beforeRange = document.createRange()
  beforeRange.setStart(targetP, 0)
  beforeRange.setEnd(range.startContainer, range.startOffset)
  const beforeContent = beforeRange.cloneContents()

  // 光标后内容
  const afterRange = document.createRange()
  afterRange.setStart(range.endContainer, range.endOffset)
  afterRange.setEnd(targetP, targetP.childNodes.length)
  const afterContent = afterRange.cloneContents()

  // 2. 清空原p标签内容，准备重新填充
  targetP.innerHTML = ''

  // 3. 拆分插入文本为行数组
  const insertLines = text.split('\n')

  // 4. 处理第一行：原p标签填充「光标前内容 + 插入文本第一行」
  targetP.appendChild(beforeContent)
  if (insertLines.length > 0 && insertLines[0]) {
    targetP.appendChild(document.createTextNode(insertLines[0]))
  }

  // 记录最后插入的p标签（初始为原p）
  let lastInsertedP = targetP

  // 5. 处理中间行（除第一行和最后一行的插入行）
  const middleLines = insertLines.length > 2 ? insertLines.slice(1, -1) : []
  for (const line of middleLines) {
    const newP = document.createElement('p')
    newP.appendChild(document.createTextNode(line))
    lastInsertedP.after(newP) // 插入到最后一个p后方
    lastInsertedP = newP
  }

  // 6. 处理最后一行：「插入文本最后一行 + 光标后内容」
  if (insertLines.length >= 2) {
    // 有换行时，最后一行单独创建p并拼接光标后内容
    const lastLine = insertLines[insertLines.length - 1]
    const lastP = document.createElement('p')
    if (lastLine) {
      lastP.appendChild(document.createTextNode(lastLine))
    }
    lastP.appendChild(afterContent)
    lastInsertedP.after(lastP)
    lastInsertedP = lastP
  } else {
    // 无换行时，光标后内容直接追加到原p
    targetP.appendChild(afterContent)
    lastInsertedP = targetP
  }

  // 7. 将光标移动到最后一个p标签的内容末尾
  const newRange = document.createRange()
  newRange.selectNodeContents(lastInsertedP)
  newRange.collapse(false) // 折叠到选区末尾（光标移到最后）
  sel.removeAllRanges()
  sel.addRange(newRange)
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

  if (text === '') return '<p></p>'

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

  const html = lines
    .map(line => `<p>${line === '' ? ' ' : line}</p>`)
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

  let lines = cleanedText.split(/\r?\n/)

  // 移除空白行：只包含空格、制表符、全角空格、&nbsp; 等不可见字符的行
  if (removeBlankLines) {
    lines = lines.filter(line => {
      // 移除所有空白字符（包括全角空格 \u3000）和 &nbsp;
      // 注意：此时已无 \u200B，但为健壮性也可保留通用空白处理
      const stripped = line.replace(/[\s]+/g, '').replace(/&nbsp;/g, '')
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

/**
 * 插入带 data-key 的 span
 */
export function insertVariableSpan(key: string) {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0) return

  const range = sel.getRangeAt(0)
  const span = document.createElement('span')
  span.setAttribute('contenteditable', 'false')
  span.dataset.key = key
  span.textContent = key

  const frag = document.createDocumentFragment()
  frag.appendChild(span)

  range.insertNode(frag)

  range.setStartAfter(span)
  range.collapse(true)
  sel.removeAllRanges()
  sel.addRange(range)
}


/**
 * 提取编辑器内容，保留 span[data-key]，其他文本压缩空格和换行
 * @param container 编辑器容器
 * @returns 清理后的文本+span组合
 */
export function getCleanedEditorContent(container: HTMLElement): string {
  const result: string[] = []

  /**
   * 遍历节点
   * @param node 当前节点
   */
  function traverse(node: Node) {
    if (node.nodeType === Node.TEXT_NODE) {
      // 压缩空格，去掉首尾换行
      const text = node.textContent?.replace(/\s+/g, ' ') ?? ''
      if (text.trim()) {
        result.push(text)
      }
    } else if (
      node.nodeType === Node.ELEMENT_NODE &&
      (node as HTMLElement).tagName === 'SPAN' &&
      (node as HTMLElement).hasAttribute('data-key')
    ) {
      // span[data-key] 保留外层 HTML，不遍历子节点
      result.push((node as HTMLElement).outerHTML)
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      // 对其他元素递归
      node.childNodes.forEach(traverse)
      // 如果是块级元素，末尾加换行
      const display = window.getComputedStyle(node as Element).display
      if (display === 'block') {
        result.push('\n')
      }
    }
  }

  container.childNodes.forEach(traverse)

  // 最后统一处理多行和首尾空格
  let content = result.join('')
  content = content
    .split(/\n+/)        // 多个换行压缩为一个
    .map(line => line.trim()) // 每行去掉首尾空格
    .filter(line => line.length > 0) // 去掉空行
    .join('\n')

  return content
}


// @/utils/editorDomFix.ts
/**
 * 保存光标位置（轻量操作）
 * @returns 光标位置信息
 */
export function saveCursorPosition(): { container: Node; offset: number; activeP: HTMLParagraphElement | null } | null {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0) return null
  const range = sel.getRangeAt(0)

  // 找到光标所在的顶层P节点
  let container = range.commonAncestorContainer
  const targetElement = container.nodeType === Node.ELEMENT_NODE
    ? (container as Element)
    : container.parentElement
  const activeP = targetElement?.closest('p')

  return {
    container: range.startContainer,
    offset: range.startOffset,
    activeP: activeP as HTMLParagraphElement | null
  }
}

/**
 * 恢复光标位置
 * @param pos 光标位置信息
 */
export function restoreCursorPosition(pos: ReturnType<typeof saveCursorPosition>) {
  if (!pos) return
  const sel = window.getSelection()
  if (!sel || !pos.activeP) return

  try {
    const range = document.createRange()
    // 仅恢复光标到合法的P节点内
    if (pos.activeP.contains(pos.container)) {
      range.setStart(pos.container, pos.offset)
    } else {
      range.selectNodeContents(pos.activeP)
      range.collapse(false)
    }
    range.collapse(true)
    sel.removeAllRanges()
    sel.addRange(range)
  } catch (e) {
    const range = document.createRange()
    range.selectNodeContents(pos.activeP)
    range.collapse(false)
    sel.removeAllRanges()
    sel.addRange(range)
  }
}

/**
 * 轻量检测：光标是否在合法节点内（P节点内，无非法子节点）
 * @param bodyRef 编辑区DOM
 * @returns 是否合法
 */
export function isCursorInValidNode(bodyRef: HTMLDivElement | undefined): boolean {
  if (!bodyRef) return false
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0) return false

  const range = sel.getRangeAt(0)
  let container = range.commonAncestorContainer
  const targetElement = container.nodeType === Node.ELEMENT_NODE
    ? (container as Element)
    : container.parentElement

  // 1. 检测光标是否在顶层P内
  const activeP = targetElement?.closest('p')
  if (!activeP || !bodyRef.contains(activeP) || bodyRef !== activeP.parentElement) {
    return false
  }

  // 2. 检测光标附近是否有非法节点（仅检查P的直接子节点）
  const invalidNodes = Array.from(activeP.childNodes).filter(node => {
    if (node.nodeType === Node.TEXT_NODE) return false
    const el = node as Element
    return el.tagName !== 'SPAN' // 仅允许SPAN和文本节点
  })

  return invalidNodes.length === 0
}

/**
 * 精准修正：仅修正光标所在P节点 + 顶层非法节点（输入时轻量调用）
 * @param bodyRef 编辑区DOM
 * @param cursorPos 光标位置（可选，不传则自动保存/恢复）
 */
export function fixEditorDomLight(bodyRef: HTMLDivElement | undefined, cursorPos?: ReturnType<typeof saveCursorPosition>) {
  if (!bodyRef) return
  const needRestore = !cursorPos
  const pos = cursorPos || saveCursorPosition()
  if (!pos || !pos.activeP) return

  // 标记是否需要修改DOM（减少重排重绘）
  let needRepaint = false

  // 1. 修正顶层节点：仅body的直接子节点为P
  Array.from(bodyRef.childNodes).forEach(node => {
    if (node.nodeName === 'P') return
    needRepaint = true

    // 文本节点/其他节点 → 包裹成P
    const text = node.textContent?.trim() || ''
    const newP = document.createElement('p')
    newP.textContent = text || ''
    bodyRef.replaceChild(newP, node)
  })

  // 2. 修正光标所在P节点（仅清理非法子节点）
  Array.from(pos.activeP.childNodes).forEach(child => {
    if (child.nodeType === Node.TEXT_NODE) return
    const el = child as Element
    if (el.tagName === 'SPAN') return

    needRepaint = true
    // 非法节点 → 提取文本替换
    const textNode = document.createTextNode(child.textContent || '')
    pos.activeP!.replaceChild(textNode, child)
  })

  // 3. 合并P内零散文本节点 + 处理空P
  if (needRepaint) {
    pos.activeP.normalize()
    if (pos.activeP.textContent?.trim() === '') {
      pos.activeP.innerHTML = ''
    }
  }

  // 4. 兜底：确保至少有一个P节点
  if (bodyRef.children.length === 0) {
    const emptyP = document.createElement('p')
    emptyP.innerHTML = ''
    bodyRef.appendChild(emptyP)
  }

  // 5. 恢复光标（若未传入光标位置）
  if (needRestore && pos) {
    restoreCursorPosition(pos)
  }
}

/**
 * 全量修正：失焦时统一修正所有节点（兜底）
 * @param bodyRef 编辑区DOM
 */
export function fixEditorDomFull(bodyRef: HTMLDivElement | undefined) {
  if (!bodyRef) return

  // 1. 强制所有顶层节点为P
  Array.from(bodyRef.childNodes).forEach(node => {
    if (node.nodeName === 'P') return

    const text = node.textContent?.trim() || ''
    const newP = document.createElement('p')
    newP.textContent = text || ''
    bodyRef.replaceChild(newP, node)
  })

  // 2. 修正所有P节点内的非法子节点
  Array.from(bodyRef.querySelectorAll('p')).forEach(p => {
    Array.from(p.childNodes).forEach(child => {
      if (child.nodeType === Node.TEXT_NODE) return
      const el = child as Element
      if (el.tagName === 'SPAN') return

      const textNode = document.createTextNode(child.textContent || '')
      p.replaceChild(textNode, child)
    })
    p.normalize()
    if (p.textContent?.trim() === '') {
    }
  })

  // 3. 兜底：确保至少有一个P
  if (bodyRef.children.length === 0) {
    const emptyP = document.createElement('p')
    bodyRef.appendChild(emptyP)
  }
}
