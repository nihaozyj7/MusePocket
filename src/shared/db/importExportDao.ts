import db from "./db.ts"
import type { Article, ArticleBody, ArticleExportData, Book, BookExportData, ConfigExportData, Entity, FullDatabaseExportData, Status } from "../types/index.ts"
import { uid } from "../utils/index.ts"

/** 导入导出操作类 */
export default new class {
  /**
   * 导出配置数据（从 localStorage 读取）
   */
  exportConfigs(): ConfigExportData {
    try {
      // 从 localStorage 读取 Pinia 存储的数据
      const modelsData = localStorage.getItem('modelsStore')
      const promptsData = localStorage.getItem('promptsStore')
      const textSnippetsData = localStorage.getItem('textSnippetsStore')

      return {
        models: modelsData ? JSON.parse(modelsData).v : [],
        prompts: promptsData ? JSON.parse(promptsData).v : [],
        textSnippets: textSnippetsData ? JSON.parse(textSnippetsData).v : [],
        exportTime: Date.now()
      }
    } catch (err: any) {
      console.error('导出配置失败:', err)
      return {
        models: [],
        prompts: [],
        textSnippets: [],
        exportTime: Date.now()
      }
    }
  }

  /**
   * 导入配置数据（写入 localStorage）
   */
  importConfigs(data: ConfigExportData, options: { merge?: boolean } = {}): Status {
    try {
      const { merge = false } = options

      // 处理 AI 模型配置
      if (data.models && data.models.length > 0) {
        const modelsData = localStorage.getItem('modelsStore')
        let models = modelsData ? JSON.parse(modelsData).v : []

        if (merge) {
          // 合并模式：去重后添加
          const existingKeys = new Set(models.map((m: any) => `${m.model}_${m.baseUrl}`))
          const newModels = data.models.filter((m: any) => !existingKeys.has(`${m.model}_${m.baseUrl}`))
          models = [...models, ...newModels]
        } else {
          // 覆盖模式
          models = data.models
        }

        localStorage.setItem('modelsStore', JSON.stringify({ v: models }))
      }

      // 处理提示词
      if (data.prompts && data.prompts.length > 0) {
        const promptsData = localStorage.getItem('promptsStore')
        let prompts = promptsData ? JSON.parse(promptsData).v : []

        if (merge) {
          // 合并模式：按 ID 去重
          const existingIds = new Set(prompts.map((p: any) => p.id))
          const newPrompts = data.prompts.filter((p: any) => !existingIds.has(p.id))
          prompts = [...prompts, ...newPrompts]
        } else {
          // 覆盖模式
          prompts = data.prompts
        }

        localStorage.setItem('promptsStore', JSON.stringify({ v: prompts }))
      }

      // 处理文本预设
      if (data.textSnippets && data.textSnippets.length > 0) {
        const textSnippetsData = localStorage.getItem('textSnippetsStore')
        let textSnippets = textSnippetsData ? JSON.parse(textSnippetsData).v : []

        if (merge) {
          // 合并模式：按 ID 去重
          const existingIds = new Set(textSnippets.map((t: any) => t.id))
          const newSnippets = data.textSnippets.filter((t: any) => !existingIds.has(t.id))
          textSnippets = [...textSnippets, ...newSnippets]
        } else {
          // 覆盖模式
          textSnippets = data.textSnippets
        }

        localStorage.setItem('textSnippetsStore', JSON.stringify({ v: textSnippets }))
      }

      return { success: true }
    } catch (err: any) {
      return { success: false, message: err.message }
    }
  }

  /**
   * 导出单本书籍（包含文章、文章内容、实体）
   */
  async exportBook(bookId: string): Promise<BookExportData | null> {
    try {
      const tx = db.transaction(['books', 'articles', 'articleBodies', 'entities'], 'readonly')
      const booksStore = tx.objectStore('books')
      const articlesStore = tx.objectStore('articles')
      const bodiesStore = tx.objectStore('articleBodies')
      const entitiesStore = tx.objectStore('entities')

      // 获取书籍
      const book = await booksStore.get(bookId)
      if (!book) return null

      // 获取文章元数据
      const articles = await articlesStore.index('by-book').getAll(bookId)

      // 获取文章内容
      const articleBodies: ArticleBody[] = []
      for (const article of articles) {
        const body = await bodiesStore.get(article.id)
        if (body) articleBodies.push(body)
      }

      // 获取实体
      const entities = await entitiesStore.index('by-book').getAll(bookId)

      return {
        book,
        articles,
        articleBodies,
        entities
      }
    } catch (err: any) {
      console.error('导出书籍失败:', err)
      return null
    }
  }

  /**
   * 导出多本书籍
   */
  async exportBooks(bookIds: string[]): Promise<BookExportData[]> {
    const results: BookExportData[] = []
    for (const bookId of bookIds) {
      const data = await this.exportBook(bookId)
      if (data) results.push(data)
    }
    return results
  }

  /**
   * 导入单本书籍
   */
  async importBook(data: BookExportData, options: { generateNewIds?: boolean } = {}): Promise<Status> {
    try {
      const tx = db.transaction(['books', 'articles', 'articleBodies', 'entities'], 'readwrite')
      const booksStore = tx.objectStore('books')
      const articlesStore = tx.objectStore('articles')
      const bodiesStore = tx.objectStore('articleBodies')
      const entitiesStore = tx.objectStore('entities')

      const now = Date.now()
      const { generateNewIds = true } = options

      // 导入书籍
      const newBookId = generateNewIds ? uid() : data.book.id
      const book: Book = {
        ...data.book,
        id: newBookId,
        createdTime: now,
        modifiedTime: now,
        deletedTime: 0
      }
      await booksStore.put(book)

      // 创建文章ID映射（旧ID -> 新ID）
      const articleIdMap = new Map<string, string>()

      // 导入文章
      for (const articleData of data.articles) {
        const newArticleId = generateNewIds ? uid() : articleData.id
        articleIdMap.set(articleData.id, newArticleId)

        const article: Article = {
          ...articleData,
          id: newArticleId,
          bookId: newBookId,
          createdTime: now,
          modifiedTime: now,
          deletedTime: 0
        }
        await articlesStore.put(article)
      }

      // 导入文章内容
      for (const bodyData of data.articleBodies) {
        const newArticleId = articleIdMap.get(bodyData.id) || bodyData.id
        const body: ArticleBody = {
          ...bodyData,
          id: newArticleId,
          createdTime: now,
          modifiedTime: now,
          deletedTime: 0
        }
        await bodiesStore.put(body)
      }

      // 导入实体
      for (const entityData of data.entities) {
        const newEntityId = generateNewIds ? uid() : entityData.id
        const entity: Entity = {
          ...entityData,
          id: newEntityId,
          bookId: newBookId,
          createdTime: now,
          modifiedTime: now,
          deletedTime: 0
        }
        await entitiesStore.put(entity)
      }

      await tx.done
      return { success: true }
    } catch (err: any) {
      return { success: false, message: err.message }
    }
  }

  /**
   * 导入多本书籍
   */
  async importBooks(dataList: BookExportData[], options: { generateNewIds?: boolean } = {}): Promise<Status> {
    let successCount = 0
    const errors: string[] = []

    for (const data of dataList) {
      const result = await this.importBook(data, options)
      if (result.success) {
        successCount++
      } else {
        errors.push(result.message || '未知错误')
      }
    }

    if (successCount === dataList.length) {
      return { success: true }
    } else if (successCount > 0) {
      return { success: true, message: `成功导入 ${successCount}/${dataList.length} 本书籍，${errors.length} 个失败` }
    } else {
      return { success: false, message: `导入失败: ${errors.join(', ')}` }
    }
  }

  /**
   * 导出单篇文章（包含文章内容）
   */
  async exportArticle(articleId: string): Promise<ArticleExportData | null> {
    try {
      const tx = db.transaction(['articles', 'articleBodies'], 'readonly')
      const articlesStore = tx.objectStore('articles')
      const bodiesStore = tx.objectStore('articleBodies')

      const article = await articlesStore.get(articleId)
      if (!article) return null

      const body = await bodiesStore.get(articleId)
      if (!body) return null

      return { article, body }
    } catch (err: any) {
      console.error('导出文章失败:', err)
      return null
    }
  }

  /**
   * 导出多篇文章
   */
  async exportArticles(articleIds: string[]): Promise<ArticleExportData[]> {
    const results: ArticleExportData[] = []
    for (const articleId of articleIds) {
      const data = await this.exportArticle(articleId)
      if (data) results.push(data)
    }
    return results
  }

  /**
   * 导入单篇文章到指定书籍
   */
  async importArticle(bookId: string, data: ArticleExportData, options: { generateNewIds?: boolean } = {}): Promise<Status> {
    try {
      const tx = db.transaction(['articles', 'articleBodies'], 'readwrite')
      const articlesStore = tx.objectStore('articles')
      const bodiesStore = tx.objectStore('articleBodies')

      const now = Date.now()
      const { generateNewIds = true } = options

      const newArticleId = generateNewIds ? uid() : data.article.id

      // 导入文章元数据
      const article: Article = {
        ...data.article,
        id: newArticleId,
        bookId,
        createdTime: now,
        modifiedTime: now,
        deletedTime: 0
      }
      await articlesStore.put(article)

      // 导入文章内容
      const body: ArticleBody = {
        ...data.body,
        id: newArticleId,
        createdTime: now,
        modifiedTime: now,
        deletedTime: 0
      }
      await bodiesStore.put(body)

      await tx.done
      return { success: true }
    } catch (err: any) {
      return { success: false, message: err.message }
    }
  }

  /**
   * 导入多篇文章到指定书籍
   */
  async importArticles(bookId: string, dataList: ArticleExportData[], options: { generateNewIds?: boolean } = {}): Promise<Status> {
    let successCount = 0
    const errors: string[] = []

    for (const data of dataList) {
      const result = await this.importArticle(bookId, data, options)
      if (result.success) {
        successCount++
      } else {
        errors.push(result.message || '未知错误')
      }
    }

    if (successCount === dataList.length) {
      return { success: true }
    } else if (successCount > 0) {
      return { success: true, message: `成功导入 ${successCount}/${dataList.length} 篇文章，${errors.length} 个失败` }
    } else {
      return { success: false, message: `导入失败: ${errors.join(', ')}` }
    }
  }

  /**
   * 导出整个数据库（所有书籍、文章、实体）
   */
  async exportFullDatabase(includeConfigs: boolean = true): Promise<FullDatabaseExportData | null> {
    try {
      const tx = db.transaction(['books', 'articles', 'articleBodies', 'entities'], 'readonly')
      const booksStore = tx.objectStore('books')
      const articlesStore = tx.objectStore('articles')
      const bodiesStore = tx.objectStore('articleBodies')
      const entitiesStore = tx.objectStore('entities')

      const books = await booksStore.getAll()
      const articles = await articlesStore.getAll()
      const articleBodies = await bodiesStore.getAll()
      const entities = await entitiesStore.getAll()

      const result: FullDatabaseExportData = {
        books,
        articles,
        articleBodies,
        entities,
        exportTime: Date.now(),
        version: '1.0'
      }

      // 如果需要导出配置
      if (includeConfigs) {
        result.configs = this.exportConfigs()
      }

      return result
    } catch (err: any) {
      console.error('导出全库失败:', err)
      return null
    }
  }

  /**
   * 导入整个数据库（会覆盖现有数据）
   */
  async importFullDatabase(data: FullDatabaseExportData, options: { merge?: boolean, includeConfigs?: boolean } = {}): Promise<Status> {
    try {
      const { merge = false, includeConfigs = true } = options

      const tx = db.transaction(['books', 'articles', 'articleBodies', 'entities'], 'readwrite')
      const booksStore = tx.objectStore('books')
      const articlesStore = tx.objectStore('articles')
      const bodiesStore = tx.objectStore('articleBodies')
      const entitiesStore = tx.objectStore('entities')

      // 如果不是合并模式，先清空所有表
      if (!merge) {
        await booksStore.clear()
        await articlesStore.clear()
        await bodiesStore.clear()
        await entitiesStore.clear()
      }

      const now = Date.now()

      // 导入书籍
      for (const book of data.books) {
        const newBook = { ...book, modifiedTime: now }
        await booksStore.put(newBook)
      }

      // 导入文章
      for (const article of data.articles) {
        const newArticle = { ...article, modifiedTime: now }
        await articlesStore.put(newArticle)
      }

      // 导入文章内容
      for (const body of data.articleBodies) {
        const newBody = { ...body, modifiedTime: now }
        await bodiesStore.put(newBody)
      }

      // 导入实体
      for (const entity of data.entities) {
        const newEntity = { ...entity, modifiedTime: now }
        await entitiesStore.put(newEntity)
      }

      await tx.done

      // 导入配置数据
      if (includeConfigs && data.configs) {
        const configResult = this.importConfigs(data.configs, { merge })
        if (!configResult.success) {
          console.error('导入配置失败:', configResult.message)
        }
      }

      return { success: true }
    } catch (err: any) {
      return { success: false, message: err.message }
    }
  }
}()
