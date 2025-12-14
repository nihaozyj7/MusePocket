import db from "./db.ts"
import type { ArticleHistoryRecord, Status } from "../types/index.ts"

// 历史记录操作类
export default new class {
  /**
   * 创建历史记录
   */
  async createHistory(record: ArticleHistoryRecord): Promise<Status> {
    try {
      const tx = db.transaction(['articleHistories'], 'readwrite')
      await tx.objectStore('articleHistories').add({ ...record })
      await tx.done
      return { success: true }
    } catch (err: any) {
      return { success: false, message: err.message }
    }
  }

  /**
   * 更新历史记录
   */
  async updateHistory(record: ArticleHistoryRecord): Promise<Status> {
    try {
      const tx = db.transaction(['articleHistories'], 'readwrite')
      await tx.objectStore('articleHistories').put({ ...record })
      await tx.done
      return { success: true }
    } catch (err: any) {
      return { success: false, message: err.message }
    }
  }

  /**
   * 删除历史记录
   */
  async deleteHistory(id: string): Promise<Status> {
    try {
      const tx = db.transaction(['articleHistories'], 'readwrite')
      await tx.objectStore('articleHistories').delete(id)
      await tx.done
      return { success: true }
    } catch (err: any) {
      return { success: false, message: err.message }
    }
  }

  /**
   * 获取文章的所有历史记录（按创建时间倒序）
   */
  async getArticleHistories(articleId: string): Promise<ArticleHistoryRecord[]> {
    try {
      const store = db.transaction(['articleHistories'], 'readonly').objectStore('articleHistories')
      const histories = await store.index('by-article').getAll(articleId)
      // 按创建时间倒序排列，最新的在前
      return histories.sort((a, b) => b.createdTime - a.createdTime)
    } catch (err: any) {
      console.error('获取历史记录失败:', err)
      return []
    }
  }

  /**
   * 删除文章的所有历史记录
   */
  async deleteArticleHistories(articleId: string): Promise<Status> {
    try {
      const tx = db.transaction(['articleHistories'], 'readwrite')
      const store = tx.objectStore('articleHistories')
      const histories = await store.index('by-article').getAll(articleId)
      for (const history of histories) {
        await store.delete(history.id)
      }
      await tx.done
      return { success: true }
    } catch (err: any) {
      return { success: false, message: err.message }
    }
  }

  /**
   * 获取最新的历史记录（栈顶）
   */
  async getTopHistory(articleId: string): Promise<ArticleHistoryRecord | null> {
    const histories = await this.getArticleHistories(articleId)
    return histories.length > 0 ? histories[0] : null
  }

  /**
   * 清除旧栈顶的快照，保留 diff
   * 注意：这个方法应该在创建新记录之后调用，所以需要清除的是第二条记录
   */
  async clearOldTopSnapshot(articleId: string): Promise<Status> {
    try {
      const histories = await this.getArticleHistories(articleId)
      // 如果只有一条或没有记录，不需要清除
      if (histories.length <= 1) {
        return { success: true }
      }

      // 清除第二条记录（原来的栈顶）的快照
      const oldTopHistory = histories[1]
      if (oldTopHistory && oldTopHistory.fullContent !== null) {
        oldTopHistory.fullContent = null
        return await this.updateHistory(oldTopHistory)
      }
      return { success: true }
    } catch (err: any) {
      return { success: false, message: err.message }
    }
  }
}()
