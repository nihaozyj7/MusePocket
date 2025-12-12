import { defineStore } from 'pinia'
import { historydb, kvdb } from '@shared/db'
import { uid } from '@shared/utils'
import type { ArticleHistoryRecord } from '@shared/types'
import { reconstructContentAtIndex, saveNewVersion } from '@domains/editor/services/history.service'

interface ArticleHistoryState {
  /** 当前索引位置（指向当前正在编辑的版本，-1 表示在最新版本）*/
  currentIndex: number
  /** 总历史记录数 */
  totalCount: number
}

interface HistoryState {
  /** 每个文章的历史状态 */
  articleStates: Map<string, ArticleHistoryState>
  /** 当前激活的文章ID */
  currentArticleId: string | null
  /** 当前文章的历史记录列表（用于 UI 展示）*/
  currentHistories: ArticleHistoryRecord[]
}

export const useHistoryStore = defineStore('history', {
  state: (): HistoryState => ({
    articleStates: new Map(),
    currentArticleId: null,
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
    async initArticle(articleId: string) {
      this.currentArticleId = articleId
      await this.loadHistories(articleId)
    },

    /**
     * 从数据库加载历史记录
     * @param resetIndex 是否从数据库加载当前版本（默认 true）
     */
    async loadHistories(articleId: string, resetIndex: boolean = true) {
      const histories = await historydb.getArticleHistories(articleId)
      this.currentHistories = histories

      let currentIndex = -1

      if (resetIndex) {
        // 从数据库加载当前历史版本 ID
        const currentHistoryId = await kvdb.getCurrentHistoryId(articleId)
        if (currentHistoryId) {
          // 查找该历史记录的索引
          const index = histories.findIndex(h => h.id === currentHistoryId)
          if (index !== -1) {
            currentIndex = index
            console.log(`[加载历史] 从数据库恢复当前版本索引: ${currentIndex} (ID: ${currentHistoryId})`)
          } else {
            console.warn(`[加载历史] 当前版本 ID ${currentHistoryId} 未找到，重置为 -1`)
          }
        }
      } else {
        // 保持内存中的状态
        const existingState = this.articleStates.get(articleId)
        currentIndex = existingState ? existingState.currentIndex : -1
      }

      // 边界检查
      if (currentIndex >= histories.length) {
        console.warn(`[加载历史] currentIndex (${currentIndex}) 超出范围 (${histories.length})，重置为 -1`)
        currentIndex = -1
      }

      // 更新状态
      this.articleStates.set(articleId, {
        currentIndex,
        totalCount: histories.length
      })
    },

    /**
     * 刷新当前文章的历史记录列表（保持当前索引位置）
     */
    async refreshHistories() {
      if (!this.currentArticleId) return
      await this.loadHistories(this.currentArticleId, false) // 不重新加载当前版本
    },

    /**
     * 撤销：向历史方向移动
     */
    async undo(): Promise<string | null> {
      if (!this.canUndo || !this.currentArticleId) return null

      const state = this.articleStates.get(this.currentArticleId)
      if (!state) return null

      // 计算目标索引
      const targetIndex = state.currentIndex === -1 ? 0 : state.currentIndex + 1

      // 重建内容
      const content = await reconstructContentAtIndex(this.currentArticleId, targetIndex)
      if (content === null) return null

      // 更新索引
      state.currentIndex = targetIndex

      // 持久化当前版本
      await this.saveCurrentVersion()

      return content
    },

    /**
     * 重做：向当前方向移动
     */
    async redo(): Promise<string | null> {
      if (!this.canRedo || !this.currentArticleId) return null

      const state = this.articleStates.get(this.currentArticleId)
      if (!state) return null

      // 计算目标索引
      const targetIndex = state.currentIndex - 1

      // 如果目标是 -1，直接返回栈顶快照
      if (targetIndex === -1) {
        const topHistory = await historydb.getTopHistory(this.currentArticleId)
        if (!topHistory || !topHistory.fullContent) return null

        state.currentIndex = -1
        // 持久化当前版本
        await this.saveCurrentVersion()
        return topHistory.fullContent
      }

      // 重建内容
      const content = await reconstructContentAtIndex(this.currentArticleId, targetIndex)
      if (content === null) return null

      // 更新索引
      state.currentIndex = targetIndex

      // 持久化当前版本
      await this.saveCurrentVersion()

      return content
    },

    /**
     * 回退到指定的历史版本（移动指针，不创建新版本）
     * @param historyId 历史记录 ID
     * @returns 重建的内容
     */
    async revertToHistory(historyId: string): Promise<string | null> {
      if (!this.currentArticleId) return null

      // 查找目标历史记录的索引
      const targetIndex = this.currentHistories.findIndex(h => h.id === historyId)
      if (targetIndex === -1) return null

      // 重建内容
      const content = await reconstructContentAtIndex(this.currentArticleId, targetIndex)
      if (content === null) return null

      // 移动指针到目标位置
      const state = this.articleStates.get(this.currentArticleId)
      if (state) {
        state.currentIndex = targetIndex
        console.log(`[回退] currentIndex 设置为: ${targetIndex}`)
        // 持久化当前版本
        await this.saveCurrentVersion()
      }

      return content
    },

    /**
     * 获取指定版本的内容（用于预览）
     */
    async getHistoryContent(historyId: string): Promise<string | null> {
      if (!this.currentArticleId) return null

      const targetIndex = this.currentHistories.findIndex(h => h.id === historyId)
      if (targetIndex === -1) return null

      return await reconstructContentAtIndex(this.currentArticleId, targetIndex)
    },

    /**
     * 清除指定文章的历史记录
     */
    async clearArticleHistory(articleId: string) {
      await historydb.deleteArticleHistories(articleId)
      this.articleStates.delete(articleId)
      if (this.currentArticleId === articleId) {
        this.currentHistories = []
      }
    },

    /**
     * 清除所有历史记录
     */
    clearAll() {
      this.articleStates.clear()
      this.currentArticleId = null
      this.currentHistories = []
    },

    /**
     * 重置当前文章的状态
     */
    resetCurrent() {
      if (!this.currentArticleId) return
      const state = this.articleStates.get(this.currentArticleId)
      if (state) {
        state.currentIndex = -1
      }
    },

    /**
     * 获取当前索引
     */
    getCurrentIndex(): number {
      if (!this.currentArticleId) return -1
      const state = this.articleStates.get(this.currentArticleId)
      return state ? state.currentIndex : -1
    },

    /**
     * 重置索引到栈顶（-1）
     * @param newTopHistoryId 新的栈顶历史记录 ID（可选，用于更新 KV 存储）
     */
    async resetIndex(newTopHistoryId?: string) {
      if (!this.currentArticleId) return
      const state = this.articleStates.get(this.currentArticleId)
      if (state) {
        state.currentIndex = -1
        console.log(`[重置] currentIndex 设置为: -1`)

        // 如果提供了新栈顶 ID，更新 KV 存储
        if (newTopHistoryId) {
          await kvdb.setCurrentHistoryId(this.currentArticleId, newTopHistoryId)
          console.log(`[重置] 已更新 KV 存储的栈顶 ID: ${newTopHistoryId}`)
        } else {
          // 否则删除 KV 记录（表示在最新版本）
          await kvdb.deleteCurrentHistoryId(this.currentArticleId)
          console.log(`[重置] 已删除 KV 记录，当前在最新版本`)
        }
      }
    },

    /**
     * 舍弃当前索引到栈顶之间的记录
     * @param currentIndex 当前索引
     */
    async discardRecordsAfterIndex(currentIndex: number) {
      if (!this.currentArticleId || currentIndex <= 0) return

      console.log(`[舍弃记录] 开始舍弃索引 0 到 ${currentIndex - 1} 的记录`)

      // 获取需要删除的记录 ID
      const recordsToDelete = this.currentHistories.slice(0, currentIndex)

      // 从数据库中删除
      for (const record of recordsToDelete) {
        await historydb.deleteHistory(record.id)
        console.log(`[舍弃记录] 已删除: ${record.id}`)
      }

      console.log(`[舍弃记录] 共删除 ${recordsToDelete.length} 条记录`)
    },

    /**
     * 保存当前版本到数据库（使用 KV 存储）
     */
    async saveCurrentVersion() {
      if (!this.currentArticleId) return

      const state = this.articleStates.get(this.currentArticleId)
      if (!state) return

      // 如果在最新版本，删除 KV 记录
      if (state.currentIndex === -1) {
        await kvdb.deleteCurrentHistoryId(this.currentArticleId)
        console.log(`[保存版本] 已删除 KV 记录，当前在最新版本`)
        return
      }

      // 获取当前版本的历史 ID
      const currentHistory = this.currentHistories[state.currentIndex]
      if (currentHistory) {
        await kvdb.setCurrentHistoryId(this.currentArticleId, currentHistory.id)
        console.log(`[保存版本] 已保存当前版本 ID: ${currentHistory.id} (索引: ${state.currentIndex})`)
      }
    }
  }
})
