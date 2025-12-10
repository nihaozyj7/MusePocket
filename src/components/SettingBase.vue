<script setup lang="ts">
import { ref } from 'vue'
import { useSettingStore } from '@/stores/SettingStore'
import type { GridLineStyle } from '@/types'
import { $confirm } from '@/plugins/confirm'

const props = defineProps<{ title: string }>()
const settingStore = useSettingStore()

// 从 store 中获取设置
const settings = settingStore.baseSettings

// 处理图片上传
const handleImageUpload = () => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const base64 = event.target?.result as string
      settingStore.setBackgroundImage(base64)
    }
    reader.readAsDataURL(file)
  }
  input.click()
}

// 重置设置
const resetSettings = async () => {
  if (await $confirm('确定要重置所有基础设置为默认值吗？')) {
    settingStore.resetBaseSettings()
  }
}
</script>

<template>
  <div class="base-setting">
    <div class="title">{{ props.title }}</div>
    <div class="content">
      <!-- 基准尺寸 -->
      <div class="setting-item">
        <label>
          <span class="label-text">基准尺寸，影响全局文字和UI</span>
          <div class="input-group">
            <input type="number" :value="settings.baseFontSize" @input="e => settingStore.updateBaseFontSize(Number((e.target as HTMLInputElement).value))" min="12" max="24">
            <span class="unit">px</span>
          </div>
        </label>
      </div>

      <!-- 编辑区文字尺寸 -->
      <div class="setting-item">
        <label>
          <span class="label-text">编辑区文字尺寸，该值为基准尺寸的倍数</span>
          <div class="input-group">
            <input type="number" :value="settings.editorFontSize" @input="e => settingStore.updateEditorFontSize(Number((e.target as HTMLInputElement).value))" min="0.5" max="3" step="0.1">
            <span class="unit">rem</span>
          </div>
        </label>
      </div>

      <!-- 自动保存间隔 -->
      <div class="setting-item">
        <label>
          <span class="label-text">自动保存间隔</span>
          <div class="input-group">
            <input type="number" :value="settings.autoSaveInterval" @input="e => settingStore.updateAutoSaveInterval(Number((e.target as HTMLInputElement).value))" min="1" max="60">
            <span class="unit">秒（默认3秒）</span>
          </div>
        </label>
      </div>

      <!-- 字体行高 -->
      <div class="setting-item">
        <label>
          <span class="label-text">字体行高（默认2.5倍字体高度）</span>
          <div class="input-group">
            <input type="number" :value="settings.lineHeight" @input="e => settingStore.updateLineHeight(Number((e.target as HTMLInputElement).value))" min="1" max="5" step="0.1">
            <span class="unit">倍字体高度</span>
          </div>
        </label>
      </div>

      <!-- 段间距 -->
      <div class="setting-item">
        <label class="checkbox-label">
          <input type="checkbox" :checked="settings.enableParagraphSpacing" @change="e => settingStore.toggleParagraphSpacing((e.target as HTMLInputElement).checked)">
          <span>段间距，开启后，段落之间会有一个不可编辑的当前行高的空白行</span>
        </label>
      </div>

      <!-- 实体样式 -->
      <div class="setting-group">
        <div class="group-title">突出文章中实体的样式</div>
        <div class="setting-item">
          <label class="checkbox-label">
            <input type="checkbox" :checked="settings.entityStyle.underline" @change="e => settingStore.updateEntityStyle('underline', (e.target as HTMLInputElement).checked)">
            <span>下划线</span>
            <input type="color" :value="settings.entityStyle.underlineColor" @input="e => settingStore.updateEntityStyle('underlineColor', (e.target as HTMLInputElement).value)" :disabled="!settings.entityStyle.underline">
          </label>
        </div>
        <div class="setting-item">
          <label class="checkbox-label">
            <input type="checkbox" :checked="settings.entityStyle.background" @change="e => settingStore.updateEntityStyle('background', (e.target as HTMLInputElement).checked)">
            <span>背景色</span>
            <input type="color" :value="settings.entityStyle.backgroundColor" @input="e => settingStore.updateEntityStyle('backgroundColor', (e.target as HTMLInputElement).value)" :disabled="!settings.entityStyle.background">
          </label>
        </div>
        <div class="setting-item">
          <label class="checkbox-label">
            <input type="checkbox" :checked="settings.entityStyle.textColor" @change="e => settingStore.updateEntityStyle('textColor', (e.target as HTMLInputElement).checked)">
            <span>文字色</span>
            <input type="color" :value="settings.entityStyle.color" @input="e => settingStore.updateEntityStyle('color', (e.target as HTMLInputElement).value)" :disabled="!settings.entityStyle.textColor">
          </label>
        </div>
      </div>

      <!-- 纯文本粘贴 -->
      <div class="setting-item">
        <label class="checkbox-label">
          <input type="checkbox" :checked="settings.usePlainTextPaste" @change="e => settings.usePlainTextPaste = (e.target as HTMLInputElement).checked">
          <span>复制粘贴时使用纯文本，开启后，复制文章中的实体节点，粘贴后将变更为普通文本</span>
        </label>
      </div>

      <!-- 插入实体为文本 -->
      <div class="setting-item">
        <label class="checkbox-label">
          <input type="checkbox" :checked="settings.insertEntityAsPlainText" @change="e => settings.insertEntityAsPlainText = (e.target as HTMLInputElement).checked">
          <span>插入实体为普通文本，不勾选时插入的是实体节点，实体内容将同步更新文章中的节点</span>
        </label>
      </div>

      <!-- 网格线和背景 -->
      <div class="setting-group">
        <div class="group-title">配置背景</div>
        <div class="setting-item">
          <label class="checkbox-label">
            <input type="checkbox" :checked="settings.enableGridLines" @change="e => settingStore.toggleGridLines((e.target as HTMLInputElement).checked)">
            <span>编辑区启用网格线</span>
            <select :value="settings.gridLineStyle" @change="e => settingStore.updateGridLineStyle((e.target as HTMLSelectElement).value as GridLineStyle)" :disabled="!settings.enableGridLines">
              <option value="dashed">虚线</option>
              <option value="solid">实线</option>
            </select>
          </label>
        </div>
        <div class="setting-item">
          <label class="checkbox-label">
            <input type="checkbox" :checked="settings.enableBackgroundImage" @change="e => settingStore.toggleBackgroundImage((e.target as HTMLInputElement).checked)">
            <span>编辑界面启用图片背景</span>
            <button @click="handleImageUpload" :disabled="!settings.enableBackgroundImage">
              🖼️ 选择图片
            </button>
          </label>
        </div>
        <div class="setting-item" v-show="settings.enableBackgroundImage">
          <label>
            <span class="label-text">编辑区背景透明度：{{ (settings.editorBackgroundOpacity * 100).toFixed(0) }}%</span>
            <input class="range-input" type="range" :value="settings.editorBackgroundOpacity" @input="e => settingStore.updateEditorOpacity(Number((e.target as HTMLInputElement).value))" min="0" max="1" step="0.01" :disabled="!settings.enableBackgroundImage">
          </label>
        </div>
      </div>

      <!-- 重置按钮 -->
      <div class="button-group">
        <button class="reset-btn" @click="resetSettings">重置为默认</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.setting-item {
  margin-bottom: 1rem;
}

.setting-item label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.label-text {
  color: var(--text-secondary);
  font-size: 0.85rem;
  flex: 1;
  min-width: 200px;
}

.input-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.unit {
  color: var(--text-secondary);
  font-size: 0.85rem;
  white-space: nowrap;
}

.setting-group {
  margin: 1.5rem 0;
  padding: 1rem;
  background-color: var(--background-secondary);
  border-radius: 0.5rem;
  border: 1px solid var(--border-color);
}

.group-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--border-color);
}

.range-input {
  flex: 1;
  min-width: 10rem;
  height: 0.3rem;
  background: var(--background-tertiary);
  border-radius: 0.25rem;
  outline: none;
  cursor: pointer;
}

.range-input::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 1rem;
  height: 1rem;
  background: var(--primary);
  border-radius: 50%;
  cursor: pointer;
}

.range-input::-moz-range-thumb {
  width: 1rem;
  height: 1rem;
  background: var(--primary);
  border-radius: 50%;
  cursor: pointer;
  border: none;
}

.range-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.button-group {
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color);
  display: flex;
  gap: 1rem;
}

.reset-btn:hover {
  background-color: var(--danger) !important;
  border-color: var(--danger) !important;
}
</style>
