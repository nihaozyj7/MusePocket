import type { DiffOperation } from '@/shared/types'

/**
 * 计算两个文本之间的差异（简化版 Myers diff 算法）
 * @param oldText 旧文本
 * @param newText 新文本
 * @returns Diff 操作数组
 */
export function computeDiff(oldText: string, newText: string): DiffOperation[] {
  const diffs: DiffOperation[] = []

  // 使用 LCS (最长公共子序列) 算法来计算差异
  const lcs = longestCommonSubsequence(oldText, newText)

  let oldIndex = 0
  let newIndex = 0
  let position = 0

  for (const [char, isCommon] of lcs) {
    if (isCommon) {
      // 公共字符
      oldIndex++
      newIndex++
      position++
    } else {
      // 处理删除
      if (oldIndex < oldText.length && oldText[oldIndex] !== newText[newIndex]) {
        let deleteText = ''
        while (oldIndex < oldText.length &&
          (newIndex >= newText.length || oldText[oldIndex] !== newText[newIndex])) {
          deleteText += oldText[oldIndex]
          oldIndex++
        }
        if (deleteText) {
          diffs.push({
            type: 'delete',
            text: deleteText,
            position
          })
        }
      }

      // 处理插入
      if (newIndex < newText.length && (oldIndex >= oldText.length || oldText[oldIndex] !== newText[newIndex])) {
        let insertText = ''
        while (newIndex < newText.length &&
          (oldIndex >= oldText.length || oldText[oldIndex] !== newText[newIndex])) {
          insertText += newText[newIndex]
          newIndex++
        }
        if (insertText) {
          diffs.push({
            type: 'insert',
            text: insertText,
            position
          })
          position += insertText.length
        }
      }
    }
  }

  return optimizeDiffs(diffs)
}

/**
 * 最长公共子序列算法（用于计算 diff）
 */
function longestCommonSubsequence(str1: string, str2: string): Array<[string, boolean]> {
  const m = str1.length
  const n = str2.length
  const dp: number[][] = Array(m + 1).fill(0).map(() => Array(n + 1).fill(0))

  // 构建 DP 表
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
      }
    }
  }

  // 回溯构建结果
  const result: Array<[string, boolean]> = []
  let i = m, j = n

  while (i > 0 && j > 0) {
    if (str1[i - 1] === str2[j - 1]) {
      result.unshift([str1[i - 1], true])
      i--
      j--
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      result.unshift([str1[i - 1], false])
      i--
    } else {
      result.unshift([str2[j - 1], false])
      j--
    }
  }

  while (i > 0) {
    result.unshift([str1[i - 1], false])
    i--
  }

  while (j > 0) {
    result.unshift([str2[j - 1], false])
    j--
  }

  return result
}

/**
 * 优化 diff 操作（合并连续的相同类型操作）
 */
function optimizeDiffs(diffs: DiffOperation[]): DiffOperation[] {
  if (diffs.length <= 1) return diffs

  const optimized: DiffOperation[] = []
  let current = diffs[0]

  for (let i = 1; i < diffs.length; i++) {
    const next = diffs[i]

    if (current.type === next.type &&
      current.position + (current.type === 'insert' ? current.text.length : 0) === next.position) {
      // 合并相同类型的连续操作
      current = {
        type: current.type,
        text: current.text + next.text,
        position: current.position
      }
    } else {
      optimized.push(current)
      current = next
    }
  }

  optimized.push(current)
  return optimized
}

/**
 * 应用 diff 操作到文本
 * @param text 原始文本
 * @param diffs Diff 操作数组
 * @returns 应用后的文本
 */
export function applyDiff(text: string, diffs: DiffOperation[]): string {
  // 确保 text 是字符串
  if (typeof text !== 'string') {
    console.error('applyDiff: text 不是字符串类型', text)
    return ''
  }

  let result = text
  let offset = 0

  for (const diff of diffs) {
    const actualPosition = diff.position + offset

    if (diff.type === 'insert') {
      result = result.slice(0, actualPosition) + diff.text + result.slice(actualPosition)
      offset += diff.text.length
    } else if (diff.type === 'delete') {
      result = result.slice(0, actualPosition) + result.slice(actualPosition + diff.text.length)
      offset -= diff.text.length
    }
  }

  return result
}

/**
 * 反向 diff 操作（用于撤销）
 * @param diffs 原始 diff 操作
 * @returns 反向 diff 操作
 */
