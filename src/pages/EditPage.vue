<script setup lang="ts">
import InsertSnippetPopup from '@domains/editor/components/InsertSnippetPopup.vue'
import { HistoryViewPopup } from '@shared/components'
import HistorySidebar from '@domains/library/components/HistorySidebar.vue'
import SearchArticlePopup from '@domains/editor/components/SearchArticlePopup.vue'
import DraftManager from '@domains/editor/components/DraftManager.vue'
import ProofreadTool from '@domains/editor/components/ProofreadTool.vue'
import FindReplacePopup from '@domains/editor/components/FindReplacePopup.vue'
import AiSuggestionTool from '@domains/editor/components/AiSuggestionTool.vue'
import Editor from '@domains/editor/components/Editor.vue'
import { articledb, bookdb, importExportdb } from '@shared/db'
import { getDefaultArticle } from '@shared/constants/defaults'
import { $tips } from '@app/plugins'
import router from '@app/router'
import { useEntityStore } from '@domains/library/stores/entities.store'
import { useSelectedArticleStore } from '@domains/editor/stores/selected-article.store'
import { useSelectedBookStore } from '@domains/library/stores/selected-book.store'
import { useSettingStore } from '@domains/settings/stores/settings.store'
import { useHistoryStore } from '@domains/editor/stores/history.store'
import type { Article, ArticleBody } from '@shared/types'
import { countNonWhitespace, exportTxt, getCleanedEditorContent, trimAndReduceNewlines, waitFor, insertText, saveCursorPosition, restoreCursorPosition, saveCursorTextPosition, restoreCursorTextPosition } from '@shared/utils'
import { defineAsyncComponent, onMounted, onUnmounted, ref } from 'vue'
import { event_emit, event_on, event_off } from '@shared/utils/event-bus'
import { EntityMappingService } from '@shared/utils/entity-mapping'

// 懒加载组件
const ContextMenu = defineAsyncComponent(() => import('@shared/components/ContextMenu.vue'))
const EntityManager = defineAsyncComponent(() => import('@domains/library/components/EntityManager.vue'))
const RecycleBinArticlePopup = defineAsyncComponent(() => import('@domains/library/components/RecycleBinArticlePopup.vue'))
const NameGeneratorTool = defineAsyncComponent(() => import('@domains/editor/components/NameGeneratorTool.vue'))
const ArticleImportExport = defineAsyncComponent(() => import('@domains/library/components/ArticleImportExport.vue'))
const Popup = defineAsyncComponent(() => import('@shared/components/Popup.vue'))

/** 文章列表 */
const articles = ref<Article[]>([])
/** 当前文章 */
const selectedArticleStore = useSelectedArticleStore()
/** 当前书籍 */
const selectedBookStore = useSelectedBookStore()
/** 当前打开的文章的内容 */
const articleBody = ref<ArticleBody | null>(null)
/** 右键菜单 */
const articleContextMenuRef = ref(null)
/** 文本编辑器 */
const editorRef = ref(null)
/** 侧边工具栏 */
const rutilsRef = ref<HTMLElement | null>(null)
/** 配置项 */
const settingStore = useSettingStore()
/** 历史记录 */
const historyStore = useHistoryStore()

/** 拖拽相关状态 */
const draggedItem = ref<Article | null>(null)
const dragOverIndex = ref<number | null>(null)

/** 插入预设弹出层 */
const insertSnippetPopupRef = ref<InstanceType<typeof InsertSnippetPopup> | null>(null)

/** 历史记录弹出层 */
const historyViewPopupRef = ref<InstanceType<typeof HistoryViewPopup> | null>(null)

/** 历史记录侧栏 */
const historySidebarRef = ref<InstanceType<typeof HistorySidebar> | null>(null)

/** 文章回收站弹出层 */
const recycleBinArticlePopupRef = ref(null)

/** 搜索文章弹出层 */
const searchArticlePopupRef = ref<InstanceType<typeof SearchArticlePopup> | null>(null)

/** 导入导出弹出层 */
const importExportPopupRef = ref(null)

const eneityManagerRef = ref(null)

/** 校对工具 */
const proofreadToolRef = ref<InstanceType<typeof ProofreadTool> | null>(null)

/** 查找替换弹出层 */
const findReplacePopupRef = ref<InstanceType<typeof FindReplacePopup> | null>(null)

/** 右边侧栏工具按钮标题 列表 */
const rutilsTitles = ['✒️ 取名工具', '✅ 校对', '📁 实体管理', '💡 AI建议', '📝 草稿', '⏱️ 历史版本']

/** 处理实体标题更新 */
function handleEntityTitleUpdate(entityId: string, newTitle: string) {
  // 通知编辑器更新实体标题
  if (editorRef.value) {
    editorRef.value.updateEntityTitle(entityId, newTitle)
  }
}

