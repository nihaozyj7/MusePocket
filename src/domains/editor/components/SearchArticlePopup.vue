<script setup lang="ts">
import { ref, computed } from 'vue'
import { Popup } from '@shared/components'
import type { Article } from '@shared/types'

const popupRef = ref<InstanceType<typeof Popup>>()
const searchKeyword = ref('')
const articles = ref<Article[]>([])

const emit = defineEmits<{
  select: [article: Article]
}>()

/** 过滤后的文章列表 */
const filteredArticles = computed(() => {
  if (!searchKeyword.value.trim()) {
    return articles.value
  }
  const keyword = searchKeyword.value.trim().toLowerCase()
  return articles.value.filter(article =>
    article.title.toLowerCase().includes(keyword)
  )
})

/** 打开搜索弹窗 */
function show(articleList: Article[]) {
  articles.value = articleList
  searchKeyword.value = ''
  popupRef.value?.show()
  // 延迟聚焦到搜索框
  setTimeout(() => {
    const input = document.querySelector('.search-article-popup input') as HTMLInputElement
    input?.focus()
  }, 100)
}

/** 关闭弹窗 */
function hide() {
  popupRef.value?.hide()
}

/** 选择文章 */
function selectArticle(article: Article) {
  emit('select', article)
  hide()
}

/** 格式化时间 */
function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

defineExpose({
  show,
  hide
})
</script>

<template>
  <Popup title="🔍 搜索章节" ref="popupRef" mask-closable>
    <div class="search-article-popup">
      <!-- 搜索框 -->
      <div class="search-box">
        <input type="text" v-model="searchKeyword" placeholder="输入关键词搜索..." @keydown.esc="hide" />
        <div class="search-icon">🔍</div>
      </div>

      <!-- 搜索结果 -->
      <div class="results-container">
        <div v-if="filteredArticles.length === 0" class="empty-tip">
          <p v-if="searchKeyword.trim()">😕 没有找到匹配的文章</p>
          <p v-else>📝 {{ articles.length }} 篇文章</p>
        </div>
        <div v-else class="articles-list">
          <div class="article-item" v-for="article in filteredArticles" :key="article.id" @click="selectArticle(article)">
            <div class="article-header">
              <h4 class="article-title">📜 {{ article.title }}</h4>
              <div class="article-word-count">{{ article.wordCount }} 字</div>
            </div>
            <div class="article-meta">
              <span class="meta-item">创建: {{ formatTime(article.createdTime) }}</span>
              <span class="meta-item">修改: {{ formatTime(article.modifiedTime) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 提示信息 -->
      <div class="search-footer">
        <span class="hint">💡 点击文章即可打开</span>
        <span class="hint">ESC 关闭</span>
      </div>
    </div>
  </Popup>
</template>

<style scoped>
.search-article-popup {
  width: 40rem;
  max-height: 35rem;
  display: flex;
  flex-direction: column;
}

.search-box {
  position: relative;
  padding: 1rem;
  border-bottom: 1px solid var(--border-color);
}

.search-box input {
  width: 100%;
  padding: 0.75rem 2.5rem 0.75rem 1rem;
  font-size: 0.95rem;
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
  background-color: var(--background-secondary);
  color: var(--text-primary);
  transition: all 0.2s;
}

.search-box input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(41, 151, 255, 0.1);
}

.search-icon {
  position: absolute;
  right: 2rem;
  top: 50%;
  transform: translateY(-50%);
  font-size: 1.2rem;
  pointer-events: none;
  opacity: 0.5;
}

.results-container {
  flex: 1;
  overflow-y: auto;
  min-height: 20rem;
  max-height: 28rem;
}

.empty-tip {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 3rem 1rem;
  color: var(--text-secondary);
}

.empty-tip p {
  margin: 0.5rem 0;
  font-size: 0.95rem;
}

.articles-list {
  padding: 0.5rem;
}

.article-item {
  padding: .5rem;
  margin-bottom: 0.5rem;
  background-color: var(--background-secondary);
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.2s;
}

.article-item:hover {
  background-color: var(--background-tertiary);
  border-color: var(--primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transform: translateY(-1px);
}

.article-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.article-title {
  margin: 0;
  font-size: 1rem;
  color: var(--text-primary);
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.article-word-count {
  font-size: 0.75rem;
  color: var(--text-tertiary);
  padding: 0.25rem 0.5rem;
  background-color: var(--background-tertiary);
  border-radius: 0.25rem;
  margin-left: 1rem;
}

.article-meta {
  display: flex;
  gap: 1.5rem;
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.meta-item {
  display: flex;
  align-items: center;
}

.search-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  border-top: 1px solid var(--border-color);
  background-color: var(--background-secondary);
}

.hint {
  font-size: 0.75rem;
  color: var(--text-tertiary);
}
</style>
