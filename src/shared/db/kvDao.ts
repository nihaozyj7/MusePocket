import db from "./db.ts"
import type { Status } from "../types/index.ts"

/** KV 存储操作类（用于存储当前历史版本等键值对） */
export default new class {
  /**
   * 设置键值对
   */
  async set(key: string, value: string): Promise<Status> {
    try {
      const tx = db.transaction(['kvStore'], 'readwrite')
      await tx.objectStore('kvStore').put({ key, value })
      await tx.done
      return { success: true }
    } catch (err: any) {
      return { success: false, message: err.message }
    }
  }

  /**
   * 获取键值
   */
  async get(key: string): Promise<string | null> {
    try {
      const store = db.transaction(['kvStore'], 'readonly').objectStore('kvStore')
      const record = await store.get(key)
      return record ? record.value : null
    } catch (err: any) {
      console.error('获取 KV 值失败:', err)
      return null
    }
  }

  /**
   * 删除键值对
   */
  async delete(key: string): Promise<Status> {
    try {
      const tx = db.transaction(['kvStore'], 'readwrite')
      await tx.objectStore('kvStore').delete(key)
      await tx.done
      return { success: true }
    } catch (err: any) {
      return { success: false, message: err.message }
    }
  }

  /**
   * 设置当前历史版本 ID（以文章 ID 为键）
   */
  async setCurrentHistoryId(articleId: string, historyId: string): Promise<Status> {
    return this.set(`current_history_${articleId}`, historyId)
  }

  /**
   * 获取当前历史版本 ID
   */
  async getCurrentHistoryId(articleId: string): Promise<string | null> {
    return this.get(`current_history_${articleId}`)
  }

  /**
   * 删除当前历史版本 ID
   */
  async deleteCurrentHistoryId(articleId: string): Promise<Status> {
    return this.delete(`current_history_${articleId}`)
  }
}()