onMounted(() => {
  loadArticles()
  settingStore.setEditorWidthMode()
  rutilsRef.value.style.width = `${settingStore.drawerWidth}px`
  useEntityStore().load(selectedBookStore.v.id)
  // 监听快捷键
  document.addEventListener('keydown', handleGlobalKeydown)
  // 监听实体标题更新事件
  event_on('entity-title-updated', handleEntityTitleUpdate)
})

onUnmounted(() => {
  // 移除全局监听器
  document.removeEventListener('keydown', handleGlobalKeydown)
  // 移除实体标题更新监听
  event_off('entity-title-updated', handleEntityTitleUpdate)
})

/** 全局快捷键监听 */
function handleGlobalKeydown(e: KeyboardEvent) {
  const keys: string[] = []
  if (e.ctrlKey || e.metaKey) keys.push('Ctrl')
  if (e.altKey) keys.push('Alt')
  if (e.shiftKey) keys.push('Shift')
  keys.push(e.key.toUpperCase())

  const shortcut = keys.join('+')

  // 搜索章节快捷键
  if (shortcut === settingStore.shortcutKeys.search) {
    e.preventDefault()
    openSearchPopup()
  }
  // 查找替换快捷键
  else if (shortcut === settingStore.shortcutKeys.replace) {
    e.preventDefault()
    openFindReplace()
  }
  // 一键排版快捷键
  else if (shortcut === settingStore.shortcutKeys.format) {
    e.preventDefault()
    handleFormat()
  }
}

const contextMenuHanders = {
  edit(id: string) {
    const article = articles.value.find(article => article.id === id)
    if (!article) return $tips.error('文章不存在')
    openArticle(article)
  },
  delete(id: string) {
    articledb.softDelete(id).then(res => {
      if (!res.success) return console.error(`删除文章失败, ${res.message}`)
      $tips.success('删除成功')

      // 先计算索引（在删除前）
      let index = articles.value.findIndex(article => article.id === id) - 1
      // 从列表中移除被删除的文章
      articles.value = articles.value.filter(article => article.id !== id)

      // 如果删除的不是当前选中的文章，直接返回
      if (selectedArticleStore.v.id !== id) return

      // 如果删除后没有文章了，创建新文章
      if (articles.value.length === 0) {
        creatreArticle()
      } else {
        // 选择前一个文章（如果索引<0则选择第一个）
        const nextArticle = articles.value[Math.max(0, index)]
        // 重要：调用 openArticle 来加载文章内容，而不是仅仅设置 selectedArticleStore.v
        openArticle(nextArticle)
      }
    })
  },
  exportTxt(id: string) {
    const article = articles.value.find(article => article.id === id)
    articledb.getArticleBody(id).then(res => {
      exportTxt(article?.title || '未命名', res.content || '内容未找到')
    }).catch(err => {
      $tips.error(`导出文章失败, ${err.message}`)
    })
  },
  copy(id: string) {
    if (editorRef.value) {
      navigator.clipboard.writeText(trimAndReduceNewlines(editorRef.value.getBodyText()))
    }
    $tips.success('已复制')
  },
}

function handleArticleContextmenu(e: MouseEvent) {
  e.preventDefault()

  const articleItem = (e.target as HTMLElement).closest<HTMLElement>('.article-item')
  if (!articleItem) return
  const aid = articleItem.dataset.articleId

  articleContextMenuRef.value.show(e, [
    { title: '✏️ 编辑', callback: () => contextMenuHanders.edit(aid) },
    { title: '🗑️ 删除', callback: () => contextMenuHanders.delete(aid) },
    { title: '📄 导出为TXT', callback: () => contextMenuHanders.exportTxt(aid) },
    { title: '📋 复制到剪贴板', callback: () => contextMenuHanders.copy(aid) },
  ])
}

function handleSaveArticleTitle(title: string) {
  articledb.updateArticle(selectedArticleStore.v).then(res => {
    if (!res.success) $tips.error(`更新标题失败, ${res.message}`)
  })
}

