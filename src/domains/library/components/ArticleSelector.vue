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
<div class="article-selector mb-4">
  <div class="section-header flex justify-between items-center mb-[0.6rem]">
    <h3 class="text-primary m-0 text-[0.9rem]">📚 选择文章</h3>
    <button @click="emit('toggleAll')" class="btn-small px-3 py-1 text-sm bg-tertiary text-primary border border-color rounded cursor-pointer transition-all hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed">
      {{ selectedArticles.length === articles.length ? '反选' : '全选' }}
    </button>
  </div>
  <div class="article-list max-h-[250px] overflow-y-auto border border-color rounded p-1 bg-secondary">
    <div v-if="articles.length === 0" class="empty-state flex flex-col items-center justify-center p-12 text-center text-tertiary">
      当前书籍没有文章
    </div>
    <label v-for="article in articles" :key="article.id" class="article-item flex items-center gap-2 p-1 rounded cursor-pointer transition-[background-color] duration-200 hover:bg-tertiary" :class="{ selected: selectedArticles.some(a => a.id === article.id) }">
      <input type="checkbox" class="cursor-pointer" :checked="selectedArticles.some(a => a.id === article.id)" @change="emit('toggle', article)" />
      <span class="article-title flex-1 text-primary text-[0.85rem]">{{ article.title }}</span>
      <span class="article-words text-tertiary text-[0.75rem]">{{ article.wordCount }} 字</span>
    </label>
  </div>
</div>
</template>
