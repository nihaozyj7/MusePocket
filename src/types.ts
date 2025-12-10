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
  attrs?: EntityAttr[]
}

/** 获取图片URL */
export interface ImageBase64 {
  id: string
  base64: Blob
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
  }

  /** 实体表 */
  entities: {
    key: string
    value: Entity
    indexes: {
      'by-book': string
      'by-type': string
    }
  },
  /** 图片表 */
  images: {
    key: string
    value: ImageBase64
  }
  /** 历史记录表 */
  histories: {
    key: string
    value: DBHistoryRecord
    indexes: {
      'by-article': string
      'by-sequence': number
    }
  }
}

export type Status = { success: boolean; message?: string }

/** 快捷键配置 */
export interface ShortcutKeys {
  /** 保存快捷键 */
  save: string
  /** 一键排版快捷键 */
  format: string
  /** 查找快捷键 */
  find: string
  /** 替换快捷键 */
  replace: string
}

/** 实体样式配置 */
export interface EntityStyle {
  /** 是否启用下划线 */
  underline: boolean
  /** 下划线颜色 */
  underlineColor: string
  /** 是否启用背景色 */
  background: boolean
  /** 背景色 */
  backgroundColor: string
  /** 是否启用文字色 */
  textColor: boolean
  /** 文字颜色 */
  color: string
}

/** 网格线样式 */
export type GridLineStyle = 'dashed' | 'solid'

/** 基础设置配置 */
export interface BaseSettings {
  /** 基准尺寸（px） */
  baseFontSize: number
  /** 编辑区文字尺寸（rem） */
  editorFontSize: number
  /** 自动保存间隔（秒） */
  autoSaveInterval: number
  /** 字体行高（倍数） */
  lineHeight: number
  /** 启用段间距 */
  enableParagraphSpacing: boolean
  /** 实体样式 */
  entityStyle: EntityStyle
  /** 复制粘贴使用纯文本 */
  usePlainTextPaste: boolean
  /** 插入实体时使用普通文本 */
  insertEntityAsPlainText: boolean
  /** 启用网格线 */
  enableGridLines: boolean
  /** 网格线样式 */
  gridLineStyle: GridLineStyle
  /** 启用背景图片 */
  enableBackgroundImage: boolean
  /** 背景图片（base64或URL） */
  backgroundImage: string
}

/** 配置预设项（用于保存和应用基础设置） */
export interface SettingsPreset {
  /** 预设ID */
  id: string
  /** 预设名称 */
  title: string
  /** 预设设置内容 */
  settings: BaseSettings
}

/** 文本预设项（用于快速插入常用文本到文章） */
export interface TextSnippet {
  /** 预设ID */
  id: string
  /** 预设名称 */
  title: string
  /** 预设文本内容 */
  content: string
}

/** Diff 操作类型 */
export type DiffOperationType = 'insert' | 'delete' | 'equal'

/** Diff 操作 */
export interface DiffOperation {
  /** 操作类型 */
  type: DiffOperationType
  /** 操作的文本内容 */
  text: string
  /** 操作位置 */
  position: number
}

/** 历史记录项 */
export interface HistoryRecord {
  /** 记录ID */
  id: string
  /** 文章ID */
  articleId: string
  /** 时间戳 */
  timestamp: number
  /** 相对于前一版本的差异 */
  diffs: DiffOperation[]
  /** 完整内容（首个版本或定期快照） */
  fullContent?: string
  /** 是否为快照版本 */
  isSnapshot: boolean
}

/** 数据库中的历史记录项（序列化存储） */
export interface DBHistoryRecord extends Time {
  /** 记录ID */
  id: string
  /** 文章ID */
  articleId: string
  /** 相对于前一版本的差异（JSON字符串） */
  diffsJson: string
  /** 完整内容（首个版本或定期快照） */
  fullContent?: string
  /** 是否为快照版本 */
  isSnapshot: boolean
  /** 序号（用于排序） */
  sequence: number
}
