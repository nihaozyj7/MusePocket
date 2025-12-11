<script setup lang="ts">
import { getDefaultTextSnippet } from '@shared/constants/defaults'
import { $tips } from '@app/plugins'
import { useTextSnippetsStore } from '@domains/editor/stores/text-snippets.store'
import type { TextSnippet } from '@shared/types'
import { ref } from 'vue'

const props = defineProps<{ title: string }>()

const snippetsStore = useTextSnippetsStore()
const newSnippet = ref(getDefaultTextSnippet())
const isFormExpanded = ref(false)

function add() {
  if (newSnippet.value.title.trim() === '' || newSnippet.value.content.trim() === '') {
    return $tips.error('标题和内容不能为空')
  }

  snippetsStore.add(newSnippet.value)
  newSnippet.value = getDefaultTextSnippet()
  $tips.success('添加成功')
}

/** 复制 */
function copy(text: string) {
  navigator.clipboard.writeText(text)
  $tips.success('已复制', 1000)
}

function remove(snippet: TextSnippet) {
  snippetsStore.remove(snippet)
  $tips.success('删除成功')
}
</script>

<template>
  <div class="base-setting">
    <div class="title">{{ props.title }}</div>
    <div class="content">
      <!-- 折叠表单区域 -->
      <div class="form-section" :class="{ collapsed: !isFormExpanded }">
        <div class="form-header" @click="isFormExpanded = !isFormExpanded">
          <span class="form-title">{{ isFormExpanded ? '📝 新增文本预设' : '➕ 新增文本预设' }}</span>
          <span class="toggle-icon">{{ isFormExpanded ? '▼' : '▶' }}</span>
        </div>
        <div class="form-body" v-show="isFormExpanded">
          <textarea placeholder="文本预设内容（可多行）" v-model="newSnippet.content"></textarea>
          <div class="form-actions">
            <input type="text" placeholder="文本预设标题" v-model="newSnippet.title">
            <button @click="add">添加文本预设</button>
          </div>
        </div>
      </div>
      <div class="items-list">
        <div class="item-card" v-for="snippet in snippetsStore.v" :key="snippet.id">
          <div class="item-header">
            <h5>{{ snippet.title }}</h5>
            <button class="delete-btn" title="删除" @click="remove(snippet)">🗑️</button>
          </div>
          <div class="item-content" title="预设内容，点击复制" @click="copy(snippet.content)">{{ snippet.content }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.content {
  display: flex;
  flex-direction: column;
}

.form-section {
  background-color: var(--background-secondary);
  border-radius: 0.5rem;
  margin-bottom: 1rem;
  border: 1px solid var(--border-color);
  overflow: hidden;
  transition: all 0.3s ease;
}

.form-section.collapsed {
  background-color: transparent;
}

.form-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  cursor: pointer;
  user-select: none;
  transition: background-color 0.2s;
}

.form-header:hover {
  background-color: var(--background-tertiary);
}

.form-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-primary);
}

.toggle-icon {
  color: var(--text-secondary);
  font-size: 0.8rem;
  transition: transform 0.3s ease;
}

.form-body {
  padding: 0 1rem 1rem 1rem;
  animation: slideDown 0.3s ease;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.form-body textarea {
  width: 100%;
  margin-bottom: 0.75rem;
}

.form-actions {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.form-actions input {
  flex: 1;
}

.items-list {
  flex: 1;
  height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.item-card {
  padding: 1rem;
  background-color: var(--background-secondary);
  border-radius: 0.5rem;
  border: 1px solid var(--border-color);
  transition: all 0.2s;
}

.item-card:hover {
  border-color: var(--primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.item-header h5 {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-primary);
}

.item-content {
  font-size: 0.85rem;
  color: var(--text-secondary);
  word-wrap: break-word;
  overflow-wrap: break-word;
  white-space: pre-wrap;
  cursor: pointer;
  padding: 0.75rem;
  background-color: var(--background-tertiary);
  border-radius: 0.25rem;
  max-height: 12rem;
  overflow-y: auto;
  line-height: 1.6;
}

.item-content:hover {
  background-color: var(--background-primary);
  color: var(--text-primary);
}

.delete-btn {
  padding: 0.25rem 0.5rem;
}

.delete-btn:hover {
  background-color: var(--danger) !important;
  border-color: var(--danger) !important;
}
</style>
