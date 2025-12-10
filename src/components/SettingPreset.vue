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
const isFormExpanded = ref(false)

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
  try {
    const result = await $confirm(`确定要应用配置预设“${preset.title}”吗？这将覆盖当前的基础设置。`)
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
  <div class="base-setting">
    <div class="title">{{ props.title }}</div>
    <div class="content">
      <!-- 折叠表单区域 -->
      <div class="form-section" :class="{ collapsed: !isFormExpanded }">
        <div class="form-header" @click="isFormExpanded = !isFormExpanded">
          <span class="form-title">{{ isFormExpanded ? '📝 保存为配置预设' : '➕ 保存为配置预设' }}</span>
          <span class="toggle-icon">{{ isFormExpanded ? '▼' : '▶' }}</span>
        </div>
        <div class="form-body" v-show="isFormExpanded">
          <div class="form-item">
            <input type="text" placeholder="配置预设名称" v-model="newPreset.title">
            <button @click="saveCurrentAsPreset">保存当前设置为预设</button>
          </div>
          <div class="tip">💡 提示：输入配置预设名称后，点击“保存当前设置为预设”按钮，将当前的基础设置保存为配置预设。</div>
        </div>
      </div>
      <div class="items-list">
        <div class="preset-card" v-for="preset in presetsStore.v" :key="preset.id">
          <div class="preset-header">
            <h5>{{ preset.title }}</h5>
            <div class="preset-actions">
              <button class="apply-btn" title="应用此预设" @click="applyPreset(preset)">✓ 应用</button>
              <button class="delete-btn" title="删除" @click="remove(preset)">🗑️</button>
            </div>
          </div>
          <div class="preset-details">
            <span class="detail-tag">字体大小: {{ preset.settings.baseFontSize }}px</span>
            <span class="detail-tag">行高: {{ preset.settings.lineHeight }}</span>
            <span class="detail-tag">自动保存: {{ preset.settings.autoSaveInterval }}s</span>
            <span class="detail-tag" v-if="preset.settings.enableGridLines">网格线: {{ preset.settings.gridLineStyle }}</span>
            <span class="detail-tag" v-if="preset.settings.enableBackgroundImage">背景图片已启用</span>
          </div>
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

.form-item {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  margin-bottom: 0.75rem;
}

.form-item input {
  flex: 1;
}

.tip {
  font-size: 0.8rem;
  color: var(--text-secondary);
  padding: 0.75rem;
  background-color: var(--background-tertiary);
  border-radius: 0.25rem;
  border-left: 3px solid var(--primary);
  line-height: 1.6;
}

.items-list {
  flex: 1;
  height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.preset-card {
  padding: 1rem;
  background-color: var(--background-secondary);
  border-radius: 0.5rem;
  border: 1px solid var(--border-color);
  transition: all 0.2s;
}

.preset-card:hover {
  border-color: var(--primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.preset-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.preset-header h5 {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-primary);
}

.preset-actions {
  display: flex;
  gap: 0.5rem;
}

.preset-actions button {
  padding: 0.35rem 0.75rem;
  font-size: 0.8rem;
}

.apply-btn:hover {
  background-color: var(--success) !important;
  border-color: var(--success) !important;
}

.delete-btn:hover {
  background-color: var(--danger) !important;
  border-color: var(--danger) !important;
}

.preset-details {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.detail-tag {
  padding: 0.35rem 0.75rem;
  background-color: var(--background-tertiary);
  border-radius: 0.25rem;
  font-size: 0.8rem;
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
}
</style>
