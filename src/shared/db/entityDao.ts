import db from "./db.ts"
import type { Entity, Status } from "../types/index.ts"

/** 实体操作类 */
export default new class {
  /** 创建实体 */
  async createEntity(ent: Entity): Promise<Status> {
    ent.deletedTime = ent.deletedTime ?? 0
    ent.attrs?.sort((a, b) => a.sortIndex - b.sortIndex)
    try {
      const tx = db.transaction(['entities'], 'readwrite')
      await tx.objectStore('entities').add(JSON.parse(JSON.stringify(ent)))
      await tx.done
      return { success: true }
    } catch (err: any) {
      return { success: false, message: err.message }
    }
  }

  /** 更新实体 */
  async updateEntity(ent: Entity): Promise<Status> {
    try {
      const updated = { ...ent, modifiedTime: Date.now() }
      updated.attrs?.sort((a, b) => a.sortIndex - b.sortIndex)
      const tx = db.transaction(['entities'], 'readwrite')
      await tx.objectStore('entities').put(JSON.parse(JSON.stringify(updated)))
      await tx.done
      return { success: true }
    } catch (err: any) {
      return { success: false, message: err.message }
    }
  }

  /** 删除实体 */
  async deleteEntity(id: string): Promise<Status> {
    try {
      const tx = db.transaction(['entities'], 'readwrite')
      await tx.objectStore('entities').delete(id)
      await tx.done
      return { success: true }
    } catch (err: any) {
      return { success: false, message: err.message }
    }
  }

  /** 软删除实体 */
  async softDeleteEntity(id: string): Promise<Status> {
    try {
      const tx = db.transaction(['entities'], 'readwrite')
      const store = tx.objectStore('entities')
      const ent = await store.get(id)
      if (!ent) { tx.abort(); return { success: false, message: '未找到实体' } }
      ent.deletedTime = Date.now()
      ent.modifiedTime = Date.now()
      await store.put(ent)
      await tx.done
      return { success: true }
    } catch (err: any) {
      return { success: false, message: err.message }
    }
  }

  /** 恢复实体 */
  async restoreEntity(id: string): Promise<Status> {
    try {
      const tx = db.transaction(['entities'], 'readwrite')
      const store = tx.objectStore('entities')
      const ent = await store.get(id)
      if (!ent) { tx.abort(); return { success: false, message: '未找到实体' } }
      ent.deletedTime = 0
      ent.modifiedTime = Date.now()
      await store.put(ent)
      await tx.done
      return { success: true }
    } catch (err: any) {
      return { success: false, message: err.message }
    }
  }

  /** 获取指定书籍下的所有实体 */
  async getBookEntities(bookId: string, includeDeleted = false): Promise<Entity[]> {
    const store = db.transaction(['entities'], 'readonly').objectStore('entities')
    const entities = await store.index('by-book').getAll(bookId)
    return includeDeleted ? entities : entities.filter(e => e.deletedTime === 0)
  }

  /**
   * 批量更新实体映射信息
   * @param updates 更新列表，每项包含 entityId 和 mappings
   */
  async batchUpdateMappings(updates: Array<{ entityId: string; mappings: Array<{ articleId: string; count: number }> }>): Promise<Status> {
    try {
      const tx = db.transaction(['entities'], 'readwrite')
      const store = tx.objectStore('entities')

      for (const update of updates) {
        const entity = await store.get(update.entityId)
        if (entity) {
          entity.mappings = update.mappings
          entity.modifiedTime = Date.now()
          await store.put(entity)
        }
      }

      await tx.done
      return { success: true }
    } catch (err: any) {
      return { success: false, message: err.message }
    }
  }
}
