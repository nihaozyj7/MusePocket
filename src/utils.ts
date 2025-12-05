import type { Ref } from "vue"

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
export const uid = _uid

/**
 * 设置书架右键菜单的位置
 * @param e 鼠标事件
 * @param bookContextMenuRef 书架右键菜单的引用
 */
export function setBookMenuPosition(e: MouseEvent, bookContextMenuRef: Ref<HTMLElement | null, HTMLElement | null>) {
  e.preventDefault()

  const menu = bookContextMenuRef.value!
  menu.style.display = 'block'

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
}

/** 根据图片ID获取图标Base64 URL */
export function getIconBase64(iconId: string): string {
  return '/cover/default.png'
}


/**
 * 根据书籍 ID 和现有章节标题生成一个新的默认章节名。
 *
 * 规则：
 * - titles 中每项形如 "第 1 章 xxx"
 * - 需要解析其中的数字部分，找到最大章节号
 * - 返回 "第 n 章"（n = 最大章节号 + 1）
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
  return `第 ${next} 章`
}

/** 精确获取指定元素中单行文本的真实行高（单位：像素）*/
export function getActualLineHeight(element: Element): number {
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


/**
 * 统计字符串中的非空白字符数量。
 *
 * 非空白字符指：除空格、换行、制表符等所有空白符以外的字符。
 *
 * @param text 要统计的字符串
 * @returns 非空白字符数量
 */
export function countNonWhitespace(text: string): number {
  // 使用正则移除所有空白字符，再统计长度
  // \s 匹配空格、制表符、换行、全角空格等常见空白符
  const cleaned = text.replace(/\s+/g, "")
  return cleaned.length
}

export function insertText(text: string) {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0) return

  const range = sel.getRangeAt(0)
  range.deleteContents()

  const textNode = document.createTextNode(text)
  range.insertNode(textNode)

  // 光标移动
  range.setStartAfter(textNode)
  range.collapse(true)
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

/**
 * 将字符串中的换行符转换为 <br> 标签
 * @param text 需要处理的字符串
 * @returns 转换后的字符串，可用于 innerHTML
 */
export function newlineToBr(text: string): string {
  return text.replace(/\n/g, '<br>')
}
