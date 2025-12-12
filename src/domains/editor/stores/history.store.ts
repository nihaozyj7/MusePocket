import { defineStore } from 'pinia'
// historydb 已删除，功能已移除
// import { historydb } from '@shared/db'
import { uid } from '@shared/utils'
// DBHistoryRecord 类型已删除
// import type { DBHistoryRecord } from '@shared/types'
// computeDiff 功能已删除
// import { computeDiff } from '@domains/editor/services/history.service'

// 为 UI 组件提供的 mock 类型
interface MockHistoryRecord {
  id: string
  articleId: string
  sequence: number
  diffsJson: string
  fullContent?: string
  isSnapshot: boolean
  createdTime: number
  modifiedTime: number
  deletedTime: number
}

interface ArticleHistoryState {
  /** 当前栈顶快照（用于下次对比和撤销操作的基准） */
  topSnapshot: string
  /** 当前索引位置（指向当前正在编辑的版本，-1表示在最新版本） */
  currentIndex: number
  /** 总历史记录数 */
  totalCount: number
}

interface HistoryState {
  /** 每个文章的历史状态 */
  articleStates: Map<string, ArticleHistoryState>
  /** 当前激活的文章ID */
  currentArticleId: string | null
  /** 每个文章的序号计数器 */
  sequenceCounters: Map<string, number>
  /** 当前文章的历史记录列表（用于UI展示，mock数据） */
  currentHistories: MockHistoryRecord[]
}

export const useHistoryStore = defineStore('history', {
  state: (): HistoryState => ({
    articleStates: new Map(),
    currentArticleId: null,
    sequenceCounters: new Map(),
    currentHistories: []
  }),

  getters: {
    /**
     * 获取当前文章的历史状态
     */
    currentState(state): ArticleHistoryState | null {
      if (!state.currentArticleId) return null
      return state.articleStates.get(state.currentArticleId) || null
    },

    /**
     * 是否可以撤销
     */
    canUndo(state): boolean {
      const articleState = this.currentState
      if (!articleState) return false
      // 如果在最新版本（-1）且有历史记录，或者不在第一条记录，都可以撤销
      return articleState.currentIndex === -1 ? articleState.totalCount > 0 : articleState.currentIndex > 0
    },

    /**
     * 是否可以重做
     */
    canRedo(state): boolean {
      const articleState = this.currentState
      if (!articleState) return false
      // 只有在历史版本（currentIndex != -1）才能重做
      return articleState.currentIndex !== -1 && articleState.currentIndex < articleState.totalCount - 1
    },

    /**
     * 获取历史记录统计信息
     */
    stats(state): { undoCount: number; redoCount: number; canUndo: boolean; canRedo: boolean } | null {
      const articleState = this.currentState
      if (!articleState) return null

      // 计算可撤销的步数
      const undoCount = articleState.currentIndex === -1
        ? articleState.totalCount
        : articleState.currentIndex + 1

      // 计算可重做的步数
      const redoCount = articleState.currentIndex === -1
        ? 0
        : articleState.totalCount - articleState.currentIndex - 1

      return {
        undoCount,
        redoCount,
        canUndo: this.canUndo,
        canRedo: this.canRedo
      }
    }
  },

  actions: {
    /**
     * 初始化或切换到指定文章
     */
    async initArticle(articleId: string, initialText: string = '') {
      // 功能已移除，仅保留空实现
    },

    /**
     * 从数据库加载历史记录
     */
    async loadHistoriesFromDB(articleId: string, initialText: string) {
      // 功能已移除，仅保留空实现
    },

    /**
     * 获取下一个序号
     */
    getNextSequence(articleId: string): number {
      // 功能已移除，仅保留空实现
      return 0
    },

    /**
     * 刷新当前文章的历史记录列表
     */
    async refreshHistories() {
      // 功能已移除，仅保留空实现
    },

    /**
     * 记录文本变更
     * @param newText 新文本
     * @param oldText 旧文本（栈顶快照）
     */
    async recordChange(newText: string, oldText: string) {
      // 功能已移除，仅保留空实现
    },

    /**
     * 删除指定索引之后的所有历史记录
     */
    async deleteHistoriesAfterIndex(articleId: string, index: number) {
      // 功能已移除，仅保留空实现
    },

    /**
     * 保存变更到数据库
     * 逻辑：
     * 1. 移除旧栈顶的快照（如果存在）
     * 2. 保存新记录到栈顶：快照(newText) + diff(oldText->newText)
     */
    async saveChangeToDB(articleId: string, oldText: string, newText: string) {
      // 功能已移除，仅保留空实现
    },

    /**
     * 撤销：向历史方向移动
     */
    async undo(): Promise<string | null> {
      // 功能已移除，仅保留空实现
      return null
    },

    /**
     * 重做：向当前方向移动
     */
    async redo(): Promise<string | null> {
      // 功能已移除，仅保留空实现
      return null
    },

    /**
     * 重建指定索引位置的文本
     * 逻辑：
     * 1. 从栈顶快照开始
     * 2. 从栈顶向目标索引方向反向应用diff
     */
    async reconstructTextAtIndex(articleId: string, index: number): Promise<string | null> {
      // 功能已移除，仅保留空实现
      return null
    },

    /**
     * 回退到指定的历史版本
     */
    async restoreToHistory(historyId: string): Promise<string | null> {
      // 功能已移除，仅保留空实现
      return null
    },

    /**
     * 清除指定文章的历史记录
     */
    clearArticleHistory(articleId: string) {
      // 功能已移除，仅保留空实现
    },

    /**
     * 清除所有历史记录
     */
    clearAll() {
      // 功能已移除，仅保留空实现
    },

    /**
     * 重置当前文章的历史记录
     */
    resetCurrent(text: string = '') {
      // 功能已移除，仅保留空实现
    }
  }
})
