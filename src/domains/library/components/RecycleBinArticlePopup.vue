<script setup lang="ts">
import { ref } from 'vue'
import { Popup } from '@shared/components'
import type { Article } from '@shared/types'
import { articledb } from '@shared/db'
import { $tips } from '@app/plugins'
import { $confirm } from '@app/plugins'

/** 弹出层引用 */
const popupRef = ref<InstanceType<typeof Popup> | null>(null)
/** 已删除的文章列表 */
const deletedArticles = ref<Article[]>([])
/** 加载状态 */
const loading = ref(false)
/** 当前书籍ID */
const currentBookId = ref<string>('')

/** 恢复文章成功事件 */
const emit = defineEmits<{
  restored: [article: Article]
}>()

/** 打开弹出层 */
async function show(bookId: string) {
  currentBookId.value = bookId
  popupRef.value?.show()
  await loadDeletedArticles()
}

/** 关闭弹出层 */
function close() {
  popupRef.value?.close()
}

defineExpose({ show, close })

/** 加载已删除的文章 */
async function loadDeletedArticles() {
  loading.value = true
  try {
    const allArticles = await articledb.getBookArticles(currentBookId.value, true)
    deletedArticles.value = allArticles.filter(a => a.deletedTime !== 0)
      .sort((a, b) => b.deletedTime - a.deletedTime)
  } catch (err: any) {
    $tips.error(`获取回收站失败: ${err.message}`)
  } finally {
    loading.value = false
  }
}

/** 恢复文章 */
async function handleRestore(article: Article) {
  const confirmed = await $confirm(`确定恢复文章《${article.title}》吗？`)
  if (!confirmed) return

  const res = await articledb.restore(article.id)
  if (res.success) {
    $tips.success('恢复成功')
    deletedArticles.value = deletedArticles.value.filter(a => a.id !== article.id)
    emit('restored', article)
  } else {
    $tips.error(`恢复失败: ${res.message}`)
  }
}

/** 永久删除文章 */
async function handlePermanentDelete(article: Article) {
  const confirmed = await $confirm(`确定永久删除文章《${article.title}》吗？此操作不可恢复！将同时删除该文章的所有历史记录。`)
  if (!confirmed) return

  const res = await articledb.deleteArticle(article.id)
  if (res.success) {
    $tips.success('已永久删除')
    deletedArticles.value = deletedArticles.value.filter(a => a.id !== article.id)
  } else {
    $tips.error(`删除失败: ${res.message}`)
  }
}

/** 清空回收站 */
async function handleClearAll() {
  if (deletedArticles.value.length === 0) {
    $tips.error('回收站已经是空的')
    return
  }

  const confirmed = await $confirm(`确定清空回收站吗？将永久删除 ${deletedArticles.value.length} 篇文章及其所有历史记录，此操作不可恢复！`)
  if (!confirmed) return

  loading.value = true
  let successCount = 0
  let failCount = 0

  for (const article of deletedArticles.value) {
    const res = await articledb.deleteArticle(article.id)
    if (res.success) {
      successCount++
    } else {
      failCount++
    }
  }

  loading.value = false

  if (failCount === 0) {
    $tips.success(`已清空回收站，共删除 ${successCount} 篇文章`)
    deletedArticles.value = []
  } else {
    $tips.error(`部分删除失败：成功 ${successCount} 篇，失败 ${failCount} 篇`)
    await loadDeletedArticles()
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
<Popup ref="popupRef" title="🗑️ 回收站 - 文章" :draggable="true" :mask-closable="true">
  <div class="recycle-bin-container">
    <!-- 顶部操作栏 -->
    <div class="toolbar">
      <div class="info">
        共 {{ deletedArticles.length }} 篇已删除的文章
      </div>
      <button class="button-danger" @click="handleClearAll" :disabled="deletedArticles.length === 0 || loading">
        🗑️ 清空回收站
      </button>
    </div>

    <!-- 文章列表 -->
    <div class="content">
      <div v-if="loading" class="loading">
        加载中...
      </div>
      <div v-else-if="deletedArticles.length === 0" class="empty">
        <div class="empty-icon">📭</div>
        <p>回收站是空的</p>
      </div>
      <div v-else class="article-list">
        <div v-for="article in deletedArticles" :key="article.id" class="article-item">
          <div class="article-icon">📜</div>
          <div class="article-info">
            <h4 class="article-title">{{ article.title }}</h4>
            <div class="article-meta">
              <span>{{ article.wordCount || 0 }} 字</span>
              <span>•</span>
              <span>🗑️ 删除于 {{ formatTime(article.deletedTime) }}</span>
              <span>•</span>
              <span>{{ formatDate(article.deletedTime) }}</span>
            </div>
          </div>
          <div class="article-actions">
            <button class="button-primary" @click="handleRestore(article)" :disabled="loading">
              ♻️ 恢复
            </button>
            <button class="button-danger" @click="handlePermanentDelete(article)" :disabled="loading">
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
  width: 700px;
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
.article-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.article-item {
  display: flex;
  align-items: center;
  padding: 1rem;
  background-color: var(--background-secondary);
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
  transition: all 0.2s;
}
.article-item:hover {
  background-color: var(--background-tertiary);
  border-color: var(--primary);
}
.article-icon {
  font-size: 1.5rem;
  margin-right: 1rem;
  opacity: 0.7;
}
.article-info {
  flex: 1;
  min-width: 0;
}
.article-title {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.article-meta {
  display: flex;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: var(--text-tertiary);
}
.article-actions {
  display: flex;
  gap: 0.5rem;
  margin-left: 1rem;
}
.article-actions button {
  min-width: 90px;
}
</style>
