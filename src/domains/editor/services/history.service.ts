// DiffOperation 类型已删除
// import type { DiffOperation } from '@/shared/types'

// 为 UI 组件提供的 mock 类型
interface MockDiffOperation {
  type: 'insert' | 'delete' | 'equal'
  text: string
  position: number
}

/**
 * 计算两个文本之间的差异（简化版 Myers diff 算法）
 * @param oldText 旧文本
 * @param newText 新文本
 * @returns Diff 操作数组
 */
export function computeDiff(oldText: string, newText: string): MockDiffOperation[] {
  // 功能已移除，仅保留空实现
  return []
}

/**
 * 最长公共子序列算法（用于计算 diff）
 */
function longestCommonSubsequence(str1: string, str2: string): Array<[string, boolean]> {
  // 功能已移除，仅保留空实现
  return []
}

/**
 * 优化 diff 操作（合并连续的相同类型操作）
 */
function optimizeDiffs(diffs: MockDiffOperation[]): MockDiffOperation[] {
  // 功能已移除，仅保留空实现
  return []
}

/**
 * 应用 diff 操作到文本
 * @param text 原始文本
 * @param diffs Diff 操作数组
 * @returns 应用后的文本
 */
export function applyDiff(text: string, diffs: MockDiffOperation[]): string {
  // 功能已移除，仅保留空实现
  return text
}

/**
 * 反向 diff 操作（用于撤销）
 * @param diffs 原始 diff 操作
 * @returns 反向 diff 操作
 */
export function reverseDiff(diffs: MockDiffOperation[]): MockDiffOperation[] {
  // 功能已移除，仅保留空实现
  return []
}

/**
 * 历史记录管理器
 */
export class HistoryManager {
  private undoStack: MockDiffOperation[][] = []
  private redoStack: MockDiffOperation[][] = []
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
    // 功能已移除，仅保留空实现
  }

  /**
   * 撤销
   */
  undo(): string | null {
    // 功能已移除，仅保留空实现
    return null
  }

  /**
   * 重做
   */
  redo(): string | null {
    // 功能已移除，仅保留空实现
    return null
  }

  /**
   * 是否可以撤销
   */
  canUndo(): boolean {
    return false
  }

  /**
   * 是否可以重做
   */
  canRedo(): boolean {
    return false
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
    // 功能已移除，仅保留空实现
  }

  /**
   * 获取历史记录统计
   */
  getStats() {
    return {
      undoCount: 0,
      redoCount: 0,
      canUndo: false,
      canRedo: false
    }
  }

  /**
   * 获取所有撤销栈的 diffs（用于持久化）
   */
  getUndoStack(): MockDiffOperation[][] {
    return []
  }
}

/**
 * 从基础版本通过应用多个 diff 重建文本
 */
export function reconstructText(baseText: string, diffs: MockDiffOperation[][]): string {
  // 功能已移除，仅保留空实现
  return baseText
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
  // 功能已移除，仅保留空实现
  return []
}
