import { type OpenAiParams } from '@core/api'
import type { Prompt } from '@domains/settings/stores/prompts.store'
import type { Article, Book, Entity, EntityAttr, SettingsPreset, TextSnippet, BaseSettings } from "@shared/types"
import { getNewChapterName, uid } from "@shared/utils"

export function getDefaultBook(): Book {
  return {
    id: uid(),
    title: '新书',
    description: '这是一本新书，开始你的写作之旅！',
    coverId: '',
    createdTime: Date.now(),
    modifiedTime: Date.now(),
    deletedTime: 0
  }
}

export function getDefaultArticle(bookId: string, articles: Article[]): Article {
  // 计算新文章的排序索引（比现有最大值大1）
  const maxSortOrder = articles.length > 0
    ? Math.max(...articles.map(a => a.sortOrder || 0))
    : 0

  return {
    bookId,
    id: uid(),
    title: getNewChapterName(articles),
    createdTime: Date.now(),
    modifiedTime: Date.now(),
    wordCount: 0,
    deletedTime: 0,
    sortOrder: maxSortOrder + 1
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
    deletedTime: 0,
    mappings: []
  }
  /** 获取默认校对提示词 */
function getDefaultProofreadPrompt(): string {
  return `你是一个专业的文本校对专家。请仔细检查以下文本，找出所有的问题并给出修改建议。

                检查内容包括但不限于：
                1. 错别字和拼写错误
                2. 标点符号使用错误
                3. 语法错误
                4. 用词不当
                5. 表达不清晰的地方
                6. 逻辑不通顺的句子
                7. 语言风格不一致
                8. 重复的表达

                请以JSON数组格式返回，每个问题包含：
                - type: "error"（明显错误）| "warning"（需要注意）| "suggestion"（优化建议）
                - category: 问题类别（如“拼写错误”、“标点符号”、“语法错误”、“用词不当”等）
                - original: 需要修改的原文片段（尽量精确到词组或句子）
                - suggestion: 建议修改后的内容
                - reason: 简明的修改原因说明

                注意事项：
                1. 只指出真正的问题，不要过度挑剔
                2. original 字段应该是文本中实际存在的内容，以便精确替换
                3. 保持原文的语言风格和意图
                4. 对于文学作品，允许合理的修辞和艺术表达

                示例格式：
                [
                {
                "type": "error",
                "category": "拼写错误",
                "original": "旅游",
                "suggestion": "旅游",
                "reason": "正确写法应为“旅游”"
                },
                {
                "type": "warning",
                "category": "标点符号",
                "original": "你好,世界",
                "suggestion": "你好，世界",
                "reason": "中文应使用全角逗号"
                }
                ]`
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
    backgroundImageId: '',
    autoCompleteDelay: 0,
    autoCompleteConfirmKey: 'both',
    autoCompleteDefaultSelect: true
  }
}

/** 获取默认校对提示词 */
function getDefaultProofreadPrompt(): string {
  return `你是一个专业的文本校对专家。请仔细检查以下文本，找出所有的问题并给出修改建议。
检查内容包括但不限于：
1. 错别字和拼写错误
2. 标点符号使用错误
3. 语法错误
4. 用词不当
5. 表达不清晰的地方
6. 逻辑不通顺的句子
7. 语言风格不一致
8. 重复的表达

请以JSON数组格式返回，每个问题包含：
- type: "error"（明显错误）| "warning"（需要注意）| "suggestion"（优化建议）
- category: 问题类别（如“拼写错误”、“标点符号”、“语法错误”、“用词不当”等）
- original: 需要修改的原文片段（尽量精确到词组或句子）
- suggestion: 建议修改后的内容
- reason: 简明的修改原因说明

注意事项：
1. 只指出真正的问题，不要过度挑剔
2. original 字段应该是文本中实际存在的内容，以便精确替换
3. 保持原文的语言风格和意图
4. 对于文学作品，允许合理的修辞和艺术表达

示例格式：
[
{
"type": "error",
"category": "拼写错误",
"original": "旅游",
"suggestion": "旅游",
"reason": "正确写法应为“旅游”"
},
{
"type": "warning",
"category": "标点符号",
"original": "你好,世界",
"suggestion": "你好，世界",
"reason": "中文应使用全角逗号"
}
]`
}
