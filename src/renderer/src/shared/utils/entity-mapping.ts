import { articledb, entitydb } from '@shared/db'
import { countEntityInContent } from '@shared/utils'
import type { Entity, EntityMapping } from '@shared/types'

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

  /**
   * 同步文章内容中的实体标题
   * 根据实体ID从数据库中获取最新的实体标题并更新到文章内容中
   * @param content 文章HTML内容
   * @param bookId 书籍ID
   * @returns 更新后的内容
   */
  static async syncEntityTitlesInContent(
    content: string,
    bookId: string
  ): Promise<string> {
    try {
      if (!content) return content

      // 创建临时DOM来解析HTML
      const tempDiv = document.createElement('div')
      tempDiv.innerHTML = content

      // 查找所有实体span
      const entitySpans = tempDiv.querySelectorAll('span[data-entity-id]')
      if (entitySpans.length === 0) return content

      // 获取该书籍下的所有实体
      const entities = await entitydb.getBookEntities(bookId)

      // 创建实体ID到标题的映射
      const entityMap = new Map<string, string>()
      entities.forEach(entity => {
        entityMap.set(entity.id, entity.title)
      })

      // 更新每个实体span的文本
      entitySpans.forEach(span => {
        const entityId = span.getAttribute('data-entity-id')
        if (entityId && entityMap.has(entityId)) {
          const latestTitle = entityMap.get(entityId)!
          // 只有当标题不同时才更新
          if (span.textContent !== latestTitle) {
            span.textContent = latestTitle
          }
        }
      })

      return tempDiv.innerHTML
    } catch (err) {
      console.error('同步实体标题失败:', err)
      // 发生错误时返回原内容，不影响文章加载
      return content
    }
  }
}
