import type { ProofreadError } from "@/domains/editor"
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
  /** 排序索引（用于自定义排序，升序） */
  sortOrder: number
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

/** 实体映射信息（记录实体在特定章节中的出现次数） */
export interface EntityMapping {
  /** 章节ID */
  articleId: string
  /** 在该章节中出现的次数 */
  count: number
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
  /** 实体映射（记录该实体在哪些章节中出现及次数） */
  mappings?: EntityMapping[]
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

  /** 草稿表 */
  drafts: {
    key: string
    value: Draft
    indexes: {
      'by-book': string
    }
  }

  /** 历史记录表 */
  articleHistories: {
    key: string
    value: ArticleHistoryRecord
    indexes: {
      'by-article': string
    }
  }

  /** KV 存储表（用于存储当前历史版本等键值对） */
  kvStore: {
    key: string
    value: KVRecord
  }
}

export type Status = { success: boolean; message?: string }

/** 快捷键配置 */
export interface ShortcutKeys {
  /** 保存快捷键 */
  save: string
  /** 一键排版快捷键 */
  format: string
  /** 查找替换快捷键 */
  replace: string
  /** 搜索章节快捷键 */
  search: string
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
  /** 背景图片ID（指向images表中的图片） */
  backgroundImageId: string
  /** 自动完成悬浮层延迟时间（毫秒） */
  autoCompleteDelay: number
  /** 自动完成确认插入按键 */
  autoCompleteConfirmKey: 'tab' | 'enter' | 'both'
  /** 自动完成是否默认选中第一个 */
  autoCompleteDefaultSelect: boolean
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

/** 历史记录类型 */
export interface ArticleHistoryRecord extends Time {
  /** 历史记录ID */
  id: string
  /** 所属文章ID */
  articleId: string
  /** 从上一版本到本版本的 diff（JSON 字符串）*/
  diffFromPrev: string | null
  /** 完整快照内容（只有栈顶版本有值，其他为 null）*/
  fullContent: string | null
}

/** KV 存储记录类型 */
export interface KVRecord {
  /** 键名 */
  key: string
  /** 值（JSON 字符串或普通字符串） */
  value: string
}

/** 草稿 */
export interface Draft extends Time {
  /** 草稿ID */
  id: string
  /** 所属书籍ID */
  bookId: string
  /** 草稿标题 */
  title: string
  /** 草稿内容 */
  content: string
  /** 是否为自动保存 */
  isAutoSave: boolean
}

/** 书籍导出数据 */
export interface BookExportData {
  /** 书籍信息 */
  book: Book
  /** 文章列表 */
  articles: Article[]
  /** 文章内容列表 */
  articleBodies: ArticleBody[]
  /** 实体列表 */
  entities: Entity[]
}

/** 文章导出数据 */
export interface ArticleExportData {
  /** 文章元数据 */
  article: Article
  /** 文章内容 */
  body: ArticleBody
}

/** 全库导出数据 */
export interface FullDatabaseExportData {
  /** 所有书籍 */
  books: Book[]
  /** 所有文章 */
  articles: Article[]
  /** 所有文章内容 */
  articleBodies: ArticleBody[]
  /** 所有实体 */
  entities: Entity[]
  /** 配置数据 */
  configs?: ConfigExportData
  /** 导出时间 */
  exportTime: number
  /** 版本号 */
  version: string
}

/** 配置导出数据 */
export interface ConfigExportData {
  /** AI模型配置 */
  models?: any[]
  /** 提示词 */
  prompts?: any[]
  /** 文本预设 */
  textSnippets?: TextSnippet[]
  /** 导出时间 */
  exportTime: number
}


/**
 * 本地校对问题接口定义
 * 用于描述本地文本校对中发现的问题信息
 */
export interface LocalProofreadIssue {
  /** 问题的唯一标识符 */
  id: string
  /** 问题所在行号 */
  lineNumber: number
  /** 错误信息，包含可选的行文本内容 */
  error: ProofreadError & { lineText?: string }
  /** 标识问题是否被选中 */
  selected: boolean
}


/** 校对问题接口定义 */
export interface ProofreadIssue {
  id: string
  type: 'error' | 'warning' | 'suggestion'
  category: string // 例如：拼写错误、标点符号、语法错误、用词不当等
  original: string // 原文
  suggestion: string // 建议修改
  reason: string // 修改原因
  position?: number // 在文本中的位置
  selected: boolean // 是否选中（用于批量操作）
}