async function saveArticle(text: string, oldText?: string, skipHistory: boolean = false) {

  // 等待编辑器组件加载完成
  if (!editorRef.value) {
    console.error('Editor component not loaded')
    return
  }

  // 清洗后的内容（这才是真正存入数据库的内容）
  const cleanedContent = getCleanedEditorContent(editorRef.value.getBody())
  articleBody.value.content = cleanedContent
  selectedArticleStore.v.modifiedTime = Date.now()
  selectedArticleStore.v.wordCount = countNonWhitespace(text)
  selectedBookStore.v.modifiedTime = Date.now()

  // 保存历史记录（使用清洗后的内容）
  if (!skipHistory && oldText !== undefined && oldText !== cleanedContent) {
    try {
      // 检查当前是否在历史版本中（非栈顶位置）
      const currentIndex = historyStore.getCurrentIndex()

      // 如果在非栈顶位置保存，需要先舍弃当前索引到栈顶之间的记录
      if (currentIndex > 0) {
        await historyStore.discardRecordsAfterIndex(currentIndex)
      }

      const { saveNewVersion } = await import('@domains/editor/services/history.service')
      // saveNewVersion 内部已经更新 KV 存储
      await saveNewVersion(selectedArticleStore.v.id, oldText, cleanedContent)

      // 重新加载历史记录列表（从数据库加载，从 KV 恢复当前版本）
      await historyStore.loadHistories(selectedArticleStore.v.id, true)
    } catch (err) {
      console.error('保存历史记录失败:', err)
    }
  }

  // 保存到数据库
  Promise.all([
    articledb.updateArticle(selectedArticleStore.v, articleBody.value),
    bookdb.updateBook(selectedBookStore.v)
  ]).then(results => {
    if (!results.every(result => result.success)) {
      $tips.error('数据储存出现错误' + results.map(result => result.message).join('\n'))
    }
  })

  bookdb.updateBook(selectedBookStore.v)
  if (editorRef.value) {
    editorRef.value.setSaveState('✅ 已保存')
  }

  // 更新历史侧栏的当前文本（使用清洗后的内容）
  if (historySidebarRef.value) {
    historySidebarRef.value.setCurrentText(cleanedContent)
  }

  // 更新实体映射
  try {
    await EntityMappingService.updateMappingsForArticle(
      selectedArticleStore.v.id,
      cleanedContent,
      selectedBookStore.v.id
    )
  } catch (err) {
    console.error('更新实体映射失败:', err)
  }
}

