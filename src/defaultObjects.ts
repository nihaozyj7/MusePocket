import { type OpenAiParams } from './apis/index'
import type { Prompt } from './stores/PromptsStore'
import type { Article, Book, Entity, EntityAttr, SettingsPreset, TextSnippet, BaseSettings } from "./types"
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


export function getDefaultEntity(bookId: string): Entity {
  return {
    id: uid(),
    bookId,
    createdTime: Date.now(),
    modifiedTime: Date.now(),
    title: '',
    type: '',
    description: '',
    imgID: '',
    deletedTime: 0
  }
}


export function getDefaultEntityAttr(): EntityAttr {
  return {
    title: '',
    value: '',
    sortIndex: 0
  }
}

export function getDefaultModel(): OpenAiParams {
  return {
    note: '',
    baseUrl: '',
    apiKey: '',
    model: '',
  }
}


export function getDefaultPrompt(): Prompt {
  return {
    id: uid(),
    title: '',
    prompt: ''
  }
}

export function getDefaultSettingsPreset(): SettingsPreset {
  return {
    id: uid(),
    title: '',
    settings: getDefaultBaseSettings()
  }
}

export function getDefaultTextSnippet(): TextSnippet {
  return {
    id: uid(),
    title: '',
    content: ''
  }
}

export function getDefaultBaseSettings(): BaseSettings {
  return {
    baseFontSize: 16,
    editorFontSize: 1,
    autoSaveInterval: 3,
    lineHeight: 2.5,
    enableParagraphSpacing: true,
    entityStyle: {
      underline: true,
      underlineColor: '#2997ff',
      background: false,
      backgroundColor: '#2997ff20',
      textColor: false,
      color: '#2997ff'
    },
    usePlainTextPaste: false,
    insertEntityAsPlainText: false,
    enableGridLines: false,
    gridLineStyle: 'dashed',
    enableBackgroundImage: false,
    backgroundImage: '',
    editorBackgroundOpacity: 0.9
  }
}
