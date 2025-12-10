<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useSettingStore } from '@/stores/SettingStore'
import { $confirm } from '@/plugins/confirm'
import type { ShortcutKeys } from '@/types'

const props = defineProps<{ title: string }>()
const settingStore = useSettingStore()

// 当前正在编辑的输入框
const activeInput = ref<keyof ShortcutKeys | null>(null)
// 按下的按键组合
const pressedKeys = ref<Set<string>>(new Set())

// 键名映射，用于统一按键显示
const keyNameMap: Record<string, string> = {
  Control: 'Ctrl',
  Meta: 'Cmd',
  ' ': 'Space'
}

// 处理按键按下
const handleKeyDown = (e: KeyboardEvent, key: keyof ShortcutKeys) => {
  e.preventDefault()

  const keyName = keyNameMap[e.key] || e.key

  // 忽略单独的修饰键
  if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) {
    return
  }

  const keys: string[] = []
  if (e.ctrlKey || e.metaKey) keys.push('Ctrl')
  if (e.altKey) keys.push('Alt')
  if (e.shiftKey) keys.push('Shift')
  keys.push(keyName.toUpperCase())

  const shortcut = keys.join('+')
  settingStore.updateShortcutKey(key, shortcut)
}

// 获取焦点时记录当前激活的输入框
const handleFocus = (key: keyof ShortcutKeys) => {
  activeInput.value = key
}

// 失去焦点时清除激活状态
const handleBlur = () => {
  activeInput.value = null
  pressedKeys.value.clear()
}

// 重置到默认值
const resetToDefault = async () => {
  if (await $confirm('确定要重置所有快捷键为默认值吗？')) {
    settingStore.resetShortcutKeys()
  }
}
</script>

<template>
  <div class="base-setting">
    <div class="title">{{ props.title }}</div>
    <div class="content">
      <div class="shortcut-section">
        <label class="sitem" for="shortcut-save">
          <span class="label-text">保存：</span>
          <input id="shortcut-save" type="text" readonly :value="settingStore.shortcutKeys.save" @keydown="e => handleKeyDown(e, 'save')" @focus="() => handleFocus('save')" @blur="handleBlur" placeholder="按下快捷键组合">
        </label>

        <label class="sitem" for="shortcut-format">
          <span class="label-text">一键排版：</span>
          <input id="shortcut-format" type="text" readonly :value="settingStore.shortcutKeys.format" @keydown="e => handleKeyDown(e, 'format')" @focus="() => handleFocus('format')" @blur="handleBlur" placeholder="按下快捷键组合">
        </label>
      </div>

      <div class="shortcut-section">
        <label class="sitem" for="shortcut-find">
          <span class="label-text">查找：</span>
          <input id="shortcut-find" type="text" readonly :value="settingStore.shortcutKeys.find" @keydown="e => handleKeyDown(e, 'find')" @focus="() => handleFocus('find')" @blur="handleBlur" placeholder="按下快捷键组合">
        </label>

        <label class="sitem" for="shortcut-replace">
          <span class="label-text">替换：</span>
          <input id="shortcut-replace" type="text" readonly :value="settingStore.shortcutKeys.replace" @keydown="e => handleKeyDown(e, 'replace')" @focus="() => handleFocus('replace')" @blur="handleBlur" placeholder="按下快捷键组合">
        </label>
      </div>

      <div class="button-group">
        <button class="reset-btn" @click="resetToDefault">重置为默认</button>
      </div>

      <div class="hint">
        <p>提示：点击输入框后直接按下您想要设置的快捷键组合</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.shortcut-section {
  display: flex;
  gap: 2rem;
  margin-bottom: 1rem;
}

.sitem {
  display: flex;
  align-items: center;
  flex: 1;
}

.label-text {
  width: 6rem;
  text-align: right;
  margin-right: 0.5rem;
  color: var(--text-secondary);
}

input {
  width: 10rem !important;
  border: 1px solid var(--border-color);
  padding: .25rem .5rem;
  border-radius: .25rem;
  background-color: var(--background-secondary);
  color: var(--text-primary);
  cursor: pointer;
  transition: border-color 0.2s;
}

input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: var(--shadow-sm);
}

input::placeholder {
  color: var(--text-tertiary);
}

.button-group {
  margin-top: 2rem;
  display: flex;
  gap: 1rem;
}

.reset-btn {
  padding: 0.5rem 1rem;
  border: 1px solid var(--border-color);
  border-radius: .25rem;
  background-color: var(--background-secondary);
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.2s;
}

.reset-btn:hover {
  background-color: var(--background-tertiary);
  border-color: var(--primary);
  color: var(--primary);
}

.hint {
  margin-top: 2rem;
  padding: 1rem;
  background-color: var(--background-secondary);
  border-radius: .25rem;
  color: var(--text-tertiary);
  font-size: 0.9rem;
}

.hint p {
  margin: 0;
}
</style>
