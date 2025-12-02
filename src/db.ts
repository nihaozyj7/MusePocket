import { openDB, type IDBPDatabase } from 'idb'
import type { AppDB, Book, Article, Entity, Status } from './types'

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
      if (!db.objectStoreNames.contains('entities')) {
        const store = db.createObjectStore('entities', { keyPath: 'id' })
        store.createIndex('by-book', 'bookId')
        store.createIndex('by-type', 'type')
      }
    },
  })
}

const db = await openAppDB()

export const bookdb = new class {
  /** 创建书籍 */
  async createBook(book: Book): Promise<Status> {
    try {
      const tx = db.transaction(['books'], 'readwrite')
      await tx.objectStore('books').add(book)
      await tx.done
      return { success: true }
    } catch (err: any) {
      return { success: false, message: err.message }
    }
  }

  /** 更新书籍 */
  async updateBook(book: Book): Promise<Status> {
    try {
      const updated = { ...book, modifiedTime: Date.now() }
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
      const tx = db.transaction(['books', 'articles', 'entities'], 'readwrite')
      const bookStore = tx.objectStore('books')
      const artStore = tx.objectStore('articles')
      const entStore = tx.objectStore('entities')

      const book = await bookStore.get(bookId)
      if (!book) {
        tx.abort()
        return { success: false, message: `未找到书籍 ${bookId}` }
      }

      await bookStore.delete(bookId)

      const articles = await artStore.index('by-book').getAll(bookId)
      for (const a of articles) await artStore.delete(a.id)

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
      if (!book) {
        tx.abort()
        return { success: false, message: `未找到书籍 ${bookId}` }
      }

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

  /** 逻辑恢复书籍 */
  async restoreBookDeep(bookId: string): Promise<Status> {
    try {
      const tx = db.transaction(['books', 'articles', 'entities'], 'readwrite')
      const booksStore = tx.objectStore('books')
      const articlesStore = tx.objectStore('articles')
      const entitiesStore = tx.objectStore('entities')

      const book = await booksStore.get(bookId)
      if (!book) {
        tx.abort()
        return { success: false, message: `未找到书籍 ${bookId}` }
      }

      book.deletedTime = 0
      book.modifiedTime = Date.now()
      await booksStore.put(book)

      const articles = await articlesStore.index('by-book').getAll(bookId)
      for (const art of articles) {
        if (art.deletedTime !== 0) {
          art.deletedTime = 0
          art.modifiedTime = Date.now()
          await articlesStore.put(art)
        }
      }

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

  /** 获取书籍下的所有文章 */
  async getBookArticles(bookId: string, includeDeleted = false): Promise<Article[]> {
    const store = db.transaction(['articles'], 'readonly').objectStore('articles')
    const articles = await store.index('by-book').getAll(bookId)
    return includeDeleted ? articles : articles.filter(a => a.deletedTime === 0)
  }

  /**
   * 获取指定书籍下的所有实体
   * @param bookId 书籍 ID
   * @param includeDeleted 是否包含已软删除的实体，默认为 false
   * @returns 实体数组
   */
  async getBookEntities(bookId: string, includeDeleted = false): Promise<Entity[]> {
    const store = db.transaction(['entities'], 'readonly').objectStore('entities')
    const entities = await store.index('by-book').getAll(bookId)
    return includeDeleted ? entities : entities.filter(e => e.deletedTime === 0)
  }

  /**
   * 获取所有书籍
   * @param includeDeleted 是否包含已软删除的书籍，默认为 false
   * @returns 书籍数组
   */
  async getAllBooks(includeDeleted = false): Promise<Book[]> {
    const store = db.transaction(['books'], 'readonly').objectStore('books')
    const books = await store.getAll()
    return includeDeleted ? books : books.filter(b => b.deletedTime === 0)
  }
}()

/** 文章数据操作实例 */
export const articledb = new class {
  async createArticle(article: Article): Promise<Status> {
    article.deletedTime = article.deletedTime ?? 0
    try {
      const tx = db.transaction(['articles'], 'readwrite')
      await tx.objectStore('articles').add(article)
      await tx.done
      return { success: true }
    } catch (err: any) {
      return { success: false, message: err.message }
    }
  }

  /** 创建文章 */
  async updateArticle(article: Article): Promise<Status> {
    try {
      const updated = { ...article, modifiedTime: Date.now() }
      const tx = db.transaction(['articles'], 'readwrite')
      await tx.objectStore('articles').put(updated)
      await tx.done
      return { success: true }
    } catch (err: any) {
      return { success: false, message: err.message }
    }
  }

  /** 删除文章，彻底删除 */
  async deleteArticle(id: string): Promise<Status> {
    try {
      const tx = db.transaction(['articles'], 'readwrite')
      await tx.objectStore('articles').delete(id)
      await tx.done
      return { success: true }
    } catch (err: any) {
      return { success: false, message: err.message }
    }
  }

  /** 逻辑删除文章 */
  async softDeleteArticle(id: string): Promise<Status> {
    try {
      const tx = db.transaction(['articles'], 'readwrite')
      const store = tx.objectStore('articles')
      const art = await store.get(id)
      if (!art) { tx.abort(); return { success: false, message: '未找到文章' } }
      art.deletedTime = Date.now()
      art.modifiedTime = Date.now()
      await store.put(art)
      await tx.done
      return { success: true }
    } catch (err: any) {
      return { success: false, message: err.message }
    }
  }

  /** 恢复文章 */
  async restoreArticle(id: string): Promise<Status> {
    try {
      const tx = db.transaction(['articles'], 'readwrite')
      const store = tx.objectStore('articles')
      const art = await store.get(id)
      if (!art) { tx.abort(); return { success: false, message: '未找到文章' } }
      art.deletedTime = 0
      art.modifiedTime = Date.now()
      await store.put(art)
      await tx.done
      return { success: true }
    } catch (err: any) {
      return { success: false, message: err.message }
    }
  }
}()

/** 实体数据操作实例 */
export const entitydb = new class {
  async createEntity(ent: Entity): Promise<Status> {
    ent.deletedTime = ent.deletedTime ?? 0
    try {
      const tx = db.transaction(['entities'], 'readwrite')
      await tx.objectStore('entities').add(ent)
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

  /** 逻辑删除实体 */
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
}()