async function handleArticleClick(e: MouseEvent) {
  const articleItem = e.target instanceof Element ? (e.target as Element).closest<HTMLElement>('.article-item') : null
  if (!articleItem) return
  const id = articleItem.dataset.articleId
  const article = articles.value.find(article => article.id === id)
  if (article) {
    if (editorRef.value) {
      // 切换文章前强制保存当前文章，不等待输入法
      editorRef.value.forceSave()
      // 等待一小段时间确保保存完成
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    selectedArticleStore.v = article
    openArticle(article)
  } else {
    selectedArticleStore.v = null
  }
}

function isSelected(article: Article) {
  return selectedArticleStore.v && selectedArticleStore.v.id === article.id
}

function goHome() {
  selectedBookStore.v = null
  router.push({ path: '/', replace: true })
}

function openArticle(article: Article) {
  articledb.getArticleBody(article.id).then(async res => {
    selectedArticleStore.v = article
    articleBody.value = res

    // 同步实体标题：从数据库加载最新的实体信息并更新到文章内容中
    const syncedContent = await EntityMappingService.syncEntityTitlesInContent(
      res.content,
      selectedBookStore.v.id
    )

    // 如果内容被更新，同步到数据库
    if (syncedContent !== res.content) {
      articleBody.value.content = syncedContent
      await articledb.updateArticle(selectedArticleStore.v, articleBody.value)
    }

    // 初始化历史记录
    historyStore.initArticle(article.id)

    // 等待编辑器成功加载后再设置内容
    waitFor(() => editorRef.value, () => {
      if (editorRef.value) {
        editorRef.value.resetBody(syncedContent)
        // 更新历史侧栏的当前文本
        if (historySidebarRef.value) {
          historySidebarRef.value.setCurrentText(syncedContent || '')
          // 设置获取当前编辑器文本的回调（返回清洗后的内容）
          historySidebarRef.value.setGetCurrentTextCallback(() => {
            if (!editorRef.value) return ''
            return getCleanedEditorContent(editorRef.value.getBody())
          })
        }
      }
    })

  }).catch(err => {
    $tips.error(`获取文章正文失败, ${err.message}`)
    console.error(err)
  })
}

/** 处理插入文本预设 */
function handleInsertSnippet(content: string) {
  insertText(content)
  // 触发编辑器保存
  if (editorRef.value) {
    editorRef.value.handleInput()
  }
}

/** 撤销 */
async function handleUndo() {
  if (!historyStore.canUndo || !editorRef.value) return

  // 保存光标的文本位置（基于文本偏移量）
  const cursorOffset = saveCursorTextPosition(editorRef.value.getBody())

  const content = await historyStore.undo()
  if (content !== null) {
    // 重置编辑器内容
    editorRef.value.resetBody(content)

    // 根据文本偏移量恢复光标位置
    setTimeout(() => {
      if (cursorOffset !== null && editorRef.value) {
        restoreCursorTextPosition(editorRef.value.getBody(), cursorOffset)
      }
    }, 50)
  }
}

/** 重做 */
async function handleRedo() {
  if (!historyStore.canRedo || !editorRef.value) return

  // 保存光标的文本位置（基于文本偏移量）
  const cursorOffset = saveCursorTextPosition(editorRef.value.getBody())

  const content = await historyStore.redo()
  if (content !== null) {
    // 重置编辑器内容
    editorRef.value.resetBody(content)

    // 根据文本偏移量恢复光标位置
    setTimeout(() => {
      if (cursorOffset !== null && editorRef.value) {
        restoreCursorTextPosition(editorRef.value.getBody(), cursorOffset)
      }
    }, 50)
  }
}

/** 显示历史记录弹窗 */
function showHistoryPopup() {
  historyViewPopupRef.value?.show()
}

/** 从历史版本恢复 */
async function handleRestoreFromHistory(historyId: string) {
  if (!editorRef.value) return

  // 保存光标的文本位置（基于文本偏移量）
  const cursorOffset = saveCursorTextPosition(editorRef.value.getBody())

  // 获取目标版本内容
  const content = await historyStore.revertToHistory(historyId)
  if (content === null) {
    $tips.error('恢复失败')
    return
  }

  // 重置编辑器内容（不保存新版本，只移动指针）
  editorRef.value.resetBody(content)

  // 根据文本偏移量恢复光标位置
  setTimeout(() => {
    if (cursorOffset !== null && editorRef.value) {
      restoreCursorTextPosition(editorRef.value.getBody(), cursorOffset)
    }
  }, 50)

  // 更新数据库
  articleBody.value.content = content
  selectedArticleStore.v.modifiedTime = Date.now()
  selectedArticleStore.v.wordCount = countNonWhitespace(content)

  await Promise.all([
    articledb.updateArticle(selectedArticleStore.v, articleBody.value),
    bookdb.updateBook(selectedBookStore.v)
  ])

  $tips.success('已回退到该版本')
}

/** 处理校对修复 */
function handleProofreadFix(issueOrOriginal: any, corrected?: string) {
  if (!editorRef.value) return

  const bodyElement = editorRef.value.getBody()
  if (!bodyElement) return

  let originalText: string
  let correctedText: string
  let position: number | null = null

  // 支持两种调用方式
  if (typeof issueOrOriginal === 'string' && corrected) {
    // 本地纠错方式：直接传入original和corrected
    originalText = issueOrOriginal
    correctedText = corrected
  } else {
    // AI校对方式：传入issue对象
    const issue = issueOrOriginal
    originalText = issue.original
    correctedText = issue.suggestion
    // 如果有位置信息，使用位置来定位
    position = issue.position
  }

  // 保存光标位置
  const cursorPos = saveCursorTextPosition(bodyElement)

  // 获取编辑器中的纯文本内容
  const editorText = editorRef.value.getBodyText()

  let replaced = false
  let targetNode: Text | null = null
  let targetOffset: number = 0

  if (position !== null && position >= 0) {
    // 使用字符偏移量精确定位
    const walker = document.createTreeWalker(
      bodyElement,
      NodeFilter.SHOW_TEXT,
      null
    )

    let currentNode: Text | null
    let currentOffset = 0

    while (currentNode = walker.nextNode() as Text) {
      const nodeText = currentNode.textContent || ''
      const nodeLength = nodeText.length

      // 检查目标位置是否在这个节点中
      if (position >= currentOffset && position < currentOffset + nodeLength) {
        // 计算在这个节点中的相对位置
        const relativePosition = position - currentOffset

        // 检查这个位置开始的文本是否匹配originalText
        if (nodeText.substring(relativePosition, relativePosition + originalText.length) === originalText) {
          targetNode = currentNode
          targetOffset = relativePosition
          break
        }
      }

      currentOffset += nodeLength
    }
  }

  if (targetNode) {
    // 在目标节点中执行替换
    const nodeText = targetNode.textContent || ''
    const beforeText = nodeText.substring(0, targetOffset)
    const afterText = nodeText.substring(targetOffset + originalText.length)

    targetNode.textContent = beforeText + correctedText + afterText
    replaced = true
  } else {
    // 如果无法通过偏移量定位，回退到文本搜索
    const walker = document.createTreeWalker(
      bodyElement,
      NodeFilter.SHOW_TEXT,
      null
    )

    let node: Text | null
    while (node = walker.nextNode() as Text) {
      const content = node.textContent || ''
      const index = content.indexOf(originalText)
      if (index !== -1) {
        node.textContent = content.replace(originalText, correctedText)
        replaced = true
        break // 只替换第一个匹配项
      }
    }
  }

  if (replaced) {
    // 恢复光标位置
    setTimeout(() => {
      restoreCursorTextPosition(bodyElement, cursorPos)
      // 触发保存
      if (editorRef.value) {
        editorRef.value.handleInput()
      }
    }, 50)
  } else {
    $tips.error('未找到要替换的文本')
  }
}



function creatreArticle() {
  const newArticle = getDefaultArticle(selectedBookStore.v.id, articles.value)
  if (!newArticle) return $tips.error('获取默认文章失败')
  articledb.createArticle(newArticle).then(res => {
    if (res.success) {
      articles.value.push(newArticle)
      openArticle(articles.value[articles.value.length - 1])
    } else {
      $tips.error(`创建文章失败, ${res.message}`)
    }
  })
}

function loadArticles() {
  articledb.getBookArticles(selectedBookStore.v.id).then(res => {
    // 为没有sortOrder的旧数据设置默认值
    res.forEach((article, index) => {
      if (article.sortOrder === undefined || article.sortOrder === null) {
        article.sortOrder = article.createdTime
      }
    })

    articles.value = res
    // 按sortOrder排序，如果sortOrder相同则按创建时间排序
    articles.value.sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) {
        return a.sortOrder - b.sortOrder
      }
      return a.createdTime - b.createdTime
    })

    // 如何存在历史打开的文章，则查找文章列表中是否存在该文章，如果存在则打开
    const article = selectedArticleStore.v
      && articles.value.find(article => article.id === selectedArticleStore.v.id)
    // 用户离开页面时存在打开的文章，则恢复
    if (article) openArticle(article)
    // 不存在打开的文章，则打开最后一章
    else if (res.length > 0) openArticle(articles.value[res.length - 1])
    // 不存在文章，创建新文章
    else creatreArticle()
  }).catch(err => {
    $tips.error(`获取文章列表失败, ${err.message}`)
  })
}

