import { defineStore } from 'pinia'
import { historydb } from '@/db'
import { uid } from '@/utils'
import type { DBHistoryRecord } from '@/types'
import { computeDiff } from '@/historyUtils'

interface ArticleHistoryState {
  /** 当前快照内容（用于下次对比） */
  lastSnapshot: string
  /** 当前索引位置（指向当前正在编辑的版本） */
  currentIndex: number
  /** 总历史记录数（用于判断是否可以重做） */
  totalCount: number
}

interface HistoryState {
  /** 每个文章的历史状态 */
  articleStates: Map<string, ArticleHistoryState>
  /** 当前激活的文章ID */
  currentArticleId: string | null
  /** 每个文章的序号计数器 */
  sequenceCounters: Map<string, number>
  /** 当前文章的历史记录列表（用于界面展示） */
  currentHistories: DBHistoryRecord[]
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
      return articleState ? articleState.currentIndex > 0 : false
    },

    /**
     * 是否可以重做
     */
    canRedo(state): boolean {
      const articleState = this.currentState
      return articleState ? articleState.currentIndex < articleState.totalCount - 1 : false
    },

    /**
     * 获取历史记录统计信息
     */
    stats(state): { undoCount: number; redoCount: number; canUndo: boolean; canRedo: boolean } | null {
      const articleState = this.currentState
      if (!articleState) return null
      return {
        undoCount: articleState.currentIndex,
        redoCount: articleState.totalCount - articleState.currentIndex - 1,
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
      this.currentArticleId = articleId

      if (!this.articleStates.has(articleId)) {
        // 创建新的状态
        this.articleStates.set(articleId, {
          lastSnapshot: initialText,
          currentIndex: 0,
          totalCount: 1
        })

        console.log('初始化新文章:', articleId)

        // 从数据库加载历史记录
        await this.loadHistoriesFromDB(articleId, initialText)
      } else {
        // 如果状态已存在，更新快照
        const articleState = this.articleStates.get(articleId)!
        articleState.lastSnapshot = initialText
        console.log('切换到已存在的文章:', articleId, '当前索引:', articleState.currentIndex, '总数:', articleState.totalCount)
      }

      // 加载历史记录列表
      await this.refreshHistories()

      const state = this.articleStates.get(articleId)
      console.log('文章初始化完成:', {
        articleId,
        currentIndex: state?.currentIndex,
        totalCount: state?.totalCount,
        canUndo: this.canUndo,
        canRedo: this.canRedo
      })
    },

    /**
     * 从数据库加载历史记录
     */
    async loadHistoriesFromDB(articleId: string, initialText: string) {
      try {
        const records = await historydb.getArticleHistories(articleId)
        console.log('从数据库加载历史记录:', records.length, '条')

        if (records.length === 0) return

        // 更新序号计数器
        const maxSequence = Math.max(...records.map(r => r.sequence))
        this.sequenceCounters.set(articleId, maxSequence)

        // 更新文章状态
        const articleState = this.articleStates.get(articleId)
        if (articleState) {
          articleState.totalCount = records.length
          articleState.currentIndex = records.length - 1 // 指向最新的记录
          // 如果最后一条记录是快照，使用它；否则使用 initialText
          const lastRecord = records[records.length - 1]
          if (lastRecord.fullContent) {
            articleState.lastSnapshot = lastRecord.fullContent
          } else {
            articleState.lastSnapshot = initialText
          }

          console.log('历史记录加载完成:', {
            totalCount: articleState.totalCount,
            currentIndex: articleState.currentIndex,
            maxSequence
          })
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
     * @param newText 新文本
     */
    async recordChange(newText: string) {
      const articleState = this.currentState
      if (!articleState || !this.currentArticleId) {
        console.log('记录变更失败 - 缺少状态')
        return
      }

      const oldText = articleState.lastSnapshot
      if (newText === oldText) {
        console.log('文本未变化，跳过记录')
        return
      }

      console.log('记录变更，当前索引:', articleState.currentIndex, '总数:', articleState.totalCount)

      // 如果不在最新位置（说明用户回退后编辑），需要丢弃后面的历史
      if (articleState.currentIndex < articleState.totalCount - 1) {
        console.log('回退后编辑，删除后面的历史')
        // 删除索引位置之后的所有历史记录
        await this.deleteHistoriesAfterIndex(this.currentArticleId, articleState.currentIndex)
        // 重置 totalCount
        articleState.totalCount = articleState.currentIndex + 1
      }

      // 保存到数据库
      await this.saveChangeToDB(this.currentArticleId, oldText, newText)

      // 更新快照和索引
      articleState.lastSnapshot = newText
      articleState.currentIndex++
      articleState.totalCount++

      console.log('变更记录完成，新索引:', articleState.currentIndex, '新总数:', articleState.totalCount)

      // 刷新历史记录列表
      await this.refreshHistories()
    },

    /**
     * 删除指定索引之后的所有历史记录
     */
    async deleteHistoriesAfterIndex(articleId: string, index: number) {
      try {
        const histories = await historydb.getArticleHistories(articleId)
        const toDelete = histories.slice(index + 1)
        for (const record of toDelete) {
          await historydb.deleteHistory(record.id)
        }
      } catch (err) {
        console.error('删除历史记录失败:', err)
      }
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

        // 新记录：只保存diff，不保存快照（快照在下一步更新）
        const record: DBHistoryRecord = {
          id: uid(),
          articleId,
          diffsJson: JSON.stringify(diffs),
          fullContent: undefined,  // 不保存快照
          isSnapshot: false,
          sequence,
          createdTime: now,
          modifiedTime: now,
          deletedTime: 0
        }

        await historydb.createHistory(record)

        // 更新栈顶记录的快照（最新的记录）
        await this.updateTopSnapshot(articleId, newText)

        // 清理旧记录，只保留最新的50条
        await historydb.cleanOldHistories(articleId, 50)
      } catch (err) {
        console.error('保存历史记录失败:', err)
      }
    },

    /**
     * 更新栈顶记录的快照
     * 简化实现：直接删除上一个记录的快照，给当前记录添加快照
     */
    async updateTopSnapshot(articleId: string, snapshotContent: string) {
      try {
        const histories = await historydb.getArticleHistories(articleId)
        if (histories.length === 0) return

        const topRecord = histories[histories.length - 1]

        // 如果栈顶已经有快照，更新它
        if (topRecord.isSnapshot && topRecord.fullContent) {
          // 已经是最新的了，不需要操作
          return
        }

        // 否则需要为栈顶设置快照
        // 这里简化处理：直接在内存中保留 lastSnapshot
        // 不修改数据库中的记录
      } catch (err) {
        console.error('更新栈顶快照失败:', err)
      }
    },

    /**
     * 撤销：索引向后移动
     */
    async undo(): Promise<string | null> {
      const articleState = this.currentState
      if (!articleState || !this.currentArticleId || !this.canUndo) {
        console.log('撤销失败 - 状态检查:', {
          hasState: !!articleState,
          hasArticleId: !!this.currentArticleId,
          canUndo: this.canUndo,
          currentIndex: articleState?.currentIndex,
          totalCount: articleState?.totalCount
        })
        return null
      }

      const targetIndex = articleState.currentIndex - 1
      console.log('执行撤销，当前索引:', articleState.currentIndex, '目标索引:', targetIndex, '总数:', articleState.totalCount)

      // 先查看数据库中的历史记录
      const histories = await historydb.getArticleHistories(this.currentArticleId)
      console.log('数据库中历史记录数:', histories.length)
      console.log('历史记录详情:', histories.map((h, i) => ({ index: i, sequence: h.sequence, hasDiff: !!h.diffsJson })))

      // 先重建文本，成功后再更新索引
      const text = await this.reconstructTextAtIndex(this.currentArticleId, targetIndex)
      if (text !== null) {
        articleState.currentIndex = targetIndex
        articleState.lastSnapshot = text
        console.log('撤销成功，新索引:', articleState.currentIndex, '重建的文本:', text.substring(0, 100) + '...')
        return text
      }

      console.error('撤销失败，重建文本失败')
      return null
    },

    /**
     * 重做：索引向前移动
     */
    async redo(): Promise<string | null> {
      const articleState = this.currentState
      if (!articleState || !this.currentArticleId || !this.canRedo) {
        console.log('重做失败 - 状态检查:', {
          hasState: !!articleState,
          hasArticleId: !!this.currentArticleId,
          canRedo: this.canRedo,
          currentIndex: articleState?.currentIndex,
          totalCount: articleState?.totalCount
        })
        return null
      }

      const targetIndex = articleState.currentIndex + 1
      console.log('执行重做，当前索引:', articleState.currentIndex, '目标索引:', targetIndex, '总数:', articleState.totalCount)

      // 先重建文本，成功后再更新索引
      const text = await this.reconstructTextAtIndex(this.currentArticleId, targetIndex)
      if (text !== null) {
        articleState.currentIndex = targetIndex
        articleState.lastSnapshot = text
        console.log('重做成功，新索引:', articleState.currentIndex)
        return text
      }

      console.error('重做失败，重建文本失败')
      return null
    },

    /**
     * 重建指定索引位置的文本
     * 逻辑：从内存快照(lastSnapshot)反向应用diff
     */
    async reconstructTextAtIndex(articleId: string, index: number): Promise<string | null> {
      try {
        const histories = await historydb.getArticleHistories(articleId)
        console.log('[reconstructTextAtIndex] 开始，目标索引:', index, '总数记录:', histories.length)

        if (index < 0 || index >= histories.length) {
          console.error('[reconstructTextAtIndex] 索引超出范围:', index, '历史记录数:', histories.length)
          return null
        }

        const articleState = this.articleStates.get(articleId)
        if (!articleState) {
          console.error('[reconstructTextAtIndex] 未找到文章状态:', articleId)
          return null
        }

        console.log('[reconstructTextAtIndex] 当前索引:', articleState.currentIndex, 'lastSnapshot長度:', articleState.lastSnapshot?.length)

        // 如果目标就是当前位置，直接返回快照
        if (index === articleState.currentIndex) {
          console.log('[reconstructTextAtIndex] 目标即当前位置，直接返回快照')
          return articleState.lastSnapshot || ''
        }

        // 否则需要重建
        let text = articleState.lastSnapshot || ''
        const currentIdx = articleState.currentIndex

        console.log('[reconstructTextAtIndex] 初始文本长度:', text.length, '内容:', text.substring(0, 50) + '...')

        if (index < currentIdx) {
          // 向后移动：从当前位置反向应用diff
          console.log('[reconstructTextAtIndex] 向后移动，从索引', currentIdx, '到', index)
          for (let i = currentIdx; i > index; i--) {
            console.log('[reconstructTextAtIndex] 处理记录索引:', i)
            const record = histories[i]
            if (!record) {
              console.error('[reconstructTextAtIndex] 记录不存在:', i)
              continue
            }
            if (!record.diffsJson) {
              console.error('[reconstructTextAtIndex] 记录没有diff，记录ID:', record.id)
              continue
            }
            const diffs = JSON.parse(record.diffsJson)
            console.log('[reconstructTextAtIndex] 反向diff:', diffs)
            // 需要反向diff
            const { reverseDiff, applyDiff } = await import('@/historyUtils')
            const reversedDiffs = reverseDiff(diffs)
            console.log('[reconstructTextAtIndex] 反向后:', reversedDiffs)
            const oldLen = text.length
            text = applyDiff(text, reversedDiffs)
            const newLen = text.length
            console.log('[reconstructTextAtIndex] 文本長度 ', oldLen, '->', newLen, '内容:', text.substring(0, 50) + '...')
          }
        } else {
          // 向前移动：从当前位置正向应用diff
          console.log('[reconstructTextAtIndex] 向前移动，从索引', currentIdx, '到', index)
          for (let i = currentIdx + 1; i <= index; i++) {
            console.log('[reconstructTextAtIndex] 处理记录索引:', i)
            const record = histories[i]
            if (!record) {
              console.error('[reconstructTextAtIndex] 记录不存在:', i)
              continue
            }
            if (!record.diffsJson) {
              console.error('[reconstructTextAtIndex] 记录没有diff，记录ID:', record.id)
              continue
            }
            const diffs = JSON.parse(record.diffsJson)
            console.log('[reconstructTextAtIndex] 正向diff:', diffs)
            const { applyDiff } = await import('@/historyUtils')
            const oldLen = text.length
            text = applyDiff(text, diffs)
            const newLen = text.length
            console.log('[reconstructTextAtIndex] 文本長度 ', oldLen, '->', newLen, '内容:', text.substring(0, 50) + '...')
          }
        }

        // 确保返回的是字符串
        if (typeof text !== 'string') {
          console.error('[reconstructTextAtIndex] 重建文本不是字符串类型:', typeof text)
          return ''
        }

        console.log('[reconstructTextAtIndex] 最终成功，文本長度:', text.length)
        return text
      } catch (err) {
        console.error('[reconstructTextAtIndex] 失败:', err)
        return null
      }
    },

    /**
     * 回退到指定的历史版本
     */
    async restoreToHistory(historyId: string): Promise<string | null> {
      if (!this.currentArticleId) {
        console.error('回退失败：没有当前文章')
        return null
      }

      const histories = await historydb.getArticleHistories(this.currentArticleId)
      const targetIndex = histories.findIndex(h => h.id === historyId)

      console.log('回退到历史版本:', {
        historyId,
        targetIndex,
        totalHistories: histories.length
      })

      if (targetIndex === -1) {
        console.error('未找到目标历史记录')
        return null
      }

      const articleState = this.currentState
      if (!articleState) {
        console.error('未找到文章状态')
        return null
      }

      console.log('当前状态:', {
        currentIndex: articleState.currentIndex,
        totalCount: articleState.totalCount
      })

      // 更新索引
      articleState.currentIndex = targetIndex

      // 重建文本
      const text = await this.reconstructTextAtIndex(this.currentArticleId, targetIndex)
      if (text !== null) {
        articleState.lastSnapshot = text
        console.log('回退成功，新索引:', targetIndex)
      } else {
        console.error('重建文本失败')
      }

      return text
    },

    /**
     * 清除指定文章的历史记录
     */
    clearArticleHistory(articleId: string) {
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
     * 重置当前文章的历史记录
     */
    resetCurrent(text: string = '') {
      const articleState = this.currentState
      if (articleState) {
        articleState.lastSnapshot = text
        articleState.currentIndex = 0
        articleState.totalCount = 1
      }
    }
  }
})
