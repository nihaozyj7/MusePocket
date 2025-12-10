<script setup lang="ts">
import { ref } from 'vue'
import { useSettingStore } from '@/stores/SettingStore'
import type { GridLineStyle } from '@/types'

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
const resetSettings = () => {
  if (confirm('确定要重置所有基础设置为默认值吗？')) {
    settingStore.resetBaseSettings()
  }
}
</script>

<template>
  <div class="base-setting">
    <div class="title">{{ props.title }}</div>
    <div class="content" style="margin: 0 .5rem .5rem .5rem;">
      <!-- 基准尺寸 -->
      <label class="sitem">
        <span>基准尺寸，影响全局文字和UI</span>
        <input type="number" :value="settings.baseFontSize" @input="e => settingStore.updateBaseFontSize(Number((e.target as HTMLInputElement).value))" min="12" max="24">
        <span>px</span>
      </label>

      <!-- 编辑区文字尺寸 -->
      <label class="sitem">
        <span>编辑区文字尺寸，该值为基准尺寸的倍数</span>
        <input type="number" :value="settings.editorFontSize" @input="e => settingStore.updateEditorFontSize(Number((e.target as HTMLInputElement).value))" min="0.5" max="3" step="0.1">
        <span>rem</span>
      </label>

      <!-- 自动保存间隔 -->
      <label class="sitem">
        <span>自动保存间隔为</span>
        <input type="number" :value="settings.autoSaveInterval" @input="e => settingStore.updateAutoSaveInterval(Number((e.target as HTMLInputElement).value))" min="1" max="60">
        <span>秒，默认3秒</span>
      </label>

      <!-- 字体行高 -->
      <label class="sitem">
        <span>字体行高，默认为2.5倍字体高度，调整行高为：</span>
        <input type="number" :value="settings.lineHeight" @input="e => settingStore.updateLineHeight(Number((e.target as HTMLInputElement).value))" min="1" max="5" step="0.1">
        <span>倍字体高度</span>
      </label>

      <!-- 段间距 -->
      <label class="sitem">
        <input type="checkbox" :checked="settings.enableParagraphSpacing" @change="e => settingStore.toggleParagraphSpacing((e.target as HTMLInputElement).checked)">
        <span>段间距，开启后，段落之间会有一个不可编辑的当前行高的空白行</span>
      </label>

      <!-- 实体样式 -->
      <div class="sitem">
        <span>突出文章中实体的样式</span>
        <label class="sitem">
          <input type="checkbox" :checked="settings.entityStyle.underline" @change="e => settingStore.updateEntityStyle('underline', (e.target as HTMLInputElement).checked)">
          <span>下划线</span>
          <input type="color" :value="settings.entityStyle.underlineColor" @input="e => settingStore.updateEntityStyle('underlineColor', (e.target as HTMLInputElement).value)" :disabled="!settings.entityStyle.underline">
        </label>
        <label class="sitem">
          <input type="checkbox" :checked="settings.entityStyle.background" @change="e => settingStore.updateEntityStyle('background', (e.target as HTMLInputElement).checked)">
          <span>背景色</span>
          <input type="color" :value="settings.entityStyle.backgroundColor" @input="e => settingStore.updateEntityStyle('backgroundColor', (e.target as HTMLInputElement).value)" :disabled="!settings.entityStyle.background">
        </label>
        <label class="sitem">
          <input type="checkbox" :checked="settings.entityStyle.textColor" @change="e => settingStore.updateEntityStyle('textColor', (e.target as HTMLInputElement).checked)">
          <span>文字色</span>
          <input type="color" :value="settings.entityStyle.color" @input="e => settingStore.updateEntityStyle('color', (e.target as HTMLInputElement).value)" :disabled="!settings.entityStyle.textColor">
        </label>
      </div>

      <!-- 纯文本粘贴 -->
      <label class="sitem">
        <input type="checkbox" :checked="settings.usePlainTextPaste" @change="e => settings.usePlainTextPaste = (e.target as HTMLInputElement).checked">
        <span>复制粘贴时使用纯文本，开启后，复制文章中的实体节点，粘贴后将变更为普通文本</span>
      </label>

      <!-- 插入实体为文本 -->
      <label class="sitem">
        <input type="checkbox" :checked="settings.insertEntityAsPlainText" @change="e => settings.insertEntityAsPlainText = (e.target as HTMLInputElement).checked">
        <span>控制插入实体时，是否插入普通文本，不勾选时插入的是实体节点，实体内容将同步更新文章中的节点</span>
      </label>

      <!-- 网格线和背景 -->
      <div class="sitem">
        <span class="config-label">配置背景，</span>
        <label class="sitem">
          <input type="checkbox" :checked="settings.enableGridLines" @change="e => settingStore.toggleGridLines((e.target as HTMLInputElement).checked)">
          <span>编辑区启用网格线</span>
          <select :value="settings.gridLineStyle" @change="e => settingStore.updateGridLineStyle((e.target as HTMLSelectElement).value as GridLineStyle)" :disabled="!settings.enableGridLines">
            <option value="dashed">虚线</option>
            <option value="solid">实线</option>
          </select>
        </label>
        <label class="sitem">
          <input type="checkbox" :checked="settings.enableBackgroundImage" @change="e => settingStore.toggleBackgroundImage((e.target as HTMLInputElement).checked)">
          <span>编辑界面启用图片背景</span>
          <button class="select-image-button" @click="handleImageUpload" :disabled="!settings.enableBackgroundImage">
            🖼️ 选择图片
          </button>
        </label>
        <label class="sitem" v-show="settings.enableBackgroundImage">
          <span>编辑区背景透明度：{{ (settings.editorBackgroundOpacity * 100).toFixed(0) }}%</span>
          <input type="range" :value="settings.editorBackgroundOpacity" @input="e => settingStore.updateEditorOpacity(Number((e.target as HTMLInputElement).value))" min="0" max="1" step="0.01" :disabled="!settings.enableBackgroundImage">
        </label>
      </div>

      <!-- 重置按钮 -->
      <div class="button-group">
        <button class="reset-btn" @click="resetSettings">重置为默认</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sitem {
  display: flex;
  align-items: center;
  margin-bottom: 1rem;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.sitem span {
  color: var(--text-secondary);
}

.config-label {
  align-self: flex-start;
  line-height: 2rem;
}

input[type="number"] {
  width: 5rem;
  padding: 0.25rem 0.5rem;
  border: 1px solid var(--border-color);
  border-radius: 0.25rem;
  background-color: var(--background-secondary);
  color: var(--text-primary);
}

input[type="checkbox"] {
  width: 1rem;
  height: 1rem;
  cursor: pointer;
}

input[type="color"] {
  width: 3rem;
  height: 2rem;
  border: 1px solid var(--border-color);
  border-radius: 0.25rem;
  cursor: pointer;
  background-color: var(--background-secondary);
}

input[type="color"]:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

select {
  padding: 0.25rem 0.5rem;
  border: 1px solid var(--border-color);
  border-radius: 0.25rem;
  background-color: var(--background-secondary);
  color: var(--text-primary);
  cursor: pointer;
}

select:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

input[type="range"] {
  flex: 1;
  min-width: 10rem;
  height: 0.3rem;
  background: var(--background-tertiary);
  border-radius: 0.25rem;
  outline: none;
  cursor: pointer;
}

input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 1rem;
  height: 1rem;
  background: var(--primary);
  border-radius: 50%;
  cursor: pointer;
}

input[type="range"]::-moz-range-thumb {
  width: 1rem;
  height: 1rem;
  background: var(--primary);
  border-radius: 50%;
  cursor: pointer;
  border: none;
}

input[type="range"]:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.select-image-button {
  padding: 0.5rem 1rem;
  border: 1px solid var(--border-color);
  border-radius: 0.25rem;
  background-color: var(--background-secondary);
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.2s;
}

.select-image-button:hover:not(:disabled) {
  background-color: var(--background-tertiary);
  border-color: var(--primary);
  color: var(--primary);
}

.select-image-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.button-group {
  margin-top: 2rem;
  display: flex;
  gap: 1rem;
}

.reset-btn {
  padding: 0.5rem 1rem;
  border: 1px solid var(--border-color);
  border-radius: 0.25rem;
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
</style>