/** 打开文章回收站 */
function openRecycleBin() {
  recycleBinArticlePopupRef.value?.show(selectedBookStore.v.id)
}

/** 打开搜索弹窗 */
function openSearchPopup() {
  searchArticlePopupRef.value?.show(articles.value)
}

/** 处理搜索选择文章 */
function handleSearchSelectArticle(article: Article) {
  openArticle(article)
}

/** 处理文章恢复 */
function handleArticleRestored(article: Article) {
  // 重新加载文章列表
  loadArticles()
  $tips.success(`文章《${article.title}》已恢复`)
}

function HandleUtilsPanelButtonsClick(e: MouseEvent) {
  const target = e.target as HTMLElement
  const title = target?.innerText

  if (title === settingStore.rutilsTitle) {
    return settingStore.rutilsTitle = null
  }

  if (rutilsTitles.includes(title)) {
    settingStore.rutilsTitle = title
  }
}

function handleSplitLineMousedown(e: MouseEvent) {
  let startX = e.clientX
  const startWidth = settingStore.drawerWidth
  const handleMousemove = (me: MouseEvent) => {
    const deltaX = me.clientX - startX
    settingStore.drawerWidth = Math.min(600, Math.max(startWidth - deltaX, 300))
    rutilsRef.value.style.width = `${settingStore.drawerWidth}px`
  }
  document.addEventListener('mousemove', handleMousemove)
  document.addEventListener('mouseup', () => {
    document.removeEventListener('mousemove', handleMousemove)
  }, { once: true })
}

/** 开始拖拽 */
function handleDragStart(e: DragEvent, article: Article) {
  draggedItem.value = article
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
  }
}

/** 拖拽结束 */
function handleDragEnd() {
  draggedItem.value = null
  dragOverIndex.value = null
}

/** 拖拽经过 */
function handleDragOver(e: DragEvent, index: number) {
  e.preventDefault()
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'move'
  }
  dragOverIndex.value = index
}

/** 拖拽离开 */
function handleDragLeave() {
  dragOverIndex.value = null
}

/** 放置 */
function handleDrop(e: DragEvent, targetIndex: number) {
  e.preventDefault()

  if (!draggedItem.value) return

  const draggedIndex = articles.value.findIndex(a => a.id === draggedItem.value!.id)
  if (draggedIndex === -1 || draggedIndex === targetIndex) {
    draggedItem.value = null
    dragOverIndex.value = null
    return
  }

  // 重新排列数组
  const newArticles = [...articles.value]
  const [movedArticle] = newArticles.splice(draggedIndex, 1)
  newArticles.splice(targetIndex, 0, movedArticle)

  // 更新sortOrder
  const updates = newArticles.map((article, index) => ({
    id: article.id,
    sortOrder: index + 1
  }))

  // 更新本地状态
  articles.value = newArticles
  articles.value.forEach((article, index) => {
    article.sortOrder = index + 1
  })

  // 批量保存到数据库
  articledb.batchUpdateSortOrder(updates).then(res => {
    if (res.success) {
      $tips.success('排序已保存')
    } else {
      $tips.error(`保存排序失败: ${res.message}`)
      // 失败时重新加载
      loadArticles()
    }
  })

  draggedItem.value = null
  dragOverIndex.value = null
}

/** 打开导入导出弹窗 */
function openImportExportPopup() {
  importExportPopupRef.value?.show()
}

/** 导入成功回调 */
function handleImportSuccess() {
  // 重新加载文章列表
  loadArticles()
  importExportPopupRef.value?.close()
}

