import { openDB, type IDBPDatabase } from 'idb'
import type { AppDB, Book, Article, ArticleBody, Entity, Status } from './types'

const DATABASE_NAME = 'musepocket_db'
const DATABASE_VERSION = 1

async function openAppDB(): Promise<IDBPDatabase<AppDB>> {
  return openDB<AppDB>(DATABASE_NAME, DATABASE_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('books')) {
        const store = db.createObjectStore('books', { keyPath: 'id' })
        store.createIndex('by-author', 'author')
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
}()


/** 实体操作类 */
export const entitydb = new class {
  /** 创建实体 */
  async createEntity(ent: Entity): Promise<Status> {
    ent.deletedTime = ent.deletedTime ?? 0
    try {
      const tx = db.transaction(['entities'], 'readwrite')
      await tx.objectStore('entities').add({ ...ent })
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
      const tx = db.transaction(['entities'], 'readwrite')
      await tx.objectStore('entities').put(updated)
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
