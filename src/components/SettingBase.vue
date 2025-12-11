<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useSettingStore } from '@/stores/SettingStore'
import type { GridLineStyle } from '@/types'
import { $confirm } from '@/plugins/confirm'
import SelectCoverPopup from './SelectCoverPopup.vue'

const props = defineProps<{ title: string }>()
const settingStore = useSettingStore()

// 从 store 中获取设置
const settings = settingStore.baseSettings

/** 选择背景图片弹窗 */
const selectBackgroundPopupRef = ref<InstanceType<typeof SelectCoverPopup>>()

// 临时输入值（用于失焦后才生效）
const tempBaseFontSize = ref(settings.baseFontSize)
const tempEditorFontSize = ref(settings.editorFontSize)
const tempLineHeight = ref(settings.lineHeight)

// 监听store的变化，同步临时变量（如重置设置时）
watch(() => settings.baseFontSize, (newVal) => {
  tempBaseFontSize.value = newVal
})
watch(() => settings.editorFontSize, (newVal) => {
  tempEditorFontSize.value = newVal
})
watch(() => settings.lineHeight, (newVal) => {
  tempLineHeight.value = newVal
})

// 颜色转换：将 8 位格式 (#rrggbbaa) 转换为 6 位格式 (#rrggbb)
const toSixDigitColor = (color: string): string => {
  if (color && color.length === 9) {
    return color.substring(0, 7) // 去掉透明度部分
  }
  return color
}

// 颜色转换：将 6 位格式 (#rrggbb) 转换回 8 位格式 (#rrggbbaa)，保留原透明度
const toEightDigitColor = (newColor: string, oldColor: string): string => {
  if (oldColor && oldColor.length === 9 && newColor.length === 7) {
    return newColor + oldColor.substring(7) // 保留原透明度
  }
  return newColor
}

// 实体样式颜色的计算属性（6位格式）
const underlineColorSix = computed(() => toSixDigitColor(settings.entityStyle.underlineColor))
const backgroundColorSix = computed(() => toSixDigitColor(settings.entityStyle.backgroundColor))
const textColorSix = computed(() => toSixDigitColor(settings.entityStyle.color))

// 处理颜色更新（保留透明度）
const handleUnderlineColorChange = (e: Event) => {
  const newColor = (e.target as HTMLInputElement).value
  const fullColor = toEightDigitColor(newColor, settings.entityStyle.underlineColor)
  settingStore.updateEntityStyle('underlineColor', fullColor)
}

const handleBackgroundColorChange = (e: Event) => {
  const newColor = (e.target as HTMLInputElement).value
  const fullColor = toEightDigitColor(newColor, settings.entityStyle.backgroundColor)
  settingStore.updateEntityStyle('backgroundColor', fullColor)
}

const handleTextColorChange = (e: Event) => {
  const newColor = (e.target as HTMLInputElement).value
  const fullColor = toEightDigitColor(newColor, settings.entityStyle.color)
  settingStore.updateEntityStyle('color', fullColor)
}

// 基准尺寸失焦处理
const handleBaseFontSizeBlur = () => {
  const value = Number(tempBaseFontSize.value)
  if (value >= 12 && value <= 24) {
    settingStore.updateBaseFontSize(value)
  } else {
    // 如果不在范围内，恢复为store中的值
    tempBaseFontSize.value = settings.baseFontSize
  }
}

// 编辑区文字尺寸失焦处理
const handleEditorFontSizeBlur = () => {
  const value = Number(tempEditorFontSize.value)
  if (value >= 0.5 && value <= 3) {
    settingStore.updateEditorFontSize(value)
  } else {
    // 如果不在范围内，恢复为store中的值
    tempEditorFontSize.value = settings.editorFontSize
  }
}

// 行高失焦处理
const handleLineHeightBlur = () => {
  const value = Number(tempLineHeight.value)
  if (value >= 1 && value <= 5) {
    settingStore.updateLineHeight(value)
  } else {
    // 如果不在范围内，恢复为store中的值
    tempLineHeight.value = settings.lineHeight
  }
}

// 处理图片上传
const handleImageUpload = () => {
  selectBackgroundPopupRef.value?.show(settings.backgroundImageId)
}

// 选择背景图片后的回调
const handleSelectBackground = (imageId: string) => {
  settingStore.setBackgroundImage(imageId)
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
            <input type="number" v-model="tempBaseFontSize" @blur="handleBaseFontSizeBlur" min="12" max="24">
            <span class="unit">px</span>
          </div>
        </label>
      </div>

      <!-- 编辑区文字尺寸 -->
      <div class="setting-item">
        <label>
          <span class="label-text">编辑区文字尺寸，该值为基准尺寸的倍数</span>
          <div class="input-group">
            <input type="number" v-model="tempEditorFontSize" @blur="handleEditorFontSizeBlur" min="0.5" max="3" step="0.1">
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

      <!-- 自动完成延迟 -->
      <div class="setting-item">
        <label>
          <span class="label-text">自动完成悬浮层延迟（输入后多久显示实体匹配提示）</span>
          <div class="input-group">
            <input type="number" :value="settings.autoCompleteDelay" @input="e => settingStore.updateAutoCompleteDelay(Number((e.target as HTMLInputElement).value))" min="0" max="2000" step="50">
            <span class="unit">毫秒（默认0，即立即显示）</span>
          </div>
        </label>
      </div>

      <!-- 字体行高 -->
      <div class="setting-item">
        <label>
          <span class="label-text">字体行高（默认2.5倍字体高度）</span>
          <div class="input-group">
            <input type="number" v-model="tempLineHeight" @blur="handleLineHeightBlur" min="1" max="5" step="0.1">
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
            <input type="color" :value="underlineColorSix" @input="handleUnderlineColorChange" :disabled="!settings.entityStyle.underline">
          </label>
        </div>
        <div class="setting-item">
          <label class="checkbox-label">
            <input type="checkbox" :checked="settings.entityStyle.background" @change="e => settingStore.updateEntityStyle('background', (e.target as HTMLInputElement).checked)">
            <span>背景色</span>
            <input type="color" :value="backgroundColorSix" @input="handleBackgroundColorChange" :disabled="!settings.entityStyle.background">
          </label>
        </div>
        <div class="setting-item">
          <label class="checkbox-label">
            <input type="checkbox" :checked="settings.entityStyle.textColor" @change="e => settingStore.updateEntityStyle('textColor', (e.target as HTMLInputElement).checked)">
            <span>文字色</span>
            <input type="color" :value="textColorSix" @input="handleTextColorChange" :disabled="!settings.entityStyle.textColor">
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

      </div>

      <!-- 重置按钮 -->
      <div class="button-group">
        <button class="reset-btn" @click="resetSettings">重置为默认</button>
      </div>
    </div>
  </div>

  <!-- 选择背景图片弹窗 -->
  <SelectCoverPopup ref="selectBackgroundPopupRef" @select="handleSelectBackground" />
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
