<script setup lang="ts">
import SettingPopup from '@/components/SettingPopup.vue'
import InsertSnippetPopup from '@/components/InsertSnippetPopup.vue'
import HistoryViewPopup from '@/components/HistoryViewPopup.vue'
import HistorySidebar from '@/components/HistorySidebar.vue'
import SearchArticlePopup from '@/components/SearchArticlePopup.vue'
import DraftManager from '@/components/DraftManager.vue'
import OutlineNavigator from '@/components/OutlineNavigator.vue'
import { articledb, bookdb } from '@/db.ts'
import { getDefaultArticle } from '@/defaultObjects'
import { $tips } from '@/plugins/notyf'
import router from '@/router.ts'
import { useEntityStore } from '@/stores/EntitysStore'
import { useSelectedArticleStore } from '@/stores/SelectedArticleStore.ts'
import { useSelectedBookStore } from '@/stores/SelectedBookStore.ts'
import { useSettingStore } from '@/stores/SettingStore.ts'
import { useHistoryStore } from '@/stores/HistoryStore'
import type { Article, ArticleBody } from '@/types.ts'
import { countNonWhitespace, exportTxt, getCleanedEditorContent, trimAndReduceNewlines, waitFor, insertText } from '@/utils.ts'
import { defineAsyncComponent, onMounted, onUnmounted, ref } from 'vue'

// 懒加载组件
const ContextMenu = defineAsyncComponent(() => import('@/components/ContextMenu.vue'))
const Editor = defineAsyncComponent(() => import('@/components/Editor.vue'))
const EntityManager = defineAsyncComponent(() => import('@/components/EntityManager.vue'))
const RecycleBinArticlePopup = defineAsyncComponent(() => import('@/components/RecycleBinArticlePopup.vue'))

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

/** 设置弹出层 */
const settingPopupRef = ref<InstanceType<typeof SettingPopup> | null>(null)

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

const eneityManagerRef = ref(null)

/** 右边侧栏工具按钮标题 列表 */
const rutilsTitles = ['✒️ 取名工具', '✅ 校对', '📁 实体管理', '📝 草稿', '📋 大纲', '⏱️ 历史版本']

onMounted(() => {
  loadArticles()
  settingStore.setEditorWidthMode()
  rutilsRef.value.style.width = `${settingStore.drawerWidth}px`
  useEntityStore().load(selectedBookStore.v.id)
  // 监听快捷键
  document.addEventListener('keydown', handleGlobalKeydown)
})

onUnmounted(() => {
  // 移除全局监听器
  document.removeEventListener('keydown', handleGlobalKeydown)
})