export function reverseDiff(diffs: DiffOperation[]): DiffOperation[] {
  const reversed: DiffOperation[] = []

  // 从后往前处理，并调整位置
  for (let i = diffs.length - 1; i >= 0; i--) {
    const diff = diffs[i]

    if (diff.type === 'insert') {
      reversed.push({
        type: 'delete',
        text: diff.text,
        position: diff.position
      })
    } else if (diff.type === 'delete') {
      reversed.push({
        type: 'insert',
        text: diff.text,
        position: diff.position
      })
    }
  }

  return reversed.reverse()
}

/**
 * 历史记录管理器
 */
export class HistoryManager {
  private undoStack: DiffOperation[][] = []
  private redoStack: DiffOperation[][] = []
  private currentText: string = ''
  private maxHistorySize: number

  constructor(initialText: string = '', maxHistorySize: number = 500) {
    this.currentText = initialText
    this.maxHistorySize = maxHistorySize
  }

  /**
   * 记录新的变更
   */
  recordChange(newText: string) {
    if (newText === this.currentText) return

    const diffs = computeDiff(this.currentText, newText)

    if (diffs.length > 0) {
      this.undoStack.push(diffs)

      // 限制历史记录大小
      if (this.undoStack.length > this.maxHistorySize) {
        this.undoStack.shift()
      }

      // 清空重做栈
      this.redoStack = []

      this.currentText = newText
    }
  }

  /**
   * 撤销
   */
  undo(): string | null {
    if (this.undoStack.length === 0) return null

    const diffs = this.undoStack.pop()!
    const reversedDiffs = reverseDiff(diffs)

    this.redoStack.push(diffs)
    this.currentText = applyDiff(this.currentText, reversedDiffs)

    return this.currentText
  }

  /**
   * 重做
   */
  redo(): string | null {
    if (this.redoStack.length === 0) return null

    const diffs = this.redoStack.pop()!

    this.undoStack.push(diffs)
    this.currentText = applyDiff(this.currentText, diffs)

    return this.currentText
  }

  /**
   * 是否可以撤销
   */
  canUndo(): boolean {
    return this.undoStack.length > 0
  }

  /**
   * 是否可以重做
   */
  canRedo(): boolean {
    return this.redoStack.length > 0
  }

  /**
   * 获取当前文本
   */
  getCurrentText(): string {
    return this.currentText
  }

  /**
   * 重置历史记录
   */
  reset(text: string = '') {
    this.undoStack = []
    this.redoStack = []
    this.currentText = text
  }

  /**
   * 获取历史记录统计
   */
  getStats() {
    return {
      undoCount: this.undoStack.length,
      redoCount: this.redoStack.length,
      canUndo: this.canUndo(),
      canRedo: this.canRedo()
    }
  }

  /**
   * 获取所有撤销栈的 diffs（用于持久化）
   */
  getUndoStack(): DiffOperation[][] {
    return [...this.undoStack]
  }
}

/**
 * 从基础版本通过应用多个 diff 重建文本
 */
export function reconstructText(baseText: string, diffs: DiffOperation[][]): string {
  let text = baseText
  for (const diffSet of diffs) {
    text = applyDiff(text, diffSet)
  }
  return text
}

/**
 * 计算两个文本之间的可视化 diff
 */
export interface VisualDiff {
  type: 'added' | 'removed' | 'unchanged'
  content: string
  lineNumber?: number
}

export function computeVisualDiff(oldText: string, newText: string): VisualDiff[] {
  const result: VisualDiff[] = []
  // 分割文本行，并过滤掉末尾的空行（由末尾换行符产生）
  const oldLines = oldText.split('\n').filter((line, index, arr) => {
    // 保留非最后一行，或者最后一行非空的情况
    return index < arr.length - 1 || line !== ''
  })
  const newLines = newText.split('\n').filter((line, index, arr) => {
    return index < arr.length - 1 || line !== ''
  })

  const maxLen = Math.max(oldLines.length, newLines.length)

  for (let i = 0; i < maxLen; i++) {
    const oldLine = oldLines[i]
    const newLine = newLines[i]

    if (oldLine === newLine) {
      if (oldLine !== undefined) {
        result.push({ type: 'unchanged', content: oldLine, lineNumber: i + 1 })
      }
    } else {
      if (oldLine !== undefined) {
        result.push({ type: 'removed', content: oldLine, lineNumber: i + 1 })
      }
      if (newLine !== undefined) {
        result.push({ type: 'added', content: newLine, lineNumber: i + 1 })
      }
    }
  }

  return result
}
