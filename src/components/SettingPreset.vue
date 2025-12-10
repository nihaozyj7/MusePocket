<script setup lang="ts">
import { getDefaultSettingsPreset } from '@/defaultObjects'
import { $tips } from '@/plugins/notyf'
import { $confirm } from '@/plugins/confirm'
import { useSettingsPresetsStore } from '@/stores/PresetsStore'
import { useSettingStore } from '@/stores/SettingStore'
import type { SettingsPreset } from '@/types'
import { ref } from 'vue'

const props = defineProps<{ title: string }>()

const presetsStore = useSettingsPresetsStore()
const settingStore = useSettingStore()
const newPreset = ref(getDefaultSettingsPreset())

function add() {
  if (newPreset.value.title.trim() === '') {
    return $tips.error('配置预设名称不能为空')
  }

  presetsStore.add(newPreset.value)
  newPreset.value = getDefaultSettingsPreset()
  $tips.success('添加成功')
}

function remove(preset: SettingsPreset) {
  presetsStore.remove(preset)
  $tips.success('删除成功')
}

function saveCurrentAsPreset() {
  if (newPreset.value.title.trim() === '') {
    return $tips.error('请输入配置预设名称')
  }

  newPreset.value.settings = JSON.parse(JSON.stringify(settingStore.baseSettings))
  presetsStore.add(newPreset.value)
  newPreset.value = getDefaultSettingsPreset()
  $tips.success('当前设置已保存为配置预设')
}

async function applyPreset(preset: SettingsPreset) {
  console.log('applyPreset called with:', preset.title)
  try {
    const result = await $confirm(`确定要应用配置预设“${preset.title}”吗？这将覆盖当前的基础设置。`)
    console.log('$confirm result:', result)
    if (result) {
      settingStore.baseSettings = JSON.parse(JSON.stringify(preset.settings))
      settingStore.applyBaseSettings()
      $tips.success('配置预设已应用')
    }
  } catch (error) {
    console.error('Error in applyPreset:', error)
  }
}
</script>

<template>
  <div class="base-setting" style="margin: 0 .25rem .25rem .25rem;">
    <div class="title">{{ props.title }}</div>
    <div class="content">
      <header>
        <div class="input-group">
          <input type="text" placeholder="配置预设名称" v-model="newPreset.title">
          <button @click="saveCurrentAsPreset">保存当前设置为预设</button>
        </div>
        <div class="tip">💡 提示：输入配置预设名称后，点击“保存当前设置为预设”按钮，将当前的基础设置保存为配置预设。</div>
      </header>
      <div class="presets">
        <div class="preset" v-for="preset in presetsStore.v" :key="preset.id">
          <div class="preset-header">
            <h5>{{ preset.title }}</h5>
            <div class="preset-actions">
              <button class="apply-btn" title="应用此预设" @click="applyPreset(preset)">✓ 应用</button>
              <button class="delete-btn" title="删除" @click="remove(preset)">🗑️</button>
            </div>
          </div>
          <div class="preset-details">
            <span>字体大小: {{ preset.settings.baseFontSize }}px</span>
            <span>行高: {{ preset.settings.lineHeight }}</span>
            <span>自动保存: {{ preset.settings.autoSaveInterval }}s</span>
            <span v-if="preset.settings.enableGridLines">网格线: {{ preset.settings.gridLineStyle }}</span>
            <span v-if="preset.settings.enableBackgroundImage">背景图片已启用</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
header {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.input-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.input-group input {
  flex: 1;
  padding: 0.5rem;
  border-radius: 0.25rem;
  border: 1px solid var(--border-color);
  font-size: 0.8rem;
  background-color: var(--background-secondary);
  color: var(--text-primary);
}

.input-group button {
  padding: 0.5rem 1rem;
  border-radius: 0.25rem;
  background-color: var(--background-tertiary);
  color: var(--text-primary);
  font-size: 0.8rem;
  border: 1px solid var(--border-color);
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}

.input-group button:hover {
  background-color: var(--primary);
  color: white;
  border-color: var(--primary);
}

.tip {
  font-size: 0.75rem;
  color: var(--text-secondary);
  padding: 0.5rem;
  background-color: var(--background-secondary);
  border-radius: 0.25rem;
  border-left: 3px solid var(--primary);
}

.content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.presets {
  flex: 1;
  height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  margin-top: 1rem;
  gap: 0.5rem;
}

.preset {
  padding: 0.75rem;
  background-color: var(--background-secondary);
  border-radius: 0.25rem;
  border: 1px solid var(--border-color);
  transition: all 0.2s;
}

.preset:hover {
  border-color: var(--primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.preset-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.preset-header h5 {
  margin: 0;
  font-size: 0.9rem;
  color: var(--text-primary);
}

.preset-actions {
  display: flex;
  gap: 0.25rem;
}

.preset-actions button {
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  border: 1px solid var(--border-color);
  background-color: var(--background-tertiary);
  color: var(--text-primary);
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
}

.apply-btn:hover {
  background-color: var(--success);
  color: white;
  border-color: var(--success);
}

.delete-btn:hover {
  background-color: var(--danger);
  color: white;
  border-color: var(--danger);
}

.preset-details {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.preset-details span {
  padding: 0.25rem 0.5rem;
  background-color: var(--background-tertiary);
  border-radius: 0.25rem;
}
</style>
