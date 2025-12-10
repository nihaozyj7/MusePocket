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
      <header>
        <textarea placeholder="提示词内容" v-model="newPrompt.prompt"></textarea>
        <div>
          <input type="text" placeholder="提示词标题" v-model="newPrompt.title">
          <button @click="add">添加提示词</button>
        </div>
      </header>
      <div class="prompts">
        <div class="prompt" v-for="prompt in prompts.v" :key="prompt.id">
          <h5>{{ prompt.title }}</h5>
          <div title="提示词内容，点我复制" @click="copy(prompt.prompt)">{{ prompt.prompt }}</div>
          <button title="删除" @click="remove(prompt)">🗑️</button>
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
}

header>div button {
  margin-left: .5rem;
  padding: .5rem;
  border-radius: .25rem;
  background-color: var(--background-tertiary) !important;
  font-size: .8rem;
}

.content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.prompts {
  flex: 1;
  height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  margin-top: .5rem;
}

.prompt {
  padding: .25rem .5rem;
  margin-bottom: .5rem;
  background-color: var(--background-secondary);
  border-radius: .25rem;
  position: relative;
}

.prompt button {
  position: absolute;
  right: 0;
  top: 0;
  padding: .25rem;
}

.prompt>* {
  font-size: .8rem;
  word-wrap: break-word;
  overflow-wrap: break-word;
  white-space: normal;
}

.prompt h5 {
  margin-bottom: .25rem;
}
</style>
