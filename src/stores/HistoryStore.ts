import { defineStore } from 'pinia'
import { HistoryManager } from '@/historyUtils'
import { historydb } from '@/db'
import { uid } from '@/utils'
import type { DBHistoryRecord, DiffOperation } from '@/types'
import { computeDiff } from '@/historyUtils'

interface HistoryState {
  /** 每个文章的历史管理器 */
  managers: Map<string, HistoryManager>
  /** 当前激活的文章ID */
  currentArticleId: string | null
  /** 每个文章的序号计数器 */
  sequenceCounters: Map<string, number>
  /** 当前文章的历史记录列表（用于界面展示） */
  currentHistories: DBHistoryRecord[]
}

export const useHistoryStore = defineStore('history', {
  state: (): HistoryState => ({
    managers: new Map(),
    currentArticleId: null,
    sequenceCounters: new Map(),
    currentHistories: []
  }),

  getters: {
    /**
     * 获取当前文章的历史管理器
     */
    currentManager(state): HistoryManager | null {
      if (!state.currentArticleId) return null
      return state.managers.get(state.currentArticleId) || null
    },

    /**
     * 是否可以撤销
     */
    canUndo(state): boolean {
      const manager = this.currentManager
      return manager ? manager.canUndo() : false
    },

    /**
     * 是否可以重做
     */
    canRedo(state): boolean {
      const manager = this.currentManager
      return manager ? manager.canRedo() : false
    },

    /**
     * 获取历史记录统计信息
     */
    stats(state): { undoCount: number; redoCount: number; canUndo: boolean; canRedo: boolean } | null {
      const manager = this.currentManager
      return manager ? manager.getStats() : null
    }
  },

  actions: {
    /**
     * 初始化或切换到指定文章
     */
    async initArticle(articleId: string, initialText: string = '') {
      this.currentArticleId = articleId

      if (!this.managers.has(articleId)) {
        // 创建新的管理器
        this.managers.set(articleId, new HistoryManager(initialText, 100))

        // 从数据库加载历史记录
        await this.loadHistoriesFromDB(articleId)
      } else {
        // 如果管理器已存在，更新当前文本
        const manager = this.managers.get(articleId)!
        if (manager.getCurrentText() !== initialText) {
          manager.reset(initialText)
        }
      }

      // 加载历史记录列表
      await this.refreshHistories()
    },

    /**
     * 从数据库加载历史记录
     */
    async loadHistoriesFromDB(articleId: string) {
      try {
        const records = await historydb.getLatestHistories(articleId, 100)
        if (records.length === 0) return

        // 更新序号计数器
        const maxSequence = Math.max(...records.map(r => r.sequence))
        this.sequenceCounters.set(articleId, maxSequence)

        // TODO: 将数据库记录转换为 HistoryManager 的内部状态
        // 这里简化处理，只加载最后一条记录的内容
        const lastRecord = records[records.length - 1]
        if (lastRecord.fullContent) {
          const manager = this.managers.get(articleId)
          if (manager) {
            manager.reset(lastRecord.fullContent)
          }
        }
      } catch (err) {
        console.error('加载历史记录失败:', err)
      }
    },

    /**
     * 获取下一个序号
     */
    getNextSequence(articleId: string): number {
      const current = this.sequenceCounters.get(articleId) || 0
      const next = current + 1
      this.sequenceCounters.set(articleId, next)
      return next
    },

    /**
     * 刷新当前文章的历史记录列表
     */
    async refreshHistories() {
      if (!this.currentArticleId) {
        this.currentHistories = []
        return
      }

      try {
        this.currentHistories = await historydb.getArticleHistories(this.currentArticleId)
      } catch (err) {
        console.error('加载历史记录列表失败:', err)
        this.currentHistories = []
      }
    },

    /**
     * 记录文本变更
     */
    async recordChange(newText: string) {
      const manager = this.currentManager
      if (!manager || !this.currentArticleId) return

      const oldText = manager.getCurrentText()
      if (newText === oldText) return

      // 在内存中记录
      manager.recordChange(newText)

      // 保存到数据库
      await this.saveChangeToDB(this.currentArticleId, oldText, newText)

      // 刷新历史记录列表
      await this.refreshHistories()
    },

    /**
     * 保存变更到数据库
     */
    async saveChangeToDB(articleId: string, oldText: string, newText: string) {
      try {
        const diffs = computeDiff(oldText, newText)
        if (diffs.length === 0) return

        const now = Date.now()
        const sequence = this.getNextSequence(articleId)

        // 每10条记录创建一个快照
        const isSnapshot = sequence % 10 === 0

        const record: DBHistoryRecord = {
          id: uid(),
          articleId,
          diffsJson: JSON.stringify(diffs),
          fullContent: isSnapshot ? newText : undefined,
          isSnapshot,
          sequence,
          createdTime: now,
          modifiedTime: now,
          deletedTime: 0
        }

        await historydb.createHistory(record)

        // 清理旧记录，只保留最新的100条
        await historydb.cleanOldHistories(articleId, 100)
      } catch (err) {
        console.error('保存历史记录失败:', err)
      }
    },

    /**
     * 撤销
     */
    undo(): string | null {
      const manager = this.currentManager
      return manager ? manager.undo() : null
    },

    /**
     * 重做
     */
    redo(): string | null {
      const manager = this.currentManager
      return manager ? manager.redo() : null
    },

    /**
     * 清除指定文章的历史记录
     */
    clearArticleHistory(articleId: string) {
      this.managers.delete(articleId)
      if (this.currentArticleId === articleId) {
        this.currentHistories = []
      }
    },

    /**
     * 清除所有历史记录
     */
    clearAll() {
      this.managers.clear()
      this.currentArticleId = null
      this.currentHistories = []
    },

    /**
     * 重置当前文章的历史记录
     */
    resetCurrent(text: string = '') {
      const manager = this.currentManager
      if (manager) {
        manager.reset(text)
      }
    }
  }
})
