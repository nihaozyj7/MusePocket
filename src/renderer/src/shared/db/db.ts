import type { AppDB } from '@shared/types'
import { openDB, type IDBPDatabase } from 'idb'

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

export default await openAppDB()
