import { articledb, entitydb } from './db'
import { countEntityInContent } from './utils'
import type { Entity, EntityMapping } from './types'

/**
 * 实体映射服务
 * 负责管理和更新实体在文章中的引用映射
 */
export class EntityMappingService {
  /**
   * 更新单篇文章相关的所有实体映射
   * @param articleId 文章ID
   * @param articleContent 文章内容
   * @param bookId 书籍ID
   */
  static async updateMappingsForArticle(
    articleId: string,
    articleContent: string,
    bookId: string
  ): Promise<void> {
    try {
      // 获取该书籍下的所有实体
      const entities = await entitydb.getBookEntities(bookId)

      // 存储需要更新的实体映射
      const updates: Array<{ entityId: string; mappings: EntityMapping[] }> = []

      for (const entity of entities) {
        // 统计该实体在当前文章中的出现次数
        const count = countEntityInContent(articleContent, entity.id)

        // 获取当前实体的映射列表（如果没有则初始化为空数组）
        const currentMappings = entity.mappings || []

        // 查找该文章在映射列表中的索引
        const existingIndex = currentMappings.findIndex(m => m.articleId === articleId)

        // 创建新的映射列表
        let newMappings: EntityMapping[]

        if (count > 0) {
          // 如果出现次数大于0
          if (existingIndex >= 0) {
            // 更新现有映射
            newMappings = [...currentMappings]
            newMappings[existingIndex] = { articleId, count }
          } else {
            // 添加新映射
            newMappings = [...currentMappings, { articleId, count }]
          }
        } else {
          // 如果出现次数为0，移除该文章的映射
          if (existingIndex >= 0) {
            newMappings = currentMappings.filter(m => m.articleId !== articleId)
          } else {
            // 没有变化，跳过
            continue
          }
        }

        // 添加到更新列表
        updates.push({
          entityId: entity.id,
          mappings: newMappings
        })
      }

      // 批量更新实体映射
      if (updates.length > 0) {
        await entitydb.batchUpdateMappings(updates)
      }
    } catch (err) {
      console.error('更新实体映射失败:', err)
      throw err
    }
  }

  /**
   * 重建整本书的所有实体映射
   * @param bookId 书籍ID
   */
  static async rebuildMappingsForBook(bookId: string): Promise<void> {
    try {
      // 获取该书籍下的所有文章
      const articles = await articledb.getBookArticles(bookId)

      // 获取所有文章的内容
      const articleContents: Array<{ id: string; content: string }> = []
      for (const article of articles) {
        const body = await articledb.getArticleBody(article.id)
        articleContents.push({
          id: article.id,
          content: body?.content || ''
        })
      }

      // 获取该书籍下的所有实体
      const entities = await entitydb.getBookEntities(bookId)

      // 存储需要更新的实体映射
      const updates: Array<{ entityId: string; mappings: EntityMapping[] }> = []

      for (const entity of entities) {
        const mappings: EntityMapping[] = []

        // 统计该实体在所有文章中的出现次数
        for (const article of articleContents) {
          const count = countEntityInContent(article.content, entity.id)
          if (count > 0) {
            mappings.push({
              articleId: article.id,
              count
            })
          }
        }

        // 添加到更新列表
        updates.push({
          entityId: entity.id,
          mappings
        })
      }

      // 批量更新实体映射
      if (updates.length > 0) {
        await entitydb.batchUpdateMappings(updates)
      }
    } catch (err) {
      console.error('重建实体映射失败:', err)
      throw err
    }
  }

  /**
   * 删除文章时清理相关的实体映射
   * @param articleId 文章ID
   * @param bookId 书籍ID
   */
  static async cleanupMappingsForDeletedArticle(
    articleId: string,
    bookId: string
  ): Promise<void> {
    try {
      // 获取该书籍下的所有实体
      const entities = await entitydb.getBookEntities(bookId)

      // 存储需要更新的实体映射
      const updates: Array<{ entityId: string; mappings: EntityMapping[] }> = []

      for (const entity of entities) {
        // 如果实体有映射且包含该文章
        if (entity.mappings && entity.mappings.some(m => m.articleId === articleId)) {
          const newMappings = entity.mappings.filter(m => m.articleId !== articleId)
          updates.push({
            entityId: entity.id,
            mappings: newMappings
          })
        }
      }

      // 批量更新实体映射
      if (updates.length > 0) {
        await entitydb.batchUpdateMappings(updates)
      }
    } catch (err) {
      console.error('清理删除文章的实体映射失败:', err)
      throw err
    }
  }
}
