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


/** 根据书的ID来获取一个新章节的默认名称 */
export function getNewChapterName(bookId: string): string {
  return `第 1 章  `
}

/**
 * 精确获取指定元素中单行文本的真实行高（单位：像素）
 */
export function getActualLineHeight(element: Element): number {
  // 1. 创建一个临时的 div，用于模拟行高测量
  const tempDiv = document.createElement('div')
  tempDiv.style.position = 'absolute'
  tempDiv.style.top = '-9999px' // 移出视口
  tempDiv.style.left = '-9999px'
  tempDiv.style.visibility = 'hidden'
  tempDiv.style.whiteSpace = 'nowrap' // 防止换行
  tempDiv.style.fontSize = getComputedStyle(element).fontSize
  tempDiv.style.fontFamily = getComputedStyle(element).fontFamily
  tempDiv.style.lineHeight = getComputedStyle(element).lineHeight // 继承原始样式
  tempDiv.style.padding = '0'
  tempDiv.style.margin = '0'

  // 2. 插入一个字符，确保有内容可测量
  tempDiv.textContent = 'A' // 用一个字母即可

  // 3. 插入文档，以便触发渲染
  document.body.appendChild(tempDiv)

  // 4. 读取实际高度（注意：这里要读的是 contentRect.height）
  const rect = tempDiv.getBoundingClientRect()
  const actualLineHeight = rect.height

  // 5. 清理
  document.body.removeChild(tempDiv)

  return actualLineHeight
}
