import db from "./db.ts"
import type { Draft, Status } from "../types/index.ts"

/** 草稿操作类 */
export default new class {
  /**
   * 创建草稿
   */
  async createDraft(draft: Draft): Promise<Status> {
    try {
      const tx = db.transaction(['drafts'], 'readwrite')
      await tx.objectStore('drafts').add({ ...draft })
      await tx.done
      return { success: true }
    } catch (err: any) {
      return { success: false, message: err.message }
    }
  }

  /**
   * 更新草稿
   */
  async updateDraft(draft: Draft): Promise<Status> {
    try {
      const tx = db.transaction(['drafts'], 'readwrite')
      await tx.objectStore('drafts').put({ ...draft, modifiedTime: Date.now() })
      await tx.done
      return { success: true }
    } catch (err: any) {
      return { success: false, message: err.message }
    }
  }

  /**
   * 删除草稿
   */
  async deleteDraft(id: string): Promise<Status> {
    try {
      const tx = db.transaction(['drafts'], 'readwrite')
      await tx.objectStore('drafts').delete(id)
      await tx.done
      return { success: true }
    } catch (err: any) {
      return { success: false, message: err.message }
    }
  }

  /**
   * 获取书籍的所有草稿
   */
  async getBookDrafts(bookId: string): Promise<Draft[]> {
    try {
      const store = db.transaction(['drafts'], 'readonly').objectStore('drafts')
      const drafts = await store.index('by-book').getAll(bookId)
      // 按修改时间排序，最新的在前
      return drafts.sort((a, b) => b.modifiedTime - a.modifiedTime)
    } catch (err: any) {
      console.error('获取草稿失败:', err)
      return []
    }
  }

  /**
   * 删除书籍的所有草稿
   */
  async deleteBookDrafts(bookId: string): Promise<Status> {
    try {
      const tx = db.transaction(['drafts'], 'readwrite')
      const store = tx.objectStore('drafts')
      const drafts = await store.index('by-book').getAll(bookId)
      for (const draft of drafts) {
        await store.delete(draft.id)
      }
      await tx.done
      return { success: true }
    } catch (err: any) {
      return { success: false, message: err.message }
    }
  }
}()