/** 导出当前选中的文章 */
async function exportCurrentArticle() {
  if (!selectedArticleStore.v) {
    $tips.error('请先选择一篇文章')
    return
  }

  try {
    const data = await importExportdb.exportArticle(selectedArticleStore.v.id)
    if (!data) {
      $tips.error('导出失败')
      return
    }

    const jsonStr = JSON.stringify(data, null, 2)
    const blob = new Blob([jsonStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${selectedArticleStore.v.title}_${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)

    $tips.success(`已导出文章《${selectedArticleStore.v.title}》`)
  } catch (err: any) {
    $tips.error(`导出失败: ${err.message}`)
  }
}

/** 导出所有文章 */
async function exportAllArticles() {
  if (articles.value.length === 0) {
    $tips.error('当前书籍没有文章')
    return
  }

  try {
    const articleIds = articles.value.map(a => a.id)
    const data = await importExportdb.exportArticles(articleIds)

    if (data.length === 0) {
      $tips.error('导出失败')
      return
    }

    const jsonStr = JSON.stringify(data, null, 2)
    const blob = new Blob([jsonStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${selectedBookStore.v.title}_all_articles_${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)

    $tips.success(`已导出 ${data.length} 篇文章`)
  } catch (err: any) {
    $tips.error(`导出失败: ${err.message}`)
  }
}

/** 打开设置弹窗 */
function openSettings() {
  event_emit('openSettings')
}

/** 一键排版 */
function handleFormat() {
  if (!editorRef.value) {
    $tips.error('编辑器未准备好')
    return
  }

  // 获取当前编辑器的body元素
  const bodyElement = editorRef.value.getBody()

  // 使用和保存时相同的处理逻辑
  const cleanedContent = getCleanedEditorContent(bodyElement)

  // 保存光标位置
  const cursorPos = saveCursorPosition()

  // 重新设置内容
  editorRef.value.resetBody(cleanedContent)

  // 恢复光标位置
  setTimeout(() => {
    restoreCursorPosition(cursorPos)
    // 触发保存
    if (editorRef.value) {
      editorRef.value.handleInput()
    }
    $tips.success('排版完成')
  }, 100)
}

/** 打开查找替换弹窗 */
function openFindReplace() {
  if (!editorRef.value) {
    $tips.error('编辑器未准备好')
    return
  }

  // 获取当前编辑器内容
  const content = editorRef.value.getBodyText()
  findReplacePopupRef.value?.show(content)
}

/** 处理查找替换 */
function handleFindReplace(findText: string, replaceText: string, isRegex: boolean, replaceAll: boolean) {
  if (!editorRef.value) {
    $tips.error('编辑器未准备好')
    return
  }

  // 获取纯文本内容
  const bodyText = editorRef.value.getBodyText()

  let newText = bodyText
  let matchCount = 0

  try {
    if (isRegex) {
      // 正则表达式模式
      const regex = new RegExp(findText, replaceAll ? 'g' : '')

      if (replaceAll) {
        // 替换全部
        newText = bodyText.replace(regex, replaceText)
        // 计算匹配数
        const matches = bodyText.match(regex)
        matchCount = matches ? matches.length : 0
      } else {
        // 只替换第一个
        if (regex.test(bodyText)) {
          newText = bodyText.replace(regex, replaceText)
          matchCount = 1
        }
      }
    } else {
      // 普通文本模式
      if (replaceAll) {
        // 替换全部
        const regex = new RegExp(findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
        newText = bodyText.replace(regex, replaceText)
        // 计算匹配数
        const matches = bodyText.match(regex)
        matchCount = matches ? matches.length : 0
      } else {
        // 只替换第一个
        const index = bodyText.indexOf(findText)
        if (index !== -1) {
          newText = bodyText.substring(0, index) + replaceText + bodyText.substring(index + findText.length)
          matchCount = 1
        }
      }
    }

    if (matchCount === 0) {
      $tips.error('未找到匹配内容')
      return
    }

    // 保存光标位置
    const cursorPos = saveCursorPosition()

    // 重置编辑器内容
    editorRef.value.resetBody(newText)

    // 替换后立即执行一键排版
    setTimeout(() => {
      if (!editorRef.value) return

      // 获取当前编辑器的body元素
      const bodyElement = editorRef.value.getBody()

      // 使用和保存时相同的处理逻辑进行排版
      const cleanedContent = getCleanedEditorContent(bodyElement)

      // 重新设置内容（已排版）
      editorRef.value.resetBody(cleanedContent)

      // 恢复光标位置
      setTimeout(() => {
        restoreCursorPosition(cursorPos)
        // 触发保存
        if (editorRef.value) {
          editorRef.value.handleInput()
        }
        $tips.success(`已替换 ${matchCount} 处并完成排版`)
      }, 50)
    }, 100)

  } catch (error) {
    $tips.error('正则表达式格式错误')
  }
}

</script>

<template>
<div class="container h-full w-full flex border-t border-color">
  <div class="sidebar flex flex-col w-[18rem] h-full bg-secondary border-r border-color">
    <!-- 搜索栏 -->
    <div class="search h-[2.7rem] flex items-center border-b border-color pl-4 font-bold text-tertiary text-[.9rem] cursor-text" @click="openSearchPopup">搜索章节</div>
    <!-- 操作按钮 -->
    <div class="operations flex h-10 items-center px-1 border-b border-color">
      <!-- 回到主页 -->
      <button class="button-m" title="回到主页" @click="goHome">🔙 返回</button>
      <!-- 占位符 -->
      <div class="flex-1"></div>
      <!-- 回收站 -->
      <button class="button-m" title="回收站" @click="openRecycleBin">🗑 回收站</button>
      <!-- 新建书籍 -->
      <button class="button-m" title="创建新文章" @click="creatreArticle">✏️ 新文章</button>
    </div>
    <div class="articleshelf flex-1 h-0 p-1" @click="handleArticleClick" @contextmenu="handleArticleContextmenu">
      <div class="scroll-container">
        <div class="article-item flex p-2 cursor-pointer transition-all select-none rounded m-2 border border-transparent hover:h4-color" :class="{
          'selected': isSelected(article),
          'dragging': draggedItem && draggedItem.id === article.id,
          'drag-over': dragOverIndex === index
        }" v-for="(article, index) in articles" :data-article-id="article.id" :key="article.id" draggable="true" @dragstart="handleDragStart($event, article)" @dragend="handleDragEnd" @dragover="handleDragOver($event, index)" @dragleave="handleDragLeave" @drop="handleDrop($event, index)">
          <span class="w-8">📜</span>
          <h4 class="whitespace-nowrap overflow-hidden text-ellipsis text-[.8rem] flex-1">{{ article.title }}</h4>
          <div class="count text-[.6rem] text-tertiary block mt-1">{{ article.wordCount }}</div>
        </div>
      </div>
    </div>
  </div>
  <div class="right-container flex-1 flex flex-col">
    <header class="toolbar flex h-[2.7rem] border-b border-color justify-between bg-secondary">
      <!-- 面包屑 -->
      <div class="breadcrumb h-full flex items-center">
        <span class="text-[1.2rem] block mt-[-.3rem]">📖</span>
        <span class="ml-2 text-[.8rem]">{{ selectedBookStore.v?.title }}</span>
      </div>
      <!-- 工具按钮 -->
      <div class="tools flex items-center mr-2">
        <button title="对当前文章进行排版" @click="handleFormat">✨ 一键排版</button>
        <button title="插入文本预设" @click="insertSnippetPopupRef.show">📋 插入预设</button>
        <button title="查找与替换" @click="openFindReplace">🔍 查找替换</button>
        <div class="button-group flex items-center ml-2 bg-tertiary rounded border border-color">
          <button title="回退 (Ctrl+Z)" :disabled="!historyStore.canUndo" @click="handleUndo" class="text-[1rem] p-[.19rem] m-0 disabled:opacity-30 disabled:cursor-not-allowed">
            ↩️
          </button>
          <button title="重做 (Ctrl+Y)" :disabled="!historyStore.canRedo" @click="handleRedo" class="text-[1rem] p-[.19rem] m-0 disabled:opacity-30 disabled:cursor-not-allowed">
            ↪️
          </button>
        </div>
        <button title="章节的历史操作记录" @click="showHistoryPopup">🕒 历史</button>
        <button title="导出备份文件和从备份文件导入" @click="openImportExportPopup">💾 导入导出</button>
        <button title="软件设置" @click="openSettings">⚙️ 配置</button>
      </div>
    </header>
    <div class="bottom flex flex-1 h-0">
      <!-- 编辑器 -->
      <Editor :updateThrottleTime="3000" ref="editorRef" @update:article-title="handleSaveArticleTitle" @update:article-body="saveArticle" @undo="handleUndo" @redo="handleRedo" />
      <!-- 工具窗口 -->
      <div class="utils-drawer flex" v-show="settingStore.rutilsTitle" ref="rutilsRef">
        <div class="split-line w-2 bg-secondary cursor-col-resize border-l border-r border-color" @mousedown="handleSplitLineMousedown"></div>
        <NameGeneratorTool v-show="settingStore.rutilsTitle === rutilsTitles[0]" />
        <ProofreadTool v-show="settingStore.rutilsTitle === rutilsTitles[1]" ref="proofreadToolRef" :getEditorBody="() => editorRef?.getBodyText()" :applyTextFix="handleProofreadFix" @apply-fix="handleProofreadFix" />
        <EntityManager v-show="settingStore.rutilsTitle === rutilsTitles[2]" />
        <AiSuggestionTool v-show="settingStore.rutilsTitle === rutilsTitles[3]" />
        <DraftManager v-show="settingStore.rutilsTitle === rutilsTitles[4]" :bookId="selectedBookStore.v?.id || ''" />
        <HistorySidebar v-show="settingStore.rutilsTitle === rutilsTitles[5]" ref="historySidebarRef" @restore="handleRestoreFromHistory" />
      </div>
      <!-- 侧边工具栏 -->
      <div class="utils-panel vertical-text w-[2.7rem] pt-2 border-l bg-secondary overflow-y-hidden" @click="HandleUtilsPanelButtonsClick">
        <button :class="{ selected: settingStore.rutilsTitle === rt }" class="bg-tertiary p-2 px-1 pb-2 mb-2 mr-2 rounded border border-color" v-for="rt in rutilsTitles">{{ rt }}</button>
      </div>
    </div>
  </div>
</div>
<!-- 右键菜单 -->
<ContextMenu ref="articleContextMenuRef" />
<!-- 插入预设弹出层 -->
<InsertSnippetPopup ref="insertSnippetPopupRef" @insert="handleInsertSnippet" />
<!-- 历史记录弹出层 -->
<HistoryViewPopup ref="historyViewPopupRef" @undo="handleUndo" @redo="handleRedo" />
<!-- 文章回收站弹出层 -->
<RecycleBinArticlePopup ref="recycleBinArticlePopupRef" @restored="handleArticleRestored" />
<!-- 搜索文章弹出层 -->
<SearchArticlePopup ref="searchArticlePopupRef" @select="handleSearchSelectArticle" />
<!-- 查找替换弹出层 -->
<FindReplacePopup ref="findReplacePopupRef" @replace="handleFindReplace" />

<!-- 导入导出弹出层 -->
<Popup ref="importExportPopupRef" title="💾 文章导入导出">
  <div class="import-export-container max-w-[700px] mx-auto">
    <!-- 导入文章 -->
    <div class="section mb-6">
      <h3 class="text-primary mb-3 text-[1rem]">📂 导入文章</h3>
      <ArticleImportExport :bookId="selectedBookStore.v?.id || ''" @importSuccess="handleImportSuccess" />
    </div>

    <div class="divider h-px bg-border-color my-6"></div>

    <!-- 导出文章 -->
    <div class="section mb-6">
      <h3 class="text-primary mb-3 text-[1rem]">💾 导出文章</h3>
      <p class="description text-secondary text-[0.85rem] leading-normal mb-3">
        导出当前选中的文章或所有文章为 JSON 文件
      </p>
      <div class="button-group flex gap-2">
        <button @click="exportCurrentArticle" class="btn-primary px-4 py-2 bg-primary text-white border-none rounded cursor-pointer text-[0.875rem] flex-1">📝 导出当前文章</button>
        <button @click="exportAllArticles" class="btn-primary px-4 py-2 bg-primary text-white border-none rounded cursor-pointer text-[0.875rem] flex-1">📚 导出所有文章</button>
      </div>
    </div>
  </div>
</Popup>
</template>

<style scoped>
/* 保留复杂样式和伪类选择器 */
.book-item>div>:nth-child(1) {
  color: var(--text-primary);
  margin-top: .25rem;
}

.book-item>div>:nth-child(2) {
  font-size: .8rem;
  margin-top: .6rem;
}

.book-item>div>:nth-child(3) {
  font-size: .8rem;
  margin-top: .6rem;
  line-height: 1.4rem;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  word-break: break-all;
}

.operations button {
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  background-color: var(--background-tertiary);
  margin-right: 0.5rem;
  border: 1px solid var(--border-color);
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
}

.operations button:last-child {
  margin-right: 0;
}

.operations button:hover:not(:disabled) {
  opacity: 0.6;
}

.tools>button {
  margin-left: 0.5rem;
  background-color: var(--background-tertiary);
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  border: 1px solid var(--border-color);
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
}

.tools>button:hover:not(:disabled) {
  opacity: 0.6;
}

.utils-panel button {
  background-color: var(--background-tertiary);
  padding: .5rem .1rem .5rem .25rem !important;
  border-radius: 0.25rem;
  margin-bottom: 0.5rem;
  margin-right: 0.5rem;
  border: 1px solid var(--border-color);
  cursor: pointer;
  transition: all 0.2s;
}

.utils-panel button.selected {
  background-color: var(--primary-dark);
  color: var(--text-primary);
}

.article-item h4 {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: .8rem;
  flex: 1;
}

.article-item:hover h4 {
  color: var(--primary-light);
}

.article-item.selected h4 {
  color: var(--primary);
}

.article-item.dragging {
  opacity: 0.5;
}

.article-item.drag-over {
  border-top: 2px solid var(--primary);
  margin-top: 2px;
}

.vertical-text {
  writing-mode: vertical-rl;
  text-orientation: sideways;
  white-space: nowrap;
  display: inline-block;
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 1rem;
  user-select: text;
}

::v-deep(.utils-drawer>*:nth-child(2)) {
  flex: 1;
  width: 0;
}

.button-m {
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  background-color: var(--background-tertiary);
  font-size: 0.85rem;
  border: 1px solid var(--border-color);
  cursor: pointer;
  transition: all 0.2s;
}

.button-m:hover:not(:disabled) {
  opacity: 0.6;
}

.btn-primary {
  padding: 0.5rem 1rem;
  background-color: var(--primary);
  color: white;
  border: none;
  border-radius: 0.25rem;
  cursor: pointer;
  font-size: 0.875rem;
  transition: background-color 0.2s;
  flex: 1;
}

.btn-primary:hover:not(:disabled) {
  opacity: 0.9;
}
</style>
