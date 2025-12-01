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
  async createBook(book: Book): Promise<Status> {
    book.deletedTime = book.deletedTime ?? 0
    try {
      const tx = db.transaction(['books'], 'readwrite')
      await tx.objectStore('books').add(book)
      await tx.done
      return { success: true }
    } catch (err: any) {
      return { success: false, message: err.message }
    }
  }

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

  async getBookArticles(bookId: string, includeDeleted = false): Promise<Article[]> {
    const store = db.transaction(['articles'], 'readonly').objectStore('articles')
    const articles = await store.index('by-book').getAll(bookId)
    return includeDeleted ? articles : articles.filter(a => a.deletedTime === 0)
  }
}()

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
