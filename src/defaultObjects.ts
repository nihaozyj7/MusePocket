import type { Book } from "./types"
import { uid } from "./utils"

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
