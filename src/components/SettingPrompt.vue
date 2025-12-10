<script setup lang="ts">
import { getDefaultPrompt } from '@/defaultObjects'
import { $tips } from '@/plugins/notyf'
import { usePromptsStore, type Prompt } from '@/stores/PromptsStore'
import { ref } from 'vue'

const props = defineProps<{ title: string }>()

const prompts = usePromptsStore()
const newPrompt = ref(getDefaultPrompt())

function add() {
  if (newPrompt.value.title.trim() === '' || newPrompt.value.prompt.trim() === '') {
    return $tips.error('标题和内容不能为空')
  }

  prompts.add(newPrompt.value)
  newPrompt.value = getDefaultPrompt()
  $tips.success('添加成功')
}

/** 复制 */
function copy(text: string) {
  navigator.clipboard.writeText(text)
  $tips.success('已复制', 1000)
}

function remove(prompt: Prompt) {
  prompts.remove(prompt)
  $tips.success('删除成功')
}

</script>

<template>
  <div class="base-setting">
    <div class="title">{{ props.title }}</div>
    <div class="content">
      <div class="form-section">
        <textarea placeholder="提示词内容" v-model="newPrompt.prompt"></textarea>
        <div class="form-actions">
          <input type="text" placeholder="提示词标题" v-model="newPrompt.title">
          <button @click="add">添加提示词</button>
        </div>
      </div>
      <div class="items-list">
        <div class="item-card" v-for="prompt in prompts.v" :key="prompt.id">
          <div class="item-header">
            <h5>{{ prompt.title }}</h5>
            <button class="delete-btn" title="删除" @click="remove(prompt)">🗑️</button>
          </div>
          <div class="item-content" title="提示词内容，点我复制" @click="copy(prompt.prompt)">{{ prompt.prompt }}</div>
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
  padding: 1rem;
  background-color: var(--background-secondary);
  border-radius: 0.5rem;
  margin-bottom: 1rem;
  border: 1px solid var(--border-color);
}

.form-section textarea {
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
  position: relative;
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
