<script setup lang="ts">
import { $confirm, $tips } from '@app/plugins'
import router from '@app/router'
import { useSelectedBookStore } from '@domains/library/stores/selected-book.store'
import { useSettingStore } from '@domains/settings/stores/settings.store'
import { articledb, bookdb, entitydb, importExportdb } from '@shared/db'
import type { Book } from '@shared/types'
import { getImageByID } from '@shared/utils'
import { event_emit } from '@shared/utils/event-bus'
import { defineAsyncComponent, onMounted, ref } from 'vue'

// 懒加载组件
const ContextMenu = defineAsyncComponent(() => import('@shared/components/ContextMenu.vue'))
const EditBookPopup = defineAsyncComponent(() => import('@shared/components/EditBookPopup.vue'))
const RecycleBinBookPopup = defineAsyncComponent(() => import('@domains/library/components/RecycleBinBookPopup.vue'))
const BookImportExport = defineAsyncComponent(() => import('@domains/library/components/BookImportExport.vue'))
const ConfigImportExport = defineAsyncComponent(() => import('@domains/settings/components/ConfigImportExport.vue'))
const Popup = defineAsyncComponent(() => import('@shared/components/Popup.vue'))


/** 当前是否在主页，只有主页和书籍详情页两种状态 */
const onHome = ref(true)
/** 主题状态管理器 */
const settingStore = useSettingStore()
/** 所有书籍 */
const books = ref<Book[]>([])
/** 当前用户选中的书籍 */
const selectedBookStore = useSelectedBookStore()
/** 书籍右键菜单Ref */
const bookContextMenuRef = ref(null)
/** 单击选中的书籍 */
const clickSelectedBook = ref<Book | null>(null)
/** 编辑书籍弹出层 */
const updateBookPopupRef = ref(null)
/** 创建书籍弹出层 */
const createBookPopupRef = ref(null)
/** 书籍回收站弹出层 */
const recycleBinBookPopupRef = ref(null)
/** 导入导出弹出层 */
const importExportPopupRef = ref(null)
/** 书籍统计数据 */
const bookStats = ref<{
  totalBooks: number
  totalWords: number
  recentUpdated: number
}>({
  totalBooks: 0,
  totalWords: 0,
  recentUpdated: 0
})
/** 当前选中书籍的详细统计 */
const selectedBookStats = ref<{
  articleCount: number
  deletedArticleCount: number
  totalWords: number
  entityCount: number
  entityTypes: Record<string, number>
  articles: any[]
}>({
  articleCount: 0,
  deletedArticleCount: 0,
  totalWords: 0,
  entityCount: 0,
  entityTypes: {},
  articles: []
})

/** 右键菜单选中的书籍 */
let rightSelectedBook: Book | null = null

/** 每本书的统计信息缓存 */
const booksStatsCache = ref<Record<string, { wordCount: number, articleCount: number }>>({})
/** 封面图片URL缓存 */
const bookCoverUrls = ref<Map<string, string>>(new Map())