/** 全局快捷键监听 */
function handleGlobalKeydown(e: KeyboardEvent) {
  const keys: string[] = []
  if (e.ctrlKey || e.metaKey) keys.push('Ctrl')
  if (e.altKey) keys.push('Alt')
  if (e.shiftKey) keys.push('Shift')
  keys.push(e.key.toUpperCase())

  const shortcut = keys.join('+')

  // 搜索快捷键
  if (shortcut === settingStore.shortcutKeys.search) {
    e.preventDefault()
    openSearchPopup()
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

      let index = articles.value.findIndex(article => article.id === id) - 1
      articles.value = articles.value.filter(article => article.id !== id)
      if (selectedArticleStore.v.id !== id) return

      if (articles.value.length === 0) {
        creatreArticle()
      } else {
        selectedArticleStore.v = articles.value[Math.max(0, index)]
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

  articleBody.value.content = getCleanedEditorContent(editorRef.value.getBody())
  selectedArticleStore.v.modifiedTime = Date.now()
  selectedArticleStore.v.wordCount = countNonWhitespace(text)
  selectedBookStore.v.modifiedTime = Date.now()

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

  // 更新历史侧栏的当前文本
  if (historySidebarRef.value) {
    historySidebarRef.value.setCurrentText(text)
  }

  // 如果不是从撤销/重做触发的，则记录历史
  if (!skipHistory) {
    console.log('正常保存，记录历史')
    // 正常编辑保存，会在 Editor.vue 的 _emitUpdate 中自动记录
  } else {
    console.log('撤销/重做保存，跳过历史记录')
    // 撤销/重做，不创建新的历史记录
  }
}

async function handleArticleClick(e: MouseEvent) {
  const articleItem = e.target instanceof Element ? (e.target as Element).closest<HTMLElement>('.article-item') : null
  if (!articleItem) return
  const id = articleItem.dataset.articleId
  const article = articles.value.find(article => article.id === id)
  if (article) {
    if (editorRef.value) {
      saveArticle(editorRef.value.getBodyText())
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
  articledb.getArticleBody(article.id).then(res => {
    selectedArticleStore.v = article
    articleBody.value = res

    // 等待编辑器成功加载后再设置内容
    waitFor(() => editorRef.value, () => {
      if (editorRef.value) {
        editorRef.value.resetBody(res.content)
        // 初始化历史记录（会自动加载历史列表）
        historyStore.initArticle(article.id, res.content || '')
        // 更新历史侧栏的当前文本
        if (historySidebarRef.value) {
          historySidebarRef.value.setCurrentText(res.content || '')
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
function handleUndo() {
  if (editorRef.value && historyStore.canUndo) {
    editorRef.value.undo()
  }
}

/** 重做 */
function handleRedo() {
  if (editorRef.value && historyStore.canRedo) {
    editorRef.value.redo()
  }
}

/** 显示历史记录弹窗 */
function showHistoryPopup() {
  historyViewPopupRef.value?.show()
}

/** 从历史版本恢复 */
async function handleRestoreFromHistory(text: string) {
  if (!text || typeof text !== 'string') {
    console.error('无效的文本内容')
    return
  }

  if (editorRef.value && selectedArticleStore.v) {
    console.log('从历史版本恢复，更新编辑器内容')
    // 直接重置编辑器内容
    editorRef.value.resetBody(text)

    // 保存到数据库，但不创建新的历史记录
    saveArticle(text, undefined, true)

    // 更新历史侧栏的当前文本
    if (historySidebarRef.value) {
      historySidebarRef.value.setCurrentText(text)
    }
  }
}

/** 大纲插入 */
function handleOutlineInsert(markdown: string) {
  if (editorRef.value) {
    // 获取当前编辑器内容
    const currentContent = editorRef.value.getBodyText()
    // 插入markdown到当前光标位置或末尾
    insertText(markdown + '\n\n')
    // 触发保存
    setTimeout(() => {
      if (editorRef.value) {
        editorRef.value.handleInput()
      }
    }, 100)
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

</script>

<template>
  <div class="container">
    <div class="sidebar">
      <!-- 搜索栏 -->
      <div class="search" @click="openSearchPopup">搜索章节</div>
      <!-- 操作按钮 -->
      <div class="operations">
        <!-- 回到主页 -->
        <button class="button-m" title="回到主页" @click="goHome">🔙 返回</button>
        <!-- 占位符 -->
        <div style="flex: 1;"></div>
        <!-- 自定义 -->
        <button class="button-m" title="自定义">🛠️ 自定义</button>
        <!-- 回收站 -->
        <button class="button-m" title="回收站" @click="openRecycleBin">🗑 回收站</button>
        <!-- 新建书籍 -->
        <button class="button-m" title="创建新文章" @click="creatreArticle">✏️ 新文章</button>
      </div>
      <div class="articleshelf" @click="handleArticleClick" @contextmenu="handleArticleContextmenu">
        <div class="scroll-container">
          <div class="article-item" :class="{
            'selected': isSelected(article),
            'dragging': draggedItem && draggedItem.id === article.id,
            'drag-over': dragOverIndex === index
          }" v-for="(article, index) in articles" :data-article-id="article.id" :key="article.id" draggable="true" @dragstart="handleDragStart($event, article)" @dragend="handleDragEnd" @dragover="handleDragOver($event, index)" @dragleave="handleDragLeave" @drop="handleDrop($event, index)">
            <span>📜</span>
            <h4>{{ article.title }}</h4>
            <div class="count">{{ article.wordCount }}</div>
          </div>
        </div>
      </div>
    </div>
    <div class="right-container">
      <header class="toolbar">
        <!-- 面包屑 -->
        <div class="breadcrumb">
          <span style="font-size: 1.2rem; display: block; margin-top: -.3rem;">📖</span>
          <button style="padding: .5rem .1rem .5rem .5rem;" title="书籍信息">斗破苍穹</button>
        </div>
        <!-- 工具按钮 -->
        <div class="tools">
          <button title="设置段落间距和字体等">🔤 段落和字体</button>
          <button title="对当前文章进行排版">✨ 一键排版</button>
          <button title="插入文本预设" @click="insertSnippetPopupRef.show">📋 插入预设</button>
          <button title="查找与替换">🔍 查找替换</button>
          <div class="button-group">
            <button title="回退(Ctrl+Z)" :disabled="!historyStore.canUndo" @click="handleUndo">
              ↩️
            </button>
            <button title="重做(Ctrl+Y)" :disabled="!historyStore.canRedo" @click="handleRedo">
              ↪️
            </button>
          </div>
          <button title="章节的历史操作记录" @click="showHistoryPopup">🕒 历史</button>
          <button title="导出备份文件和从备份文件导入">💾 导入导出</button>
          <button title="软件设置" @click="settingPopupRef.show">⚙️ 配置</button>
        </div>
      </header>
      <div class="bottom">
        <!-- 编辑器 -->
        <Editor :updateThrottleTime="3000" ref="editorRef" @update:article-title="handleSaveArticleTitle" @update:article-body="saveArticle" v-if="selectedArticleStore.v" />
        <!-- 工具窗口 -->
        <div class="utils-drawer" v-show="settingStore.rutilsTitle" ref="rutilsRef">
          <div class="split-line" @mousedown="handleSplitLineMousedown"></div>
          <EntityManager v-show="settingStore.rutilsTitle === rutilsTitles[2]" />
          <DraftManager v-show="settingStore.rutilsTitle === rutilsTitles[3]" :bookId="selectedBookStore.v?.id || ''" />
          <OutlineNavigator v-show="settingStore.rutilsTitle === rutilsTitles[4]" :articleId="selectedArticleStore.v?.id || ''" @insert="handleOutlineInsert" />
          <HistorySidebar v-show="settingStore.rutilsTitle === rutilsTitles[5]" ref="historySidebarRef" @restore="handleRestoreFromHistory" />
        </div>
        <!-- 侧边工具栏 -->
        <div class="utils-panel vertical-text" @click="HandleUtilsPanelButtonsClick">
          <button :class="{ selected: settingStore.rutilsTitle === rt }" v-for="rt in rutilsTitles">{{ rt }}</button>
        </div>
      </div>
    </div>
  </div>
  <!-- 右键菜单 -->
  <ContextMenu ref="articleContextMenuRef" />
  <!-- 设置弹出层 -->
  <SettingPopup ref="settingPopupRef" />
  <!-- 插入预设弹出层 -->
  <InsertSnippetPopup ref="insertSnippetPopupRef" @insert="handleInsertSnippet" />
  <!-- 历史记录弹出层 -->
  <HistoryViewPopup ref="historyViewPopupRef" @restore="() => { }" />
  <!-- 文章回收站弹出层 -->
  <RecycleBinArticlePopup ref="recycleBinArticlePopupRef" @restored="handleArticleRestored" />
  <!-- 搜索文章弹出层 -->
  <SearchArticlePopup ref="searchArticlePopupRef" @select="handleSearchSelectArticle" />
</template>

<style scoped>
.container {
  height: 100%;
  width: 100%;
  display: flex;
  border-top: 1px solid var(--border-color);
}

.sidebar {
  display: flex;
  flex-direction: column;
  width: 18rem;
  height: 100%;
  background-color: var(--background-secondary);
  border-right: 1px solid var(--border-color);
}

.search {
  height: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: start;
  border-bottom: 1px solid var(--border-color);
  padding-left: .5rem;
  color: var(--text-tertiary);
  font-size: .9rem;
  cursor: text;
}

.operations {
  display: flex;
  height: 2.2rem;
  align-items: center;
  padding: 0 .25rem;
  border-bottom: 1px solid var(--border-color);
}

.operations button {
  padding: .2rem .25rem;
  border-radius: .25rem;
  background-color: var(--background-tertiary);
  margin-right: .25rem;
}

.operations button:last-child {
  margin-right: 0;
}

.bookshelf {
  flex: 1;
  height: 0;
  padding: .5rem 0;
}

.book-item {
  display: flex;
  align-items: start;
  cursor: pointer;
  border-radius: .25rem;
  padding: .5rem;
  margin: 0 .25rem .25rem .25rem;
}

.book-item.checked {
  background-color: var(--background-tertiary);
}

.book-item .cover {
  height: 8rem;
  width: 5rem;
  border-radius: .25rem;
  margin-right: .5rem;
  overflow: hidden;
}

.book-item .cover img {
  height: 100%;
  width: 100%;
}

.bookInfo {
  display: flex;
  flex-direction: column;
  flex: 1;
  width: 0;
}

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

.right-container {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.toolbar {
  display: flex;
  height: 2.5rem;
  border-bottom: 1px solid var(--border-color);
  justify-content: space-between;
  background-color: var(--background-secondary);
}

.breadcrumb {
  height: 100%;
  display: flex;
  align-items: center;
}

.breadcrumb span {
  display: block;
  margin-left: .5rem;
  font-size: .8rem;
}

.tools {
  display: flex;
  align-items: center;
  margin-right: .5rem;
}

.tools>button {
  margin-left: .5rem;
  background-color: var(--background-tertiary);
  padding: .25rem;
  border-radius: .25rem;
}

.button-group {
  display: flex;
  align-items: center;
  margin-left: .5rem;
  background-color: var(--background-tertiary);
  padding: .19rem .25rem;
  border-radius: .25rem;
}

.button-group button {
  font-size: 1rem;
}

.button-group button:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.right-container .bottom {
  display: flex;
  flex: 1;
  height: 0;
}

.utils-panel {
  width: 2.5rem;
  padding-top: .5rem;
  border-left: 1px solid var(--border-color);
  background-color: var(--background-secondary);
  overflow-y: hidden;
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

.utils-panel button {
  background-color: var(--background-tertiary);
  padding: .19rem .25rem;
  border-radius: .25rem;
  margin-bottom: .5rem;
  margin-right: .35rem;
}


.utils-panel button.selected {
  background-color: var(--primary-dark);
  color: var(--text-primary);
}

.articleshelf {
  flex: 1;
  height: 0;
  padding: .25rem 0;
}

.article-item {
  display: flex;
  padding: .5rem;
  cursor: move;
  transition: all 0.2s;
  user-select: none;
}

.article-item.dragging {
  opacity: 0.5;
}

.article-item.drag-over {
  border-top: 2px solid var(--primary);
  margin-top: 2px;
}

.article-item:hover h4 {
  color: var(--primary-light);
}

.article-item .count {
  font-size: .6rem;
  color: var(--text-tertiary);
  display: block;
  margin-top: .25rem;
}

.article-item.selected {
  background-color: var(--background-tertiary);
}

.article-item.selected h4 {
  color: var(--primary);
}

.article-item span {
  width: 2rem;
}

.article-item h4 {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: .8rem;
  cursor: pointer;
  flex: 1;
}

.utils-drawer {
  display: flex;
}

.utils-drawer .split-line {
  width: .5rem;
  background-color: var(--background-secondary);
  cursor: col-resize;
  border-left: 1px solid var(--border-color);
  border-right: 1px solid var(--border-color);
}

::v-deep(.utils-drawer>*:nth-child(2)) {
  flex: 1;
  width: 0;
}
</style>
