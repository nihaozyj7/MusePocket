import { entitydb } from '@/db'
import { remove } from 'lodash-es'
import { defineStore } from 'pinia'

/**
 * EntityTypesStore 是用于管理实体类型及其出现次数的状态仓库。
 * 支持添加实体类型、初始化数据、获取数组形式的数据。
 */
export const useEntityTypesStore = defineStore('entityTypesStore', {
  state: () => ({
    _v: new Map<string, number>()
  }),

  getters: {
    /**
     * 将 Map 转换为数组，格式为 [实体类型, 出现次数]
     * @returns Array<[string, number]>
     */
    array(state) {
      return Array.from(state._v.entries()).sort((a, b) => b[1] - a[1])
    }
  },

  actions: {
    /**
     * 增加某个实体类型的计数
     * 如果已存在，则计数 +1；否则新增并设为 1
     * @param entityType 实体类型名称
     */
    add(entityType: string) {
      const currentCount = this._v.get(entityType) || 0
      this._v.set(entityType, currentCount + 1)
    },

    /**
     * 删除某个实体类型的计数，如果计数 <= 0，则删除该实体类型
     */
    remove(entityType: string) {
      if (!this._v.has(entityType)) return
      this._v[entityType] -= 1
      if (this._v[entityType] <= 0) {
        this._v.delete(entityType)
      }
    },

    /**
     * 根据书籍 ID 初始化实体类型数据
     * 从数据库加载实体列表，并重置当前状态
     * @param bookId 书籍唯一标识
     */
    async init(bookId: string) {
      try {
        const entitys = await entitydb.getBookEntities(bookId)
        // 清空当前数据
        this._v.clear()

        // 重新填充 Map
        for (const entity of entitys) {
          this.add(entity.type)
        }
      } catch (error) {
        console.error('Failed to initialize entity types:', error)
      }
    }
  }
})