/** 书籍的右键菜单功能 */
const bookContextMenuHanders = {
  open() {
    selectedBookStore.v = rightSelectedBook
    router.push('/Edit')
  },
  delete() {
    bookdb.softDeleteBook(rightSelectedBook.id).then(res => {
      if (res.success) {
        $tips.success(`删除成功，回收站中可找回`)
        books.value = books.value.filter(book => book.id !== rightSelectedBook.id)
        if (selectedBookStore.v === rightSelectedBook) {
          clickSelectedBook.value = selectedBookStore.v = null
        }
      } else {
        $tips.error(`删除书籍失败, ${res.message}`)
      }
    })
  },
  edit() {
    updateBookPopupRef.value.show(rightSelectedBook, 'edit')
  },
  async exportTxt() {
    if (!rightSelectedBook) return

    try {
      // 获取书籍的所有文章
      const articles = await articledb.getBookArticles(rightSelectedBook.id)

      // 按排序顺序排列
      articles.sort((a, b) => a.sortOrder - b.sortOrder)

      // 获取所有文章内容
      let fullContent = `${rightSelectedBook.title}

${rightSelectedBook.description}

`
      fullContent += '='.repeat(50) + '\n\n'

      for (const article of articles) {
        const body = await articledb.getArticleBody(article.id)
        fullContent += `### ${article.title}\n\n`
        fullContent += (body?.content || '') + '\n\n'
        fullContent += '-'.repeat(50) + '\n\n'
      }

      // 下载文件
      const blob = new Blob([fullContent], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${rightSelectedBook.title}_${Date.now()}.txt`
      a.click()
      URL.revokeObjectURL(url)

      $tips.success('导出TXT成功')
    } catch (err: any) {
      $tips.error(`导出失败: ${err.message}`)
    }
  },
  async exportBackup() {
    if (!rightSelectedBook) return

    try {
      const data = await importExportdb.exportBook(rightSelectedBook.id)
      if (!data) {
        $tips.error('导出书籍数据失败')
        return
      }

      const jsonStr = JSON.stringify(data, null, 2)
      const blob = new Blob([jsonStr], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${rightSelectedBook.title}_backup_${Date.now()}.json`
      a.click()
      URL.revokeObjectURL(url)

      $tips.success(`已导出书籍《${rightSelectedBook.title}》`)
    } catch (err: any) {
      $tips.error(`导出失败: ${err.message}`)
    }
  }
}

onMounted(async () => {
  await loadBooks()
  await loadBookStats()
})

function bookIdEqual(book: Book) {
  return book && clickSelectedBook.value && book.id === clickSelectedBook.value.id
}

function handleBookDoubleClick(book: Book) {
  selectedBookStore.v = book
  router.push('/Edit')
}

function handleBookItemContextMenu(e: MouseEvent, book: Book) {
  e.preventDefault()

  rightSelectedBook = book

  bookContextMenuRef.value.show(e, [
    { title: '📂 打开', callback: bookContextMenuHanders.open },
    { title: '🗑️ 删除', callback: bookContextMenuHanders.delete },
    { title: '✏️ 编辑', callback: bookContextMenuHanders.edit },
    { title: '📄 导出为TXT', callback: bookContextMenuHanders.exportTxt },
    { title: '💾 下载ZIP备份', callback: bookContextMenuHanders.exportBackup },
  ])
}


async function handleClickBookItem(book: Book) {
  onHome.value = false
  clickSelectedBook.value = book
  await loadSelectedBookStats(book)
}

function goHome() {
  onHome.value = true
  clickSelectedBook.value = selectedBookStore.v = null
}

function openAddBookDialog() {
  createBookPopupRef.value.show()
}

function addBook(book: Book) {
  bookdb.createBook(book).then(res => {
    if (res.success) {
      books.value.unshift(book)
    } else {
      $tips.error(`创建书籍失败, ${res.message}`)
    }
  })
}

/** 打开书籍回收站 */
function openRecycleBin() {
  recycleBinBookPopupRef.value?.show()
}

/** 处理书籍恢复 */
function handleBookRestored(book: Book) {
  // 重新加载书籍列表
  loadBooks()
  $tips.success(`书籍《${book.title}》已恢复`)
}

function updateBook(book: Book) {
  rightSelectedBook.description = book.description
  rightSelectedBook.title = book.title
  rightSelectedBook.coverId = book.coverId

  bookdb.updateBook(rightSelectedBook).then(res => {
    if (!res.success) {
      return $tips.error(`更新书籍失败: ${res.message}`)
    }
  })
}

async function loadBooks() {
  try {
    const res = await bookdb.getAllBooks()
    res.sort((a, b) => b.modifiedTime - a.modifiedTime)
    books.value = res

    // 加载每本书的统计信息
    await loadBooksStats()

    // 加载封面图片
    await loadBookCovers()
  } catch (err: any) {
    $tips.error(`获取书籍列表失败, ${err.message}`)
  }
}

/** 加载书籍封面 */
async function loadBookCovers() {
  for (const book of books.value) {
    const url = await getImageByID(book.coverId)
    bookCoverUrls.value.set(book.id, url)
  }
}

/** 获取书籍封面URL */
function getBookCoverUrl(bookId: string): string {
  return bookCoverUrls.value.get(bookId) || '/cover/default.png'
}

/** 加载所有书籍的统计信息 */
async function loadBooksStats() {
  for (const book of books.value) {
    const articles = await articledb.getBookArticles(book.id)
    const wordCount = articles.reduce((sum, art) => sum + (art.wordCount || 0), 0)
    booksStatsCache.value[book.id] = {
      wordCount,
      articleCount: articles.length
    }
  }
}

/** 获取书籍统计信息 */
function getBookStats(bookId: string) {
  return booksStatsCache.value[bookId] || { wordCount: 0, articleCount: 0 }
}

/** 加载总览统计数据 */
async function loadBookStats() {
  try {
    const allBooks = books.value
    bookStats.value.totalBooks = allBooks.length

    // 计算总字数和最近更新数
    let totalWords = 0
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    let recentCount = 0

    for (const book of allBooks) {
      const articles = await articledb.getBookArticles(book.id)
      totalWords += articles.reduce((sum, art) => sum + (art.wordCount || 0), 0)

      if (book.modifiedTime > oneWeekAgo) {
        recentCount++
      }
    }

    bookStats.value.totalWords = totalWords
    bookStats.value.recentUpdated = recentCount
  } catch (err: any) {
    console.error('加载统计数据失败:', err)
  }
}

/** 加载选中书籍的详细统计 */
async function loadSelectedBookStats(book: Book) {
  try {
    // 获取文章列表
    const articles = await articledb.getBookArticles(book.id, true)
    const activeArticles = articles.filter(a => a.deletedTime === 0)
    const deletedArticles = articles.filter(a => a.deletedTime !== 0)

    // 计算总字数
    const totalWords = activeArticles.reduce((sum, art) => sum + (art.wordCount || 0), 0)

    // 获取实体统计
    const entities = await entitydb.getBookEntities(book.id)
    const entityTypes: Record<string, number> = {}
    entities.forEach(entity => {
      if (!entityTypes[entity.type]) {
        entityTypes[entity.type] = 0
      }
      entityTypes[entity.type]++
    })

    selectedBookStats.value = {
      articleCount: activeArticles.length,
      deletedArticleCount: deletedArticles.length,
      totalWords,
      entityCount: entities.length,
      entityTypes,
      articles: activeArticles.sort((a, b) => b.modifiedTime - a.modifiedTime)
    }
  } catch (err: any) {
    console.error('加载书籍统计失败:', err)
  }
}

/** 格式化时间显示 */
function formatTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  const days = Math.floor(diff / (24 * 60 * 60 * 1000))

  if (days === 0) return '今天'
  if (days === 1) return '昨天'
  if (days < 7) return `${days}天前`
  if (days < 30) return `${Math.floor(days / 7)}周前`
  if (days < 365) return `${Math.floor(days / 30)}个月前`
  return `${Math.floor(days / 365)}年前`
}

