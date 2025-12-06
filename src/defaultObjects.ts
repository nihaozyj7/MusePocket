import type { Article, Book } from "./types"
import { getNewChapterName, uid } from "./utils"

export function getDefaultBook(): Book {
  return {
    id: uid(),
    title: '新书',
    description: '这是一本新书，开始你的写作之旅！',
    coverId: '/default.png',
    createdTime: Date.now(),
    modifiedTime: Date.now(),
    deletedTime: 0
  }
}

export function getDefaultArticle(bookId: string, articles: Article[]): Article {
  return {
    bookId,
    id: uid(),
    title: getNewChapterName(articles),
    createdTime: Date.now(),
    modifiedTime: Date.now(),
    wordCount: 0,
    deletedTime: 0
  }
}
