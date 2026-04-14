<script setup lang="ts">
import { ref } from 'vue'
import { Popup } from '@shared/components'
import { useTextSnippetsStore } from '@domains/editor/stores/text-snippets.store'
import type { TextSnippet } from '@shared/types'

const popupRef = ref<InstanceType<typeof Popup>>()
const snippetsStore = useTextSnippetsStore()

const emit = defineEmits<{
  insert: [content: string]
}>()

function insertSnippet(snippet: TextSnippet) {
  emit('insert', snippet.content)
  popupRef.value?.hide()
}

defineExpose({
  show: () => popupRef.value?.show(),
  hide: () => popupRef.value?.hide()
})
</script>

<template>
<Popup title="📋 插入文本预设" ref="popupRef" mask-closable>
  <div class="insert-snippet-popup">
    <div v-if="snippetsStore.v.length === 0" class="empty-tip">
      <p>😊 还没有文本预设</p>
      <p>请在 设置 → 文本预设 中添加常用文本片段</p>
    </div>
    <div v-else class="snippets-list">
      <div class="snippet-item" v-for="snippet in snippetsStore.v" :key="snippet.id" @click="insertSnippet(snippet)">
        <h4>{{ snippet.title }}</h4>
        <div class="snippet-preview">{{ snippet.content }}</div>
      </div>
    </div>
  </div>
</Popup>
</template>

<style scoped>
.insert-snippet-popup {
  width: 35rem;
  max-height: 25rem;
  overflow-y: auto;
  padding: 1rem;
}
.empty-tip {
  text-align: center;
  padding: 3rem 1rem;
  color: var(--text-secondary);
}
.empty-tip p {
  margin: 0.5rem 0;
  font-size: 0.9rem;
}
.snippets-list {
  display: flex;
  flex-direction: column;
  gap: .5rem;
}
.snippet-item {
  padding: 0.75rem;
  background-color: var(--background-secondary);
  border: 1px solid var(--border-color);
  border-radius: 0.25rem;
  cursor: pointer;
  transition: all 0.2s;
}
.snippet-item:hover {
  background-color: var(--background-tertiary);
  border-color: var(--primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
.snippet-item h4 {
  margin: 0 0 0.5rem 0;
  font-size: 0.9rem;
  color: var(--text-primary);
}
.snippet-preview {
  font-size: 0.75rem;
  color: var(--text-secondary);
  max-height: 3rem;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  white-space: pre-wrap;
  word-wrap: break-word;
}
</style>
