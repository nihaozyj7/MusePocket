/**
 * AtomicEditor
 * TypeScript 可复用类，用于支持：
 * - 原子变量插入
 * - 变量编辑退化（内容修改后自动转为普通文本）
 * - 悬浮提示（tooltip）显示与定位
 * - 多实例独立运行
 */
export class AtomicEditor {
  /**
   * 编辑器容器元素
   */
  private readonly editor: HTMLElement

  /**
   * 悬浮提示元素（需提前在 HTML 定义并初始化）
   */
  private readonly tooltip: HTMLElement

  /**
   * 默认原子变量显示文本
   */
  private readonly atomicText: string

  /**
   * 零宽空格字符（用于隔离原子节点，防止误删或合并）
   */
  private readonly ZWSP: string = '\u200B';

  /**
   * 当前悬停的原子变量元素
   */
  private currentHovering: HTMLElement | null = null;

  /**
   * 是否正在显示悬浮提示
   */
  private isTooltipShowing: boolean = false;

  /**
   * 标记是否正在处理退格键事件，防止重复触发
   */
  private _isProcessingBackspace: boolean = false;

  /**
   * 构造函数
   *
   * @param options - 配置对象
   * @param options.editor - 可编辑区域的根元素（如 div.contenteditable）
   * @param options.tooltip - 悬浮提示元素（需在页面中存在，且初始隐藏）
   * @param options.atomicText - 原子变量默认显示文本，默认为 '变量'
   */
  constructor({
    editor,
    tooltip,
    atomicText = '变量',
  }: {
    editor: HTMLElement
    tooltip: HTMLElement
    atomicText?: string
  }) {
    this.editor = editor
    this.tooltip = tooltip
    this.atomicText = atomicText

    // 绑定事件处理器以确保正确解除绑定
    this._handleInput = this._handleInput.bind(this)
    this._handlePaste = this._handlePaste.bind(this)
    this._handleKeydown = this._handleKeydown.bind(this)
    this._handleMouseOver = this._handleMouseOver.bind(this)
    this._handleMouseMove = this._handleMouseMove.bind(this)
    this._handleMouseOut = this._handleMouseOut.bind(this)

    // 初始化事件监听
    this._bindEvents()
  }

  /**
   * 绑定所有必要的 DOM 事件
   */
  private _bindEvents(): void {
    this.editor.addEventListener('input', this._handleInput)
    this.editor.addEventListener('paste', this._handlePaste)
    this.editor.addEventListener('keydown', this._handleKeydown)

    document.addEventListener('mouseover', this._handleMouseOver)
    document.addEventListener('mousemove', this._handleMouseMove)
    document.addEventListener('mouseout', this._handleMouseOut)
  }

  /**
   * 销毁组件，移除所有事件监听器
   */
  public destroy(): void {
    this.editor.removeEventListener('input', this._handleInput)
    this.editor.removeEventListener('paste', this._handlePaste)
    this.editor.removeEventListener('keydown', this._handleKeydown)

    document.removeEventListener('mouseover', this._handleMouseOver)
    document.removeEventListener('mousemove', this._handleMouseMove)
    document.removeEventListener('mouseout', this._handleMouseOut)
  }

  /**
   * 插入一个原子变量（供外部调用）
   * 在光标位置插入一个可识别的原子 <span> 元素，并前后添加零宽空格
   */
  public insertAtomic(): void {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return

    const range = selection.getRangeAt(0)
    range.deleteContents()

    // 构建原子节点
    const span = document.createElement('span')
    span.setAttribute('data-atomic', 'true')
    span.textContent = this.atomicText
    span.id = `atomic_${Date.now()}`

    // 创建前后零宽空格（用于避免文本合并或删除异常）
    const before = document.createTextNode(this.ZWSP)
    const after = document.createTextNode(this.ZWSP)

    // 倒序插入，保持顺序正确
    range.insertNode(after)
    range.insertNode(span)
    range.insertNode(before)

    // 重新设置光标到零宽空格之后
    const newRange = document.createRange()
    newRange.setStart(after, after.length)
    newRange.collapse(true) // 折叠光标

    selection.removeAllRanges()
    selection.addRange(newRange)
  }