/** 格式化日期 */
function formatDate(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/** 打开文章编辑器 */
function openArticle(article: any) {
  // TODO: 跳转到编辑器并加载文章
  console.log('打开文章:', article)
}

/** 打开导入导出弹窗 */
function openImportExportPopup() {
  importExportPopupRef.value?.show()
}

/** 导入成功回调 */
function handleImportSuccess() {
  // 重新加载书籍列表
  loadBooks()
  importExportPopupRef.value?.close()
}

/** 配置导入成功回调 */
function handleConfigImportSuccess() {
  // 配置导入后无需关闭弹窗，用户可以继续操作
  // 已经通过 tips 提示用户需要刷新页面
}

/** 导出全库 */
async function exportFullDatabase() {
  try {
    const confirmed = await $confirm('确定要导出整个数据库吗？将包含所有书籍、文章和实体数据。')
    if (!confirmed) return

    const data = await importExportdb.exportFullDatabase()
    if (!data) {
      $tips.error('导出失败')
      return
    }

    const jsonStr = JSON.stringify(data, null, 2)
    const blob = new Blob([jsonStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `musepocket_full_backup_${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)

    $tips.success(`成功导出全库数据（${data.books.length}本书籍，${data.articles.length}篇文章）`)
  } catch (err: any) {
    if (err !== false) {
      $tips.error(`导出失败: ${err.message}`)
    }
  }
}

/** 导入全库（合并模式） */
async function importFullDatabaseMerge() {
  try {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'

    input.onchange = async (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      const reader = new FileReader()
      reader.onload = async (event) => {
        try {
          const content = event.target?.result as string
          const data = JSON.parse(content)

          const hasConfigs = data.configs && (data.configs.models?.length || data.configs.prompts?.length || data.configs.textSnippets?.length)
          const configText = hasConfigs ? '和配置' : ''

          const confirmed = await $confirm(`确定要导入全库数据吗？将合并${data.books?.length || 0}本书籍、${data.articles?.length || 0}篇文章${configText}。`)
          if (!confirmed) return

          const result = await importExportdb.importFullDatabase(data, { merge: true, includeConfigs: true })
          if (result.success) {
            if (hasConfigs) {
              $tips.success('全库数据导入成功，请刷新页面以应用配置更改')
            } else {
              $tips.success('全库数据导入成功')
            }
            loadBooks()
          } else {
            $tips.error(`导入失败: ${result.message}`)
          }
        } catch (err: any) {
          $tips.error(`导入失败: ${err.message}`)
        }
      }
      reader.readAsText(file)
    }

    input.click()
  } catch (err: any) {
    if (err !== false) {
      $tips.error(`导入失败: ${err.message}`)
    }
  }
}

/** 打开设置弹窗 */
function openSettings() {
  event_emit('openSettings')
}

</script>

<template>
<div class="left-container h-full w-full flex border-t border-color">
  <div class="sidebar flex flex-col w-[18rem] h-full bg-secondary border-r border-color">
    <!-- 搜索栏 -->
    <div class="logo h-[2.7rem] flex items-center justify-center p-2 text-primary text-[1.2rem] font-bold tracking-[.12rem] border-b border-color">
      灵感口袋（MusePocket）
    </div>
    <!-- 操作按钮 -->
    <div class="operations flex h-10 items-center px-1 border-b border-color">
      <!-- 导入导出 -->
      <button class="button-m" title="导入导出" @click="openImportExportPopup">📥 导入导出</button>
      <!-- 回收站 -->
      <button class="button-m" title="回收站" @click="openRecycleBin">🗑 回收站</button>
      <!-- 占位符 -->
      <div class="flex-1"></div>
      <!-- 新建书籍 -->
      <button class="button-m" title="创建新书籍" @click="openAddBookDialog">📓 新书</button>
    </div>
    <div class="bookshelf flex-1 h-0 p-2">
      <div class="scroll-container">
        <!-- 单个书籍项（示例） -->
        <div class="book-item flex items-start cursor-pointer rounded p-2 m-2 transition-all border hover:bg-tertiary hover:border-color" :class="{ 'checked': bookIdEqual(book) }" v-for="book in books" :key="book.id" @contextmenu="handleBookItemContextMenu($event, book)" @click="handleClickBookItem(book)" @dblclick="handleBookDoubleClick(book)">
          <!-- 封面占位 -->
          <div class="cover h-16 w-10 mr-2 overflow-hidden">
            <img :src="getBookCoverUrl(book.id)" alt="封面" class="cover-img h-full w-full object-cover rounded"></img>
          </div>
          <!-- 书籍信息 -->
          <div class="bookInfo flex flex-col flex-1 w-0">
            <h4>{{ book.title }}</h4>
            <p class="text-[0.8rem] mt-2">{{ getBookStats(book.id).wordCount }}字 | {{ formatTime(book.modifiedTime) }}更新</p>
            <p class="book-desc text-[0.8rem] mt-2 leading-[1.4rem] line-clamp-2 overflow-hidden text-ellipsis word-break-break-all">{{ book.description }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div class="right-container flex-1 flex flex-col">
    <header class="toolbar flex h-[2.7rem] border-b border-color justify-between bg-secondary">
      <!-- 面包屑 -->
      <div class="breadcrumb h-full flex items-center">
        <div class="flex" v-if="onHome">
          <span class="ml-2 text-[0.8rem]">〽️&nbsp;&nbsp;总览</span>
        </div>
        <div class="flex" v-else>
          <button class="px-2 py-1" title="回到主页" @click="goHome">🔙</button>
          <span class="ml-2 text-[0.8rem]">书籍详情</span>
        </div>
      </div>
      <!-- 工具按钮 -->
      <div class="tools flex items-center mr-2">
        <button @click="settingStore.setDark(!settingStore.isDark)">
          <span v-if="settingStore.isDark">🌝 切换主题</span>
          <span v-else>☀️ 切换主题</span>
        </button>
        <button class="ml-4" @click="openSettings">⚙️ 设置</button>
      </div>
    </header>
    <main class="flex-1 overflow-y-auto p-6 bg-primary">
      <!-- 总览界面 -->
      <div v-if="onHome" class="overview max-w-[1200px] mx-auto">
        <!-- 统计卡片 -->
        <div class="stats-cards grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-2 mb-8">
          <div class="stat-card flex items-center p-6 bg-secondary rounded border border-color transition-all shadow-sm hover:-translate-y-0.5 hover:shadow-md">
            <div class="stat-icon text-[2.5rem] mr-4">📚</div>
            <div class="stat-info flex-1">
              <div class="stat-label text-[0.85rem] text-secondary mb-1">书籍总数</div>
              <div class="stat-value text-[1.8rem] font-bold text-primary">{{ bookStats.totalBooks }}</div>
            </div>
          </div>
          <div class="stat-card flex items-center p-6 bg-secondary rounded border border-color transition-all shadow-sm hover:-translate-y-0.5 hover:shadow-md">
            <div class="stat-icon text-[2.5rem] mr-4">✍️</div>
            <div class="stat-info flex-1">
              <div class="stat-label text-[0.85rem] text-secondary mb-1">总字数</div>
              <div class="stat-value text-[1.8rem] font-bold text-primary">{{ (bookStats.totalWords / 10000).toFixed(1) }}万</div>
            </div>
          </div>
          <div class="stat-card flex items-center p-6 bg-secondary rounded border border-color transition-all shadow-sm hover:-translate-y-0.5 hover:shadow-md">
            <div class="stat-icon text-[2.5rem] mr-4">🔥</div>
            <div class="stat-info flex-1">
              <div class="stat-label text-[0.85rem] text-secondary mb-1">本周活跃</div>
              <div class="stat-value text-[1.8rem] font-bold text-primary">{{ bookStats.recentUpdated }}</div>
            </div>
          </div>
        </div>

        <!-- 最近活动 -->
        <div class="recent-section mt-8">
          <h3 class="section-title text-[1.1rem] font-semibold mb-4 text-primary">📌 最近活动</h3>
          <div class="recent-books grid gap-2">
            <div v-for="book in books.slice(0, 5)" :key="book.id" class="recent-book-item flex items-center p-2 bg-secondary rounded border border-color cursor-pointer transition-all hover:bg-tertiary hover:border-primary" @click="handleClickBookItem(book)" @dblclick="handleBookDoubleClick(book)">
              <img :src="getBookCoverUrl(book.id)" class="recent-book-cover w-12 h-[4.5rem] object-cover rounded mr-4" />
              <div class="recent-book-info flex-1">
                <h4 class="text-[1rem] mb-1 text-primary">{{ book.title }}</h4>
                <p class="book-time text-[0.85rem] text-secondary">{{ formatTime(book.modifiedTime) }}更新</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 书籍详情界面 -->
      <div v-else class="book-detail max-w-[1200px] mx-auto">
        <div v-if="clickSelectedBook" class="detail-content flex flex-col gap-2">
          <!-- 书籍头部信息 -->
          <div class="book-header flex gap-2 p-6 bg-secondary rounded border border-color">
            <img :src="getBookCoverUrl(clickSelectedBook.id)" class="detail-cover w-[8rem] h-[12rem] object-cover rounded shadow-md" />
            <div class="book-header-info flex-1 flex flex-col justify-center">
              <h2 class="text-[1.8rem] font-bold mb-3 text-primary">{{ clickSelectedBook.title }}</h2>
              <p class="book-desc text-[0.95rem] text-secondary leading-normal mb-4">{{ clickSelectedBook.description || '暂无描述' }}</p>
              <div class="book-meta flex gap-2 text-[0.85rem] text-secondary">
                <span>📅 创建于 {{ formatDate(clickSelectedBook.createdTime) }}</span>
                <span>🕒 最近更新 {{ formatTime(clickSelectedBook.modifiedTime) }}</span>
              </div>
            </div>
          </div>

          <!-- 统计数据面板 -->
          <div class="detail-stats grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-2">
            <div class="detail-stat-item p-4 bg-secondary rounded border border-color text-center">
              <div class="detail-stat-value text-[1.8rem] font-bold text-primary">{{ selectedBookStats.articleCount }}</div>
              <div class="detail-stat-label text-[0.85rem] text-secondary mb-1">文章数</div>
            </div>
            <div class="detail-stat-item p-4 bg-secondary rounded border border-color text-center">
              <div class="detail-stat-value text-[1.8rem] font-bold text-primary">{{ (selectedBookStats.totalWords / 10000).toFixed(1) }}万</div>
              <div class="detail-stat-label text-[0.85rem] text-secondary mb-1">总字数</div>
            </div>
            <div class="detail-stat-item p-4 bg-secondary rounded border border-color text-center">
              <div class="detail-stat-value text-[1.8rem] font-bold text-primary">{{ selectedBookStats.entityCount }}</div>
              <div class="detail-stat-label text-[0.85rem] text-secondary mb-1">实体数</div>
            </div>
            <div class="detail-stat-item p-4 bg-secondary rounded border border-color text-center" v-if="selectedBookStats.deletedArticleCount > 0">
              <div class="detail-stat-value warning text-[1.8rem] font-bold text-[var(--warning,#f59e0b)]">{{ selectedBookStats.deletedArticleCount }}</div>
              <div class="detail-stat-label text-[0.85rem] text-secondary mb-1">已删除</div>
            </div>
          </div>

          <!-- 实体分类统计 -->
          <div v-if="Object.keys(selectedBookStats.entityTypes).length > 0" class="entity-types-section p-4 bg-secondary rounded border border-color">
            <h3 class="section-title text-[1rem] font-semibold mb-3 text-primary">🎭 实体分类</h3>
            <div class="entity-types flex flex-wrap gap-2 mt-3">
              <div v-for="(count, type) in selectedBookStats.entityTypes" :key="type" class="entity-type-tag px-2 py-1 bg-tertiary border border-color rounded text-[0.85rem] text-primary transition-all hover:bg-primary hover:text-white">
                {{ type }} ({{ count }})
              </div>
            </div>
          </div>

          <!-- 文章列表 -->
          <div class="articles-section p-4 bg-secondary rounded border border-color">
            <div class="section-header flex justify-between items-center mb-4">
              <h3 class="section-title text-[1rem] font-semibold text-primary">📝 文章列表</h3>
              <button class="button-m" @click="console.log('创建文章')">✨ 新建文章</button>
            </div>
            <div v-if="selectedBookStats.articles.length === 0" class="empty-state flex flex-col items-center justify-center p-12 text-center text-tertiary">
              <div class="empty-icon text-4xl">📄</div>
              <p class="mt-2 text-[0.875rem]">还没有文章，点击上方按钮创建第一篇文章吧~</p>
            </div>
            <div v-else class="articles-list flex flex-col gap-2">
              <div v-for="article in selectedBookStats.articles" :key="article.id" class="article-item flex justify-between items-center p-2 bg-tertiary rounded cursor-pointer transition-all border border-transparent hover:bg-primary hover:border-primary" @click="openArticle(article)">
                <div class="article-main flex-1">
                  <h4 class="article-title text-[1rem] font-semibold mb-2 text-primary">{{ article.title }}</h4>
                  <div class="article-meta flex gap-2 text-[0.85rem] text-secondary">
                    <span>{{ article.wordCount || 0 }} 字</span>
                    <span>•</span>
                    <span>{{ formatTime(article.modifiedTime) }}更新</span>
                  </div>
                </div>
                <button class="article-action px-2 py-2 text-[1.2rem] text-secondary opacity-0 transition-opacity hover:opacity-100" @click.stop="console.log('文章操作', article)">⋯</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</div>

<!-- 书籍右键菜单 -->
<ContextMenu ref="bookContextMenuRef" />

<!-- 新建弹出层 -->
<EditBookPopup ref="createBookPopupRef" @status:save="addBook" />

<!-- 修改书籍弹出层 -->
<EditBookPopup ref="updateBookPopupRef" @status:save="updateBook" />

<!-- 书籍回收站弹出层 -->
<RecycleBinBookPopup ref="recycleBinBookPopupRef" @restored="handleBookRestored" />

<!-- 导入导出弹出层 -->
<Popup ref="importExportPopupRef" title="📥 导入导出">
  <div class="import-export-container max-h-[90vh] overflow-y-auto">
    <!-- 书籍导入 -->
    <div class="section">
      <h3 class="text-primary text-[1rem]">📚 书籍导入</h3>
      <BookImportExport @importSuccess="handleImportSuccess" />
    </div>

    <div class="divider h-px bg-border-color mb-6"></div>

    <!-- 配置导入导出 -->
    <div class="section">
      <h3 class="text-primary text-[1rem]">⚙️ 配置导入导出</h3>
      <ConfigImportExport @importSuccess="handleConfigImportSuccess" />
    </div>

    <div class="divider h-px bg-border-color mb-6"></div>

    <!-- 全库操作 -->
    <div class="section">
      <h3 class="text-primary text-[1rem]">🏛️ 全库操作</h3>
      <p class="description text-secondary text-[0.85rem] leading-normal mb-3">
        导出或导入整个数据库（包含所有书籍、文章、实体和配置）<br />
        <span class="warning text-[#ff9800] text-[0.8rem]">⚠️ 注意：导入全库数据时会与现有数据合并</span>
      </p>
      <div class="button-group flex gap-2">
        <button @click="exportFullDatabase" class="btn-primary px-4 py-2 bg-primary text-white border-none rounded cursor-pointer text-[0.875rem] flex-1">💾 导出全库</button>
        <button @click="importFullDatabaseMerge" class="btn-primary px-4 py-2 bg-primary text-white border-none rounded cursor-pointer text-[0.875rem] flex-1">📂 导入全库</button>
      </div>
    </div>
  </div>
</Popup>
</template>

<style scoped>
/* 保留复杂样式：nth-child 选择器、line-clamp 等 */
.book-item.checked>div>:nth-child(1) {
  color: var(--text-primary);
}

.book-item:hover>div>:nth-child(1) {
  color: var(--primary);
}

.book-item>div>:nth-child(1) {
  margin-top: .25rem;
  transition: color .2s;
}

.book-item>div>:nth-child(2) {
  font-size: .8rem;
  margin-top: .5rem;
}

.book-desc {
  display: -webkit-box;
  -webkit-line-clamp: 2;
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
  font-size: 0.85rem;
  border: 1px solid var(--border-color);
}

.operations button:last-child {
  margin-right: 0;
}

.tools button {
  padding: .25rem;
}

.article-item:hover .article-action {
  opacity: 1;
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
</style>
