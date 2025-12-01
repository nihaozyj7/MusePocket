import { type DBSchema } from "idb"

/** 创建时间和修改时间 */
export interface Time {
  /** 创建时间 */
  createdTime: number
  /** 最后修改时间 */
  modifiedTime: number
  /** 删除时间，不删除为0 */
  deletedTime: number
}

/** 文章 */
export interface Article extends Time {
  id: string
  /** 所属书籍 */
  bookId: string
  /** 标题 */
  title: string
  /** 文章内容 */
  content: string
}

/** 书籍 */
export interface Book extends Time {
  id: string
  /** 书名 */
  title: string
  /** 作者 */
  author: string
  /** 描述 */
  description: string
  /** 封面图片ID */
  coverID: string
}

/** 自定义实体属性 */
export interface EntityAttr {
  /** 属性名称 */
  title: string
  /** 属性值 */
  value: string
  /** 排序索引，按照升序排列，可以重复 */
  sortIndex: number
}

/** 自定义实体 */
export interface Entity extends Time {
  id: string
  /** 所属书籍ID */
  bookId: string
  /** 名称 */
  title: string
  /** 分类 */
  type: string
  /** 描述 */
  description: string
  /** 图片ID */
  imgID: string
  /** 自定义属性列表 */
  attrs: EntityAttr[]
}

/** 数据库结构 */
export interface AppDB extends DBSchema {
  /** 文章表 */
  articles: {
    key: string
    value: Article
    indexes: {
      'by-book': string
    }
  }
  /** 书籍表 */
  books: {
    value: Book
    key: string
    indexes: {
      'by-author': string
    }
  }
  /** 实体表 */
  entities: {
    value: Entity
    key: string
    indexes: {
      'by-book': string
      'by-type': string
    }
  }
}

export type Status = { success: boolean; message?: string }
