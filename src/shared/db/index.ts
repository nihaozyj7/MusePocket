import { openDB, type IDBPDatabase } from 'idb'
import type { AppDB, Book, Article, ArticleBody, Entity, Status, ImageBase64, Draft, BookExportData, ArticleExportData, FullDatabaseExportData, ConfigExportData, ArticleHistoryRecord } from '@shared/types'
import { uid } from '@shared/utils'

const DATABASE_NAME = 'musepocket_db'
const DATABASE_VERSION = 5

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

      // Version 2: 添加历史记录表（已废弃，功能已移除）
      // if (oldVersion < 2) {
      //   if (!db.objectStoreNames.contains('histories')) {
      //     const store = db.createObjectStore('histories', { keyPath: 'id' })
      //     store.createIndex('by-article', 'articleId')
      //     store.createIndex('by-sequence', 'sequence')
      //   }
      // }

      // Version 3: 添加草稿表
      if (oldVersion < 3) {
        if (!db.objectStoreNames.contains('drafts')) {
          const store = db.createObjectStore('drafts', { keyPath: 'id' })
          store.createIndex('by-book', 'bookId')
        }
      }

      // Version 4: 添加历史记录表
      if (oldVersion < 4) {
        if (!db.objectStoreNames.contains('articleHistories')) {
          const store = db.createObjectStore('articleHistories', { keyPath: 'id' })
          store.createIndex('by-article', 'articleId')
        }
      }

      // Version 5: 添加 KV 存储表（用于存储当前历史版本等键值对）
      if (oldVersion < 5) {
        if (!db.objectStoreNames.contains('kvStore')) {
          db.createObjectStore('kvStore', { keyPath: 'key' })
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
      const tx = db.transaction(['books', 'articles', 'entities', 'articleBodies'], 'readwrite')
      const bookStore = tx.objectStore('books')
      const artStore = tx.objectStore('articles')
      const entStore = tx.objectStore('entities')
      const bodyStore = tx.objectStore('articleBodies')

      const book = await bookStore.get(bookId)
      if (!book) { tx.abort(); return { success: false, message: `未找到书籍 ${bookId}` } }

      await bookStore.delete(bookId)

      const articles = await artStore.index('by-book').getAll(bookId)
      for (const a of articles) {
        await artStore.delete(a.id)
        await bodyStore.delete(a.id) // 删除文章内容
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

// 历史记录操作类
export const historydb = new class {
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

/** KV 存储操作类（用于存储当前历史版本等键值对） */
export const kvdb = new class {
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

/** 导入导出操作类 */
export const importExportdb = new class {
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
