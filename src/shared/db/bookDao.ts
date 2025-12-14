import db from "./db.ts"
import type { Book, Status } from "../types/index.ts"

/** 书籍操作类 */
export default new class {
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
