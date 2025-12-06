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

/** 文章元数据 */
export interface Article extends Time {
  /** 文章ID */
  id: string
  /** 所属书籍ID */
  bookId: string
  /** 标题 */
  title: string
  /** 字数 */
  wordCount: number
}

/** 文章内容，与文章ID一致 */
export interface ArticleBody extends Time {
  /** 文章ID */
  id: string
  /** 正文内容 */
  content: string
}

/** 书籍 */
export interface Book extends Time {
  /** 书籍ID */
  id: string
  /** 书名 */
  title: string
  /** 描述 */
  description: string
  /** 封面图片ID */
  coverId: string
  // 修改书籍元数据，不更新最后 modifiedTime
}

/** 自定义实体属性 */
export interface EntityAttr {
  /** 属性名称 */
  title: string
  /** 属性值 */
  value: string
  /** 排序索引（升序，可重复） */
  sortIndex: number
}

/** 自定义实体 */
export interface Entity extends Time {
  /** 实体ID */
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

/** 图片Base64字符串 */
export interface ImageBase64 {
  id: string
  base64: string
}

/** 数据库结构 */
export interface AppDB extends DBSchema {
  /** 文章元数据表 */
  articles: {
    /** 主键：文章ID */
    key: string
    /** 元数据值 */
    value: Article
    /** 索引 */
    indexes: {
      /** 按书籍分类 */
      'by-book': string
    }
  }

  /** 文章正文表（新加） */
  articleBodies: {
    /** 主键：文章ID */
    key: string
    /** 正文内容 */
    value: ArticleBody
  }

  /** 书籍表 */
  books: {
    key: string
    value: Book
    indexes: {
      'by-author': string
    }
  }

  /** 实体表 */
  entities: {
    key: string
    value: Entity
    indexes: {
      'by-book': string
      'by-type': string
    }
  }
}

export type Status = { success: boolean; message?: string }
