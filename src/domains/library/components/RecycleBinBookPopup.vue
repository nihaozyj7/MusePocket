<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Popup } from '@shared/components'
import type { Book } from '@shared/types'
import { bookdb } from '@shared/db'
import { $tips } from '@app/plugins'
import { getImageBase64ByID } from '@shared/utils'
import { $confirm } from '@app/plugins'

/** 弹出层引用 */
const popupRef = ref<InstanceType<typeof Popup> | null>(null)
/** 已删除的书籍列表 */
const deletedBooks = ref<Book[]>([])
/** 加载状态 */
const loading = ref(false)
/** 封面图片URL缓存 */
const bookCoverUrls = ref<Map<string, string>>(new Map())

/** 恢复书籍成功事件 */
const emit = defineEmits<{
  restored: [book: Book]
}>()

/** 打开弹出层 */
async function show() {
  popupRef.value?.show()
  await loadDeletedBooks()
}

/** 关闭弹出层 */
function close() {
  popupRef.value?.close()
}

defineExpose({ show, close })

/** 加载已删除的书籍 */
async function loadDeletedBooks() {
  loading.value = true
  try {
    const allBooks = await bookdb.getAllBooks(true)
    deletedBooks.value = allBooks.filter(b => b.deletedTime !== 0)
      .sort((a, b) => b.deletedTime - a.deletedTime)

    // 加载封面图片
    await loadBookCovers()
  } catch (err: any) {
    $tips.error(`获取回收站失败: ${err.message}`)
  } finally {
    loading.value = false
  }
}

/** 加载书籍封面 */
async function loadBookCovers() {
  bookCoverUrls.value.clear()
  for (const book of deletedBooks.value) {
    const url = await getImageBase64ByID(book.coverId)
    bookCoverUrls.value.set(book.id, url)
  }
}

/** 获取书籍封面URL */
function getBookCoverUrl(bookId: string): string {
  return bookCoverUrls.value.get(bookId) || '/cover/default.png'
}

/** 恢复书籍 */
async function handleRestore(book: Book) {
  const confirmed = await $confirm(`确定恢复书籍《${book.title}》吗？将同时恢复该书籍下的所有文章和实体。`)
  if (!confirmed) return

  const res = await bookdb.restoreBookDeep(book.id)
  if (res.success) {
    $tips.success('恢复成功')
    deletedBooks.value = deletedBooks.value.filter(b => b.id !== book.id)
    emit('restored', book)
  } else {
    $tips.error(`恢复失败: ${res.message}`)
  }
}

/** 永久删除书籍 */
async function handlePermanentDelete(book: Book) {
  const confirmed = await $confirm(`确定永久删除书籍《${book.title}》吗？此操作不可恢复！将同时删除该书籍下的所有文章、实体和历史记录。`)
  if (!confirmed) return

  const res = await bookdb.deleteBook(book.id)
  if (res.success) {
    $tips.success('已永久删除')
    deletedBooks.value = deletedBooks.value.filter(b => b.id !== book.id)
  } else {
    $tips.error(`删除失败: ${res.message}`)
  }
}

/** 清空回收站 */
async function handleClearAll() {
  if (deletedBooks.value.length === 0) {
    $tips.error('回收站已经是空的')
    return
  }

  const confirmed = await $confirm(`确定清空回收站吗？将永久删除 ${deletedBooks.value.length} 本书籍及其所有内容，此操作不可恢复！`)
  if (!confirmed) return

  loading.value = true
  let successCount = 0
  let failCount = 0

  for (const book of deletedBooks.value) {
    const res = await bookdb.deleteBook(book.id)
    if (res.success) {
      successCount++
    } else {
      failCount++
    }
  }

  loading.value = false

  if (failCount === 0) {
    $tips.success(`已清空回收站，共删除 ${successCount} 本书籍`)
    deletedBooks.value = []
  } else {
    $tips.error(`部分删除失败：成功 ${successCount} 本，失败 ${failCount} 本`)
    await loadDeletedBooks()
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
</script>

<template>
  <Popup ref="popupRef" title="🗑️ 回收站 - 书籍" :draggable="true" :mask-closable="true">
    <div class="recycle-bin-container">
      <!-- 顶部操作栏 -->
      <div class="toolbar">
        <div class="info">
          共 {{ deletedBooks.length }} 本已删除的书籍
        </div>
        <button class="button-danger" @click="handleClearAll" :disabled="deletedBooks.length === 0 || loading">
          🗑️ 清空回收站
        </button>
      </div>

      <!-- 书籍列表 -->
      <div class="content">
        <div v-if="loading" class="loading">
          加载中...
        </div>
        <div v-else-if="deletedBooks.length === 0" class="empty">
          <div class="empty-icon">📭</div>
          <p>回收站是空的</p>
        </div>
        <div v-else class="book-list">
          <div v-for="book in deletedBooks" :key="book.id" class="book-item">
            <img :src="getBookCoverUrl(book.id)" class="book-cover" />
            <div class="book-info">
              <h4 class="book-title">{{ book.title }}</h4>
              <p class="book-desc">{{ book.description || '暂无描述' }}</p>
              <div class="book-meta">
                <span>🗑️ 删除于 {{ formatTime(book.deletedTime) }}</span>
                <span>📅 {{ formatDate(book.deletedTime) }}</span>
              </div>
            </div>
            <div class="book-actions">
              <button class="button-primary" @click="handleRestore(book)" :disabled="loading">
                ♻️ 恢复
              </button>
              <button class="button-danger" @click="handlePermanentDelete(book)" :disabled="loading">
                ❌ 永久删除
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Popup>
</template>

<style scoped>
.recycle-bin-container {
  width: 800px;
  height: 600px;
  display: flex;
  flex-direction: column;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid var(--border-color);
  background-color: var(--background-secondary);
}

.info {
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.button-primary,
.button-danger {
  padding: 0.4rem 0.8rem;
  border-radius: 0.25rem;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
}

.button-primary {
  background-color: var(--primary);
  color: white;
}

.button-primary:hover:not(:disabled) {
  opacity: 0.9;
  transform: translateY(-1px);
}

.button-danger {
  background-color: #ef4444;
  color: white;
}

.button-danger:hover:not(:disabled) {
  opacity: 0.9;
  transform: translateY(-1px);
}

.button-primary:disabled,
.button-danger:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.content {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

.loading {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  color: var(--text-secondary);
}

.empty {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
  color: var(--text-secondary);
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.book-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.book-item {
  display: flex;
  align-items: start;
  padding: 1rem;
  background-color: var(--background-secondary);
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
  transition: all 0.2s;
}

.book-item:hover {
  background-color: var(--background-tertiary);
  border-color: var(--primary);
}

.book-cover {
  width: 4rem;
  height: 6rem;
  object-fit: cover;
  border-radius: 0.25rem;
  margin-right: 1rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.book-info {
  flex: 1;
  min-width: 0;
}

.book-title {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: var(--text-primary);
}

.book-desc {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-bottom: 0.5rem;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

.book-meta {
  display: flex;
  gap: 1rem;
  font-size: 0.75rem;
  color: var(--text-tertiary);
}

.book-actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-left: 1rem;
}

.book-actions button {
  min-width: 100px;
}
</style>
