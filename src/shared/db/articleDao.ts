import db from "./db.ts"
import type { Article, ArticleBody, Status } from "../types/index.ts"

/** 文章数据库操作类 */
export default new class {

  /** 创建文章 + 空正文 */
  async createArticle(article: Article): Promise<Status> {
    article.deletedTime = article.deletedTime ?? 0

    try {
      const tx = db.transaction(['articles', 'articleBodies'], 'readwrite')

      // 写入文章元数据
      await tx.objectStore('articles').add({ ...article })

      // 创建空正文（初始化正文的时间字段）
      const now = Date.now()
      const emptyBody: ArticleBody = {
        id: article.id,
        content: '',
        createdTime: now,
        modifiedTime: now,
        deletedTime: 0,
      }
      await tx.objectStore('articleBodies').add(emptyBody)

      await tx.done
      return { success: true }
    } catch (err: any) {
      return { success: false, message: err.message }
    }
  }

  /**
   * 更新文章，可选同时更新正文
   */
  async updateArticle(article: Article, body?: ArticleBody): Promise<Status> {
    try {
      const stores = body
        ? ['articles', 'articleBodies'] as const
        : ['articles'] as const

      const tx = db.transaction(stores, 'readwrite')
      const articlesStore = tx.objectStore('articles')

      // 更新文章元数据
      const updated: Article = { ...article, modifiedTime: Date.now() }
      await articlesStore.put(updated)

      // 更新正文（upsert）
      if (body) {
        const bodyStore = tx.objectStore('articleBodies')
        await bodyStore.put({
          ...body,
          id: article.id,
          modifiedTime: Date.now(),
        })
      }

      await tx.done
      return { success: true }
    } catch (err: any) {
      return { success: false, message: err.message }
    }
  }

  /** 删除文章 + 正文 */
  async deleteArticle(id: string): Promise<Status> {
    try {
      const tx = db.transaction(['articles', 'articleBodies'], 'readwrite')
      await tx.objectStore('articles').delete(id)
      await tx.objectStore('articleBodies').delete(id)

      await tx.done
      return { success: true }
    } catch (err: any) {
      return { success: false, message: err.message }
    }
  }

  /**
   * 软删除文章 + 正文
   * 文章和正文强关联，需要一起设置 deletedTime
   */
  async softDelete(id: string): Promise<Status> {
    try {
      const tx = db.transaction(['articles', 'articleBodies'], 'readwrite')

      const artStore = tx.objectStore('articles')
      const bodyStore = tx.objectStore('articleBodies')

      const article = await artStore.get(id)
      const body = await bodyStore.get(id)

      if (!article || !body) {
        tx.abort()
        return { success: false, message: '未找到文章或正文' }
      }

      const now = Date.now()

      // 更新文章状态
      article.deletedTime = now
      article.modifiedTime = now
      await artStore.put(article)

      // 更新正文状态
      body.deletedTime = now
      body.modifiedTime = now
      await bodyStore.put(body)

      await tx.done
      return { success: true }
    } catch (err: any) {
      return { success: false, message: err.message }
    }
  }

  /**
   * 恢复文章 + 正文
   * 恢复时一并恢复 deletedTime
   */
  async restore(id: string): Promise<Status> {
    try {
      const tx = db.transaction(['articles', 'articleBodies'], 'readwrite')

      const artStore = tx.objectStore('articles')
      const bodyStore = tx.objectStore('articleBodies')

      const article = await artStore.get(id)
      const body = await bodyStore.get(id)

      if (!article || !body) {
        tx.abort()
        return { success: false, message: '未找到文章或正文' }
      }

      const now = Date.now()

      // 恢复文章
      article.deletedTime = 0
      article.modifiedTime = now
      await artStore.put(article)

      // 恢复正文
      body.deletedTime = 0
      body.modifiedTime = now
      await bodyStore.put(body)

      await tx.done
      return { success: true }
    } catch (err: any) {
      return { success: false, message: err.message }
    }
  }

  /** 获取文章正文 */
  async getArticleBody(id: string): Promise<ArticleBody | undefined> {
    const store = db.transaction(['articleBodies'], 'readonly').objectStore('articleBodies')
    return store.get(id)
  }

  /** 更新正文 */
  async updateArticleBody(body: ArticleBody): Promise<Status> {
    try {
      const tx = db.transaction(['articleBodies'], 'readwrite')
      await tx.objectStore('articleBodies').put({ ...body, modifiedTime: Date.now() })
      await tx.done
      return { success: true }
    } catch (err: any) {
      return { success: false, message: err.message }
    }
  }

  /** 根据书籍ID获取文章列表，可选包含已软删除 */
  async getBookArticles(bookId: string, includeDeleted = false): Promise<Article[]> {
    const store = db.transaction(['articles'], 'readonly').objectStore('articles')
    const articles = await store.index('by-book').getAll(bookId)
    return includeDeleted ? articles : articles.filter(a => a.deletedTime === 0)
  }

  /** 根据ID获取单篇文章 */
  async getArticle(id: string): Promise<Article | undefined> {
    const store = db.transaction(['articles'], 'readonly').objectStore('articles')
    return store.get(id)
  }

  /** 批量更新文章排序 */
  async batchUpdateSortOrder(updates: { id: string; sortOrder: number }[]): Promise<Status> {
    try {
      const tx = db.transaction(['articles'], 'readwrite')
      const store = tx.objectStore('articles')

      for (const update of updates) {
        const article = await store.get(update.id)
        if (article) {
          article.sortOrder = update.sortOrder
          article.modifiedTime = Date.now()
          await store.put(article)
        }
      }

      await tx.done
      return { success: true }
    } catch (err: any) {
      return { success: false, message: err.message }
    }
  }
}()