  /**
   * 输入事件处理器：检测是否有原子变量被编辑，若内容改变则退化为普通文本
   */
  private _handleInput(): void {
    this._degradeEditedAtomic()
  }

  /**
   * 粘贴事件处理器：由于粘贴操作是异步的，需要延迟执行退化检查
   */
  private _handlePaste(): void {
    setTimeout(() => this._degradeEditedAtomic(), 0)
  }

  /**
   * 键盘事件处理器：处理回车键和退格键特殊行为
   *
   * - 回车键：如果光标在原子变量内，则阻止默认行为
   * - 退格键：自定义删除逻辑，避免因零宽字符导致多次删除
   */
  private _handleKeydown(e: KeyboardEvent): void {
    if (e.key === 'Enter') {
      const target = e.target as HTMLElement
      if (
        target.nodeType === Node.ELEMENT_NODE &&
        target.hasAttribute('data-atomic')
      ) {
        e.preventDefault()
      }
    } else if (e.key === 'Backspace') {
      this._handleBackspace(e)
    }
  }

  /**
   * 退格键专用处理器，防止因零宽字符造成多次删除
   *
   * @param e - 键盘事件
   */
  private _handleBackspace(e: KeyboardEvent): void {
    if (this._isProcessingBackspace) return
    this._isProcessingBackspace = true

    try {
      const selection = window.getSelection()
      if (!selection || selection.rangeCount === 0) return

      const range = selection.getRangeAt(0)
      range.deleteContents()

      // 重建光标位置（插入点后）
      const newRange = document.createRange()
      newRange.setStartAfter(range.startContainer)
      newRange.collapse(true)

      selection.removeAllRanges()
      selection.addRange(newRange)
    } finally {
      this._isProcessingBackspace = false
    }

    e.stopPropagation()
  }

  /**
   * 清理光标附近的零宽空格（ZWSP）
   * 用于修复多次删除后残留的不可见字符问题
   *
   * @param range - 当前选区
   * @param editor - 编辑器根元素
   */
  private _cleanZWSPAroundCursor(range: Range, editor: HTMLElement): void {
    const { startContainer } = range
    let textNode: Text | null = null

    // 尝试获取当前容器中的文本节点
    if (startContainer.nodeType === Node.TEXT_NODE) {
      textNode = startContainer as Text
    } else if (startContainer.childNodes.length > 0) {
      // 如果是元素节点，查找第一个文本子节点
      let node = startContainer.firstChild
      while (node && node.nodeType !== Node.TEXT_NODE) {
        node = node.nextSibling
      }
      textNode = node as Text | null
    }

    // 若不是零宽空格，直接返回
    if (!textNode || textNode.textContent !== this.ZWSP) return

    const parent = textNode.parentNode
    if (!parent) return

    parent.removeChild(textNode)
    this._mergeAdjacentTextNodes(editor)

    // 重新设置光标（可选优化）
    const newRange = document.createRange()
    newRange.setStartAfter(startContainer)
    const selection = window.getSelection()
    selection?.removeAllRanges()
    selection?.addRange(newRange)
  }

  /**
   * 检查并退化已被编辑的原子变量
   * 一旦发现原子变量内容发生变化，就将其替换为纯文本节点
   */
  private _degradeEditedAtomic(): void {
    const spans = this.editor.querySelectorAll('span[data-atomic="true"]')
    spans.forEach((span) => {
      if (span.textContent !== this.atomicText) {
        const textNode = document.createTextNode(span.textContent)

        // 记录光标位置（如果光标在该 span 内）
        let cursorPosition: number | null = null
        const selection = window.getSelection()

        if (selection?.rangeCount > 0) {
          const range = selection.getRangeAt(0)
          if (span.contains(range.startContainer) || range.startContainer === span) {
            // 计算光标在 span 内的位置
            const spanRange = document.createRange()
            spanRange.selectNodeContents(span)
            spanRange.setEnd(range.startContainer, range.startOffset)
            cursorPosition = spanRange.toString().length
          }
        }

        // 替换 span 为文本节点
        span.parentNode?.replaceChild(textNode, span)

        // 恢复光标位置
        if (cursorPosition !== null) {
          const newRange = document.createRange()
          newRange.setStart(textNode, cursorPosition)
          newRange.collapse(true)
          selection?.removeAllRanges()
          selection?.addRange(newRange)
        }
      }
    })
  }

