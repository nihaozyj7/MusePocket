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
  <div class="left-container">
    <div class="sidebar">
      <!-- 搜索栏 -->
      <div class="logo">
        灵感口袋（MusePocket）
      </div>
      <!-- 操作按钮 -->
      <div class="operations">
        <!-- 导入导出 -->
        <button class="button-m" title="导入导出" @click="openImportExportPopup">📥 导入导出</button>
        <!-- 回收站 -->
        <button class="button-m" title="回收站" @click="openRecycleBin">🗑 回收站</button>
        <!-- 占位符 -->
        <div style="flex: 1;"></div>
        <!-- 新建书籍 -->
        <button class="button-m" title="创建新书籍" @click="openAddBookDialog">📓 新书</button>
      </div>
      <div class="bookshelf">
        <div class="scroll-container">
          <!-- 单个书籍项（示例） -->
          <div class="book-item" :class="{ 'checked': bookIdEqual(book) }" v-for="book in books" :key="book.id" @contextmenu="handleBookItemContextMenu($event, book)" @click="handleClickBookItem(book)" @dblclick="handleBookDoubleClick(book)">
            <!-- 封面占位 -->
            <div class="cover">
              <img :src="getBookCoverUrl(book.id)" alt="封面" class="cover-img"></img>
            </div>
            <!-- 书籍信息 -->
            <div class="bookInfo">
              <h4>{{ book.title }}</h4>
              <p>{{ getBookStats(book.id).wordCount }}字 | {{ formatTime(book.modifiedTime) }}更新</p>
              <p>{{ book.description }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="right-container">
      <header class="toolbar">
        <!-- 面包屑 -->
        <div class="breadcrumb">
          <div class="flex" v-if="onHome">
            <span>〽️&nbsp;&nbsp;总览</span>
          </div>
          <div class="flex" v-else>
            <button style="padding: .5rem .1rem .5rem .5rem;" title="回到主页" @click="goHome">🔙</button>
            <span>书籍详情</span>
          </div>
        </div>
        <!-- 工具按钮 -->
        <div class="tools">
          <button @click="settingStore.setDark(!settingStore.isDark)">
            <span v-if="settingStore.isDark">🌝 切换主题</span>
            <span v-else>☀️ 切换主题</span>
          </button>
          <button style="margin-left: 1rem;" @click="openSettings">⚙️ 设置</button>
        </div>
      </header>
      <main>
        <!-- 总览界面 -->
        <div v-if="onHome" class="overview">
          <!-- 统计卡片 -->
          <div class="stats-cards">
            <div class="stat-card">
              <div class="stat-icon">📚</div>
              <div class="stat-info">
                <div class="stat-label">书籍总数</div>
                <div class="stat-value">{{ bookStats.totalBooks }}</div>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon">✍️</div>
              <div class="stat-info">
                <div class="stat-label">总字数</div>
                <div class="stat-value">{{ (bookStats.totalWords / 10000).toFixed(1) }}万</div>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon">🔥</div>
              <div class="stat-info">
                <div class="stat-label">本周活跃</div>
                <div class="stat-value">{{ bookStats.recentUpdated }}</div>
              </div>
            </div>
          </div>

          <!-- 最近活动 -->
          <div class="recent-section">
            <h3 class="section-title">📌 最近活动</h3>
            <div class="recent-books">
              <div v-for="book in books.slice(0, 5)" :key="book.id" class="recent-book-item" @click="handleClickBookItem(book)" @dblclick="handleBookDoubleClick(book)">
                <img :src="getBookCoverUrl(book.id)" class="recent-book-cover" />
                <div class="recent-book-info">
                  <h4>{{ book.title }}</h4>
                  <p class="book-time">{{ formatTime(book.modifiedTime) }}更新</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 书籍详情界面 -->
        <div v-else class="book-detail">
          <div v-if="clickSelectedBook" class="detail-content">
            <!-- 书籍头部信息 -->
            <div class="book-header">
              <img :src="getBookCoverUrl(clickSelectedBook.id)" class="detail-cover" />
              <div class="book-header-info">
                <h2>{{ clickSelectedBook.title }}</h2>
                <p class="book-desc">{{ clickSelectedBook.description || '暂无描述' }}</p>
                <div class="book-meta">
                  <span>📅 创建于 {{ formatDate(clickSelectedBook.createdTime) }}</span>
                  <span>🕒 最近更新 {{ formatTime(clickSelectedBook.modifiedTime) }}</span>
                </div>
              </div>
            </div>

            <!-- 统计数据面板 -->
            <div class="detail-stats">
              <div class="detail-stat-item">
                <div class="detail-stat-value">{{ selectedBookStats.articleCount }}</div>
                <div class="detail-stat-label">文章数</div>
              </div>
              <div class="detail-stat-item">
                <div class="detail-stat-value">{{ (selectedBookStats.totalWords / 10000).toFixed(1) }}万</div>
                <div class="detail-stat-label">总字数</div>
              </div>
              <div class="detail-stat-item">
                <div class="detail-stat-value">{{ selectedBookStats.entityCount }}</div>
                <div class="detail-stat-label">实体数</div>
              </div>
              <div class="detail-stat-item" v-if="selectedBookStats.deletedArticleCount > 0">
                <div class="detail-stat-value warning">{{ selectedBookStats.deletedArticleCount }}</div>
                <div class="detail-stat-label">已删除</div>
              </div>
            </div>

            <!-- 实体分类统计 -->
            <div v-if="Object.keys(selectedBookStats.entityTypes).length > 0" class="entity-types-section">
              <h3 class="section-title">🎭 实体分类</h3>
              <div class="entity-types">
                <div v-for="(count, type) in selectedBookStats.entityTypes" :key="type" class="entity-type-tag">
                  {{ type }} ({{ count }})
                </div>
              </div>
            </div>

            <!-- 文章列表 -->
            <div class="articles-section">
              <div class="section-header">
                <h3 class="section-title">📝 文章列表</h3>
                <button class="button-m" @click="console.log('创建文章')">✨ 新建文章</button>
              </div>
              <div v-if="selectedBookStats.articles.length === 0" class="empty-state">
                <div class="empty-icon">📄</div>
                <p>还没有文章，点击上方按钮创建第一篇文章吧~</p>
              </div>
              <div v-else class="articles-list">
                <div v-for="article in selectedBookStats.articles" :key="article.id" class="article-item" @click="openArticle(article)">
                  <div class="article-main">
                    <h4 class="article-title">{{ article.title }}</h4>
                    <div class="article-meta">
                      <span>{{ article.wordCount || 0 }} 字</span>
                      <span>•</span>
                      <span>{{ formatTime(article.modifiedTime) }}更新</span>
                    </div>
                  </div>
                  <button class="article-action" @click.stop="console.log('文章操作', article)">⋯</button>
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
    <div class="import-export-container">
      <!-- 书籍导入 -->
      <div class="section">
        <h3>📚 书籍导入</h3>
        <BookImportExport @importSuccess="handleImportSuccess" />
      </div>

      <div class="divider"></div>

      <!-- 配置导入导出 -->
      <div class="section">
        <h3>⚙️ 配置导入导出</h3>
        <ConfigImportExport @importSuccess="handleConfigImportSuccess" />
      </div>

      <div class="divider"></div>

      <!-- 全库操作 -->
      <div class="section">
        <h3>🏛️ 全库操作</h3>
        <p class="description">
          导出或导入整个数据库（包含所有书籍、文章、实体和配置）<br />
          <span class="warning">⚠️ 注意：导入全库数据时会与现有数据合并</span>
        </p>
        <div class="button-group">
          <button @click="exportFullDatabase" class="btn-primary">💾 导出全库</button>
          <button @click="importFullDatabaseMerge" class="btn-primary">📂 导入全库</button>
        </div>
      </div>
    </div>
  </Popup>
</template>

<style scoped>
.left-container {
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

.logo {
  height: 2.7rem;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: .5rem;
  color: var(--primary);
  font-size: 1.2rem;
  font-weight: 700;
  letter-spacing: .12rem;
  border-bottom: 1px solid var(--border-color);
}

.operations {
  display: flex;
  height: 2.5rem;
  align-items: center;
  padding: 0 .25rem;
  border-bottom: 1px solid var(--border-color);
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

.bookshelf {
  flex: 1;
  height: 0;
  padding: .5rem 0;
}

.book-item {
  display: flex;
  align-items: start;
  cursor: pointer;
  border-radius: 0.25rem;
  padding: 0.5rem;
  margin: 0 0.5rem 0.5rem 0.5rem;
  align-items: center;
  transition: all 0.2s;
  border: 1px solid transparent;
}

.book-item:hover {
  background-color: var(--background-tertiary);
  border-color: var(--border-color);
}

.book-item.checked {
  background-color: var(--background-tertiary);
}

.book-item.checked>div>:nth-child(1) {
  color: var(--text-primary);
}

.book-item .cover {
  height: 6.4rem;
  width: 4rem;
  margin-right: .5rem;
  overflow: hidden;
}

.book-item .cover img {
  height: 100%;
  width: 100%;
  object-fit: cover;
  border-radius: .25rem;
}

.bookInfo {
  display: flex;
  flex-direction: column;
  flex: 1;
  width: 0;
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

.book-item>div>:nth-child(3) {
  font-size: .8rem;
  margin-top: .5rem;
  line-height: 1.4rem;
  display: -webkit-box;
  -webkit-line-clamp: 2;
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
  height: 2.7rem;
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

.tools button {
  padding: .25rem;
}

.bottom {
  display: flex;
  flex: 1;
  height: 100%;
}

main {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
  background-color: var(--background-primary);
}

/* ====== 总览页面样式 ====== */
.overview {
  max-width: 1200px;
  margin: 0 auto;
}

.stats-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.stat-card {
  display: flex;
  align-items: center;
  padding: 1.5rem;
  background-color: var(--background-secondary);
  border-radius: 0.25rem;
  border: 1px solid var(--border-color);
  transition: all 0.2s;
  box-shadow: var(--shadow-sm);
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.stat-icon {
  font-size: 2.5rem;
  margin-right: 1rem;
}

.stat-info {
  flex: 1;
}

.stat-label {
  font-size: .85rem;
  color: var(--text-secondary);
  margin-bottom: .25rem;
}

.stat-value {
  font-size: 1.8rem;
  font-weight: 700;
  color: var(--primary);
}

.recent-section {
  margin-top: 2rem;
}

.section-title {
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: var(--text-primary);
}

.recent-books {
  display: grid;
  gap: .75rem;
}

.recent-book-item {
  display: flex;
  align-items: center;
  padding: 0.5rem;
  background-color: var(--background-secondary);
  border-radius: 0.25rem;
  border: 1px solid var(--border-color);
  cursor: pointer;
  transition: all 0.2s;
}

.recent-book-item:hover {
  background-color: var(--background-tertiary);
  border-color: var(--primary);
}

.recent-book-cover {
  width: 3rem;
  height: 4.5rem;
  object-fit: cover;
  border-radius: .25rem;
  margin-right: 1rem;
}

.recent-book-info {
  flex: 1;
}

.recent-book-info h4 {
  font-size: 1rem;
  margin-bottom: .25rem;
  color: var(--text-primary);
}

.book-time {
  font-size: .85rem;
  color: var(--text-secondary);
}

/* ====== 书籍详情页面样式 ====== */
.book-detail {
  max-width: 1200px;
  margin: 0 auto;
}

.detail-content {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.book-header {
  display: flex;
  gap: 2rem;
  padding: 1.5rem;
  background-color: var(--background-secondary);
  border-radius: 0.25rem;
  border: 1px solid var(--border-color);
}

.detail-cover {
  width: 8rem;
  height: 12rem;
  object-fit: cover;
  border-radius: 0.25rem;
  box-shadow: var(--shadow-md);
}

.book-header-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.book-header-info h2 {
  font-size: 1.8rem;
  font-weight: 700;
  margin-bottom: .75rem;
  color: var(--text-primary);
}

.book-desc {
  font-size: .95rem;
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 1rem;
}

.book-meta {
  display: flex;
  gap: 1.5rem;
  font-size: .85rem;
  color: var(--text-secondary);
}

.detail-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 1rem;
}

.detail-stat-item {
  padding: 1rem;
  background-color: var(--background-secondary);
  border-radius: 0.25rem;
  border: 1px solid var(--border-color);
  text-align: center;
}

.detail-stat-value {
  font-size: 1.8rem;
  font-weight: 700;
  color: var(--primary);
  margin-bottom: .25rem;
}

.detail-stat-value.warning {
  color: var(--warning, #f59e0b);
}

.detail-stat-label {
  font-size: .85rem;
  color: var(--text-secondary);
}

.entity-types-section {
  padding: 1rem;
  background-color: var(--background-secondary);
  border-radius: 0.25rem;
  border: 1px solid var(--border-color);
}

.entity-types {
  display: flex;
  flex-wrap: wrap;
  gap: .5rem;
  margin-top: .75rem;
}

.entity-type-tag {
  padding: 0.25rem 0.5rem;
  background-color: var(--background-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 0.25rem;
  font-size: 0.85rem;
  color: var(--text-primary);
  transition: all 0.2s;
}

.entity-type-tag:hover {
  background-color: var(--primary);
  color: white;
  border-color: var(--primary);
}

.articles-section {
  padding: 1rem;
  background-color: var(--background-secondary);
  border-radius: 0.25rem;
  border: 1px solid var(--border-color);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.empty-state {
  text-align: center;
  padding: 3rem 1rem;
  color: var(--text-secondary);
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
  opacity: .5;
}

.articles-list {
  display: flex;
  flex-direction: column;
  gap: .5rem;
}

.article-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  background-color: var(--background-tertiary);
  border-radius: 0.25rem;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;
}

.article-item:hover {
  background-color: var(--background-primary);
  border-color: var(--primary);
}

.article-main {
  flex: 1;
}

.article-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: .5rem;
}

.article-meta {
  display: flex;
  gap: .5rem;
  font-size: .85rem;
  color: var(--text-secondary);
}

.article-action {
  padding: .5rem 1rem;
  font-size: 1.2rem;
  color: var(--text-secondary);
  opacity: 0;
  transition: opacity .2s;
}

.article-item:hover .article-action {
  opacity: 1;
}

.import-export-container {
  max-height: 90vh;
  overflow-y: auto;
}

.import-export-container h3 {
  color: var(--text-primary);
  font-size: 1rem;
}

.import-export-container .description {
  color: var(--text-secondary);
  font-size: 0.85rem;
  line-height: 1.5;
  margin-bottom: 0.75rem;
}

.import-export-container .warning {
  color: #ff9800;
  font-size: 0.8rem;
}

.import-export-container .button-group {
  display: flex;
  gap: 0.75rem;
}

.import-export-container .btn-primary {
  padding: .5rem 1rem;
  background-color: var(--primary);
  color: white;
  border: none;
  border-radius: 0.25rem;
  cursor: pointer;
  font-size: 0.875rem;
  transition: background-color 0.2s;
  flex: 1;
}

.import-export-container .divider {
  height: 1px;
  background-color: var(--border-color);
  margin-bottom: 1.5rem;
}
</style>
