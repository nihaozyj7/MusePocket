<script setup lang="ts">
import { getDefaultTextSnippet } from '@/defaultObjects'
import { $tips } from '@/plugins/notyf'
import { useTextSnippetsStore } from '@/stores/TextSnippetsStore'
import type { TextSnippet } from '@/types'
import { ref } from 'vue'

const props = defineProps<{ title: string }>()

const snippetsStore = useTextSnippetsStore()
const newSnippet = ref(getDefaultTextSnippet())

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
  <div class="base-setting" style="margin: 0 .25rem .25rem .25rem;">
    <div class="title">{{ props.title }}</div>
    <div class="content">
      <header>
        <textarea placeholder="文本预设内容（可多行）" v-model="newSnippet.content"></textarea>
        <div>
          <input type="text" placeholder="文本预设标题" v-model="newSnippet.title">
          <button @click="add">添加文本预设</button>
        </div>
      </header>
      <div class="snippets">
        <div class="snippet" v-for="snippet in snippetsStore.v" :key="snippet.id">
          <h5>{{ snippet.title }}</h5>
          <div class="snippet-content" title="预设内容，点击复制" @click="copy(snippet.content)">{{ snippet.content }}</div>
          <button class="delete-btn" title="删除" @click="remove(snippet)">🗑️</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
header {
  display: flex;
  flex-direction: column;
}

header textarea {
  width: 100%;
  height: 6rem;
  padding: .25rem;
  border-radius: .25rem;
  border: 1px solid var(--border-color);
  font-size: .8rem;
  background-color: var(--background-secondary);
  color: var(--text-primary);
  resize: vertical;
}

header>div {
  margin-top: .5rem;
  display: flex;
  align-items: center;
}

header>div input {
  flex: 1;
  width: 0;
  padding: .5rem;
  border-radius: .25rem;
  border: 1px solid var(--border-color);
  font-size: .8rem;
  background-color: var(--background-secondary);
  color: var(--text-primary);
}

header>div button {
  margin-left: .5rem;
  padding: .5rem;
  border-radius: .25rem;
  background-color: var(--background-tertiary);
  font-size: .8rem;
  border: 1px solid var(--border-color);
  cursor: pointer;
  transition: all 0.2s;
}

header>div button:hover {
  background-color: var(--primary);
  color: white;
  border-color: var(--primary);
}

.content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.snippets {
  flex: 1;
  height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  margin-top: .5rem;
}

.snippet {
  padding: .25rem .5rem;
  margin-bottom: .5rem;
  background-color: var(--background-secondary);
  border-radius: .25rem;
  position: relative;
  border: 1px solid var(--border-color);
  transition: all 0.2s;
}

.snippet:hover {
  border-color: var(--primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.snippet .delete-btn {
  position: absolute;
  right: 0;
  top: 0;
  padding: .25rem;
  background-color: var(--background-tertiary);
  border-radius: 0.25rem;
  border: 1px solid var(--border-color);
  cursor: pointer;
  transition: all 0.2s;
}

.snippet .delete-btn:hover {
  background-color: var(--danger);
  color: white;
  border-color: var(--danger);
}

.snippet>* {
  font-size: .8rem;
  word-wrap: break-word;
  overflow-wrap: break-word;
  white-space: pre-wrap;
}

.snippet h5 {
  margin-bottom: .25rem;
  color: var(--text-primary);
}

.snippet-content {
  cursor: pointer;
  color: var(--text-secondary);
  padding: 0.5rem;
  background-color: var(--background-tertiary);
  border-radius: 0.25rem;
  margin-top: 0.25rem;
  max-height: 8rem;
  overflow-y: auto;
}

.snippet-content:hover {
  background-color: var(--background-primary);
}
</style>