  /**
   * 鼠标悬停事件：当鼠标进入原子变量时，显示悬浮提示
   *
   * @param e - MouseEvent
   */
  private _handleMouseOver(e: MouseEvent): void {
    const target = e.target as HTMLElement
    if (target.getAttribute('data-atomic') === 'true') {
      this.currentHovering = target

      const rect = target.getBoundingClientRect()
      const x = rect.left + rect.width / 2
      const y = rect.top + rect.height / 2

      this._updateTooltipPosition(x, y, target.textContent ?? '')
    } else {
      this._hideTooltip()
    }
  }

  /**
   * 鼠标移动事件：更新提示框位置
   *
   * @param e - MouseEvent
   */
  private _handleMouseMove(e: MouseEvent): void {
    if (!this.currentHovering) {
      this._hideTooltip()
      return
    }

    const rect = this.currentHovering.getBoundingClientRect()
    const x = rect.left + rect.width / 2
    const y = rect.top + rect.height / 2

    this._updateTooltipPosition(x, y, this.currentHovering.textContent ?? '')
  }

  /**
   * 鼠标离开事件：隐藏提示框
   *
   * @param e - MouseEvent
   */
  private _handleMouseOut(e: MouseEvent): void {
    const target = e.relatedTarget as HTMLElement
    if (
      !target ||
      !target.closest ||
      !target.closest('span[data-atomic="true"]')
    ) {
      this._hideTooltip()
    }
  }

  /**
   * 根据坐标更新提示框位置并显示
   *
   * @param x - X 坐标
   * @param y - Y 坐标
   * @param content - 提示内容
   */
  private _updateTooltipPosition(x: number, y: number, content: string): void {
    this.tooltip.textContent = content

    let tipX = x + 10
    let tipY = y + 10

    const winWidth = window.innerWidth
    const winHeight = window.innerHeight
    const tipWidth = this.tooltip.offsetWidth
    const tipHeight = this.tooltip.offsetHeight

    // 边界判断与修正
    if (tipX + tipWidth > winWidth) tipX = winWidth - tipWidth - 10
    if (tipY + tipHeight > winHeight) tipY = winHeight - tipHeight - 10
    if (tipX < 10) tipX = 10
    if (tipY < 10) tipY = 10

    this.tooltip.style.left = `${tipX}px`
    this.tooltip.style.top = `${tipY}px`

    this.tooltip.classList.add('show')
    this.isTooltipShowing = true
  }

  /**
   * 隐藏悬浮提示
   */
  private _hideTooltip(): void {
    this.tooltip.classList.remove('show')
    this.isTooltipShowing = false
    this.currentHovering = null
  }

  /**
   * 合并相邻的文本节点（减少冗余节点）
   *
   * @param container - 要扫描的容器元素
   */
  private _mergeAdjacentTextNodes(container: HTMLElement): void {
    const walker = document.createTreeWalker(
      container,
      NodeFilter.SHOW_TEXT,
      null
    )

    const nodes: Text[] = []
    let node: Node | null
    while ((node = walker.nextNode())) {
      if (node instanceof Text) {
        nodes.push(node)
      }
    }

    // 合并相邻文本节点
    for (let i = 0; i < nodes.length - 1; i++) {
      const current = nodes[i]
      const next = nodes[i + 1]

      if (
        current.nodeValue?.trim() === '' &&
        next.nodeValue?.trim() === ''
      ) {
        continue
      }

      // 检查是否可以合并
      if (
        current.parentNode === next.parentNode &&
        current.nextSibling === next
      ) {
        current.appendData(next.data)
        next.remove()
      }
    }
  }

  /**
   * 获取编辑器当前的 HTML 内容
   *
   * @returns 编辑器的 innerHTML
   */
  public getHTML(): string {
    return this.editor.innerHTML
  }

  /**
   * 设置编辑器内容（用于加载保存的数据）
   *
   * @param html - 要设置的 HTML 字符串
   */
  public setHTML(html: string): void {
    this.editor.innerHTML = html
    this._degradeEditedAtomic()
  }
}
