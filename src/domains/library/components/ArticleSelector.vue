<script setup lang="ts">
import type { Article } from '@shared/types'

defineProps<{
  articles: Article[]
  selectedArticles: Article[]
}>()

const emit = defineEmits<{
  toggle: [article: Article]
  toggleAll: []
}>()

function isSelected(article: Article) {
  return emit => {
    // 通过 props 比较
  }
}
</script>

<template>
  <div class="article-selector">
    <div class="section-header">
      <h3>📚 选择文章</h3>
      <button @click="emit('toggleAll')" class="btn-small">
        {{ selectedArticles.length === articles.length ? '反选' : '全选' }}
      </button>
    </div>
    <div class="article-list">
      <div v-if="articles.length === 0" class="empty-state">
        当前书籍没有文章
      </div>
      <label v-for="article in articles" :key="article.id" class="article-item" :class="{ selected: selectedArticles.some(a => a.id === article.id) }">
        <input type="checkbox" :checked="selectedArticles.some(a => a.id === article.id)" @change="emit('toggle', article)" />
        <span class="article-title">{{ article.title }}</span>
        <span class="article-words">{{ article.wordCount }} 字</span>
      </label>
    </div>
  </div>
</template>

<style scoped>
.article-selector {
  margin-bottom: 1rem;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.6rem;
}

.section-header h3 {
  color: var(--text-primary);
  margin: 0;
  font-size: 0.9rem;
}

.article-list {
  max-height: 250px;
  overflow-y: auto;
  border: 1px solid var(--border-color);
  border-radius: 0.25rem;
  padding: 0.4rem;
  background-color: var(--background-secondary);
}

.article-item {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem;
  border-radius: 0.25rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.article-item:hover {
  background-color: var(--background-tertiary);
}

.article-item.selected {
  background-color: var(--background-tertiary);
}

.article-item input[type="checkbox"] {
  cursor: pointer;
}

.article-title {
  flex: 1;
  color: var(--text-primary);
  font-size: 0.85rem;
}

.article-words {
  color: var(--text-tertiary);
  font-size: 0.75rem;
}

/* 滚动条样式 */
.article-list::-webkit-scrollbar {
  width: 6px;
}

.article-list::-webkit-scrollbar-track {
  background: var(--background-secondary);
}

.article-list::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 3px;
}

.article-list::-webkit-scrollbar-thumb:hover {
  background: var(--text-tertiary);
}
</style>
