import { openDB, type IDBPDatabase } from 'idb'
import type { AppDB, Book, Article, ArticleBody, Entity, Status, ImageBase64, DBHistoryRecord, Draft } from './types'
import { uid } from './utils'

const DATABASE_NAME = 'musepocket_db'
const DATABASE_VERSION = 3

async function openAppDB(): Promise<IDBPDatabase<AppDB>> {
  return openDB<AppDB>(DATABASE_NAME, DATABASE_VERSION, {
    upgrade(db, oldVersion) {
      // Version 1: 初始表结构
      if (oldVersion < 1) {
        if (!db.objectStoreNames.contains('books')) {
          db.createObjectStore('books', { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains('articles')) {
          const store = db.createObjectStore('articles', { keyPath: 'id' })
          store.createIndex('by-book', 'bookId')
        }
        if (!db.objectStoreNames.contains('articleBodies')) {
          db.createObjectStore('articleBodies', { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains('entities')) {
          const store = db.createObjectStore('entities', { keyPath: 'id' })
          store.createIndex('by-book', 'bookId')
          store.createIndex('by-type', 'type')
        }
        if (!db.objectStoreNames.contains('images')) {
          db.createObjectStore('images', { keyPath: 'id' })
        }
      }

      // Version 2: 添加历史记录表
      if (oldVersion < 2) {
        if (!db.objectStoreNames.contains('histories')) {
          const store = db.createObjectStore('histories', { keyPath: 'id' })
          store.createIndex('by-article', 'articleId')
          store.createIndex('by-sequence', 'sequence')
        }
      }

      // Version 3: 添加草稿表
      if (oldVersion < 3) {
        if (!db.objectStoreNames.contains('drafts')) {
          const store = db.createObjectStore('drafts', { keyPath: 'id' })
          store.createIndex('by-book', 'bookId')
        }
      }
    },
  })
}

const db = await openAppDB()

/** 书籍操作类 */
export const bookdb = new class {
  /** 创建书籍 */
  async createBook(book: Book): Promise<Status> {
    try {
      const tx = db.transaction(['books'], 'readwrite')
      await tx.objectStore('books').add({ ...book })
      await tx.done
      return { success: true }
    } catch (err: any) {
      return { success: false, message: err.message }
    }
  }

  /** 更新书籍 */
  async updateBook(book: Book): Promise<Status> {
    try {
      const updated = { ...book }
      const tx = db.transaction(['books'], 'readwrite')
      await tx.objectStore('books').put(updated)
      await tx.done
      return { success: true }
    } catch (err: any) {
      return { success: false, message: err.message }
    }
  }

  /** 删除书籍 */
  async deleteBook(bookId: string): Promise<Status> {
    try {
      const tx = db.transaction(['books', 'articles', 'entities', 'articleBodies', 'histories'], 'readwrite')
      const bookStore = tx.objectStore('books')
      const artStore = tx.objectStore('articles')
      const entStore = tx.objectStore('entities')
      const bodyStore = tx.objectStore('articleBodies')
      const historyStore = tx.objectStore('histories')

      const book = await bookStore.get(bookId)
      if (!book) { tx.abort(); return { success: false, message: `未找到书籍 ${bookId}` } }

      await bookStore.delete(bookId)

      const articles = await artStore.index('by-book').getAll(bookId)
      for (const a of articles) {
        await artStore.delete(a.id)
        await bodyStore.delete(a.id) // 删除文章内容

        // 删除文章的历史记录
        const histories = await historyStore.index('by-article').getAll(a.id)
        for (const h of histories) {
          await historyStore.delete(h.id)
        }
      }

      const entities = await entStore.index('by-book').getAll(bookId)
      for (const e of entities) await entStore.delete(e.id)

      await tx.done
      return { success: true }
    } catch (err: any) {
      return { success: false, message: err.message }
    }
  }

  /** 逻辑删除书籍 */
  async softDeleteBook(bookId: string): Promise<Status> {
    try {
      const tx = db.transaction(['books', 'articles', 'entities'], 'readwrite')
      const booksStore = tx.objectStore('books')
      const articlesStore = tx.objectStore('articles')
      const entitiesStore = tx.objectStore('entities')

      const book = await booksStore.get(bookId)
      if (!book) { tx.abort(); return { success: false, message: `未找到书籍 ${bookId}` } }

      if (!book.deletedTime) book.deletedTime = 0
      if (book.deletedTime === 0) {
        book.deletedTime = Date.now()
        book.modifiedTime = Date.now()
        await booksStore.put(book)
      }

      const articles = await articlesStore.index('by-book').getAll(bookId)
      for (const art of articles) {
        if (!art.deletedTime) art.deletedTime = 0
        if (art.deletedTime === 0) {
          art.deletedTime = Date.now()
          art.modifiedTime = Date.now()
          await articlesStore.put(art)
        }
      }

      const entities = await entitiesStore.index('by-book').getAll(bookId)
      for (const ent of entities) {
        if (!ent.deletedTime) ent.deletedTime = 0
        if (ent.deletedTime === 0) {
          ent.deletedTime = Date.now()
          ent.modifiedTime = Date.now()
          await entitiesStore.put(ent)
        }
      }

      await tx.done
      return { success: true }
    } catch (err: any) {
      return { success: false, message: err.message }
    }
  }

  /**
   * 深度恢复书籍：
   * 恢复书籍本身、其下所有文章元数据、文章正文、以及所有实体
   * @param bookId 书籍ID
   */
  async restoreBookDeep(bookId: string): Promise<Status> {
    try {
      // 事务同时操作 4 张表（books、articles、entities、articleBodies）
      const tx = db.transaction(['books', 'articles', 'entities', 'articleBodies'], 'readwrite')

      const booksStore = tx.objectStore('books')
      const articlesStore = tx.objectStore('articles')
      const bodiesStore = tx.objectStore('articleBodies')
      const entitiesStore = tx.objectStore('entities')

      // 恢复书籍
      const book = await booksStore.get(bookId)
      if (!book) { tx.abort(); return { success: false, message: `未找到书籍 ${bookId}` } }

      book.deletedTime = 0
      book.modifiedTime = Date.now()
      await booksStore.put(book)

      // 恢复文章元数据 + 正文
      const articles = await articlesStore.index('by-book').getAll(bookId)
      for (const art of articles) {

        // 恢复文章元数据
        if (art.deletedTime !== 0) {
          art.deletedTime = 0
          art.modifiedTime = Date.now()
          await articlesStore.put(art)
        }

        // 恢复正文（正文没有 deletedTime，但可能没创建）
        const body = await bodiesStore.get(art.id)
        if (!body) {
          // 若正文缺失，补一条空正文
          await bodiesStore.put({ id: art.id, content: '', createdTime: Date.now(), modifiedTime: Date.now(), deletedTime: 0 })
        }
      }

      // 恢复实体
      const entities = await entitiesStore.index('by-book').getAll(bookId)
      for (const ent of entities) {
        if (ent.deletedTime !== 0) {
          ent.deletedTime = 0
          ent.modifiedTime = Date.now()
          await entitiesStore.put(ent)
        }
      }

      await tx.done
      return { success: true }
    } catch (err: any) {
      return { success: false, message: err.message }
    }
  }

  /** 获取所有书籍 */
  async getAllBooks(includeDeleted = false): Promise<Book[]> {
    const store = db.transaction(['books'], 'readonly').objectStore('books')
    const books = await store.getAll()
    return includeDeleted ? books : books.filter(b => b.deletedTime === 0)
  }
}()


/** 文章数据库操作类 */
export const articledb = new class {

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

  /** 删除文章 + 正文 + 历史记录 */
  async deleteArticle(id: string): Promise<Status> {
    try {
      const tx = db.transaction(['articles', 'articleBodies', 'histories'], 'readwrite')
      await tx.objectStore('articles').delete(id)
      await tx.objectStore('articleBodies').delete(id)

      // 删除所有历史记录
      const historyStore = tx.objectStore('histories')
      const histories = await historyStore.index('by-article').getAll(id)
      for (const h of histories) {
        await historyStore.delete(h.id)
      }

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


/** 实体操作类 */
export const entitydb = new class {
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
}()

/** 图片操作类 */
export const imagedb = new class {
  /** 创建图片 */
  async createImage(img: Blob): Promise<Status & { id?: string }> {
    try {
      const imageId = uid()
      const tx = db.transaction(['images'], 'readwrite')
      await tx.objectStore('images').add({ id: imageId, base64: img })
      await tx.done
      return { success: true, id: imageId }
    } catch (err: any) {
      return { success: false, message: err.message }
    }
  }
  /** 获取所有图片 */
  async getAllImages(): Promise<ImageBase64[]> {
    const store = db.transaction(['images'], 'readonly').objectStore('images')
    return store.getAll()
  }

  /** 删除图片 */
  async deleteImage(id: string): Promise<Status> {
    try {
      const tx = db.transaction(['images'], 'readwrite')
      await tx.objectStore('images').delete(id)
      await tx.done
      return { success: true }
    } catch (err: any) {
      return { success: false, message: err.message }
    }
  }
}()

/** 历史记录操作类 */
export const historydb = new class {
  /**
   * 创建历史记录
   */
  async createHistory(record: DBHistoryRecord): Promise<Status> {
    try {
      const tx = db.transaction(['histories'], 'readwrite')
      await tx.objectStore('histories').add({ ...record })
      await tx.done
      return { success: true }
    } catch (err: any) {
      return { success: false, message: err.message }
    }
  }

  /**
   * 批量创建历史记录
   */
  async createHistories(records: DBHistoryRecord[]): Promise<Status> {
    try {
      const tx = db.transaction(['histories'], 'readwrite')
      const store = tx.objectStore('histories')
      for (const record of records) {
        await store.add({ ...record })
      }
      await tx.done
      return { success: true }
    } catch (err: any) {
      return { success: false, message: err.message }
    }
  }

  /**
   * 获取文章的所有历史记录（按序号排序）
   */
  async getArticleHistories(articleId: string): Promise<DBHistoryRecord[]> {
    try {
      const store = db.transaction(['histories'], 'readonly').objectStore('histories')
      const records = await store.index('by-article').getAll(articleId)
      // 按序号排序
      return records.sort((a, b) => a.sequence - b.sequence)
    } catch (err: any) {
      console.error('获取历史记录失败:', err)
      return []
    }
  }

  /**
   * 获取文章的最新N条历史记录
   */
  async getLatestHistories(articleId: string, limit: number): Promise<DBHistoryRecord[]> {
    try {
      const records = await this.getArticleHistories(articleId)
      return records.slice(-limit)
    } catch (err: any) {
      console.error('获取最新历史记录失败:', err)
      return []
    }
  }

  /**
   * 删除文章的所有历史记录
   */
  async deleteArticleHistories(articleId: string): Promise<Status> {
    try {
      const tx = db.transaction(['histories'], 'readwrite')
      const store = tx.objectStore('histories')
      const records = await store.index('by-article').getAll(articleId)
      for (const record of records) {
        await store.delete(record.id)
      }
      await tx.done
      return { success: true }
    } catch (err: any) {
      return { success: false, message: err.message }
    }
  }

  /**
   * 删除单条历史记录
   */
  async deleteHistory(id: string): Promise<Status> {
    try {
      const tx = db.transaction(['histories'], 'readwrite')
      await tx.objectStore('histories').delete(id)
      await tx.done
      return { success: true }
    } catch (err: any) {
      return { success: false, message: err.message }
    }
  }

  /**
   * 清理文章的旧历史记录，只保留最新的N条
   */
  async cleanOldHistories(articleId: string, keepCount: number): Promise<Status> {
    try {
      const records = await this.getArticleHistories(articleId)
      if (records.length <= keepCount) {
        return { success: true }
      }

      const tx = db.transaction(['histories'], 'readwrite')
      const store = tx.objectStore('histories')
      const toDelete = records.slice(0, records.length - keepCount)

      for (const record of toDelete) {
        await store.delete(record.id)
      }

      await tx.done
      return { success: true }
    } catch (err: any) {
      return { success: false, message: err.message }
    }
  }

  /**
   * 获取历史记录统计信息
   */
  async getHistoryStats(articleId: string): Promise<{ count: number; oldestTime: number; newestTime: number }> {
    try {
      const records = await this.getArticleHistories(articleId)
      if (records.length === 0) {
        return { count: 0, oldestTime: 0, newestTime: 0 }
      }
      return {
        count: records.length,
        oldestTime: records[0].createdTime,
        newestTime: records[records.length - 1].createdTime
      }
    } catch (err: any) {
      console.error('获取历史记录统计失败:', err)
      return { count: 0, oldestTime: 0, newestTime: 0 }
    }
  }
}()

/** 草稿操作类 */
export const draftdb = new class {
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
