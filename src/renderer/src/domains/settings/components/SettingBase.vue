<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useSettingStore } from '@domains/settings/stores/settings.store'
import type { GridLineStyle } from '@shared/types'
import { $confirm } from '@app/plugins'
import { SelectCoverPopup } from '@shared/components'
import { proofreadingService } from '@domains/editor/services/proofreading.service'
import { $tips } from '@app/plugins/notyf'

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

// 纠错相关状态
const tempProofreadApiUrl = ref(settingStore.proofreadingSettings.apiUrl)
const isTesting = ref(false)

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
watch(() => settingStore.proofreadingSettings.apiUrl, (newVal) => {
  tempProofreadApiUrl.value = newVal
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

// 纠错API地址失焦处理
const handleProofreadApiUrlBlur = () => {
  const url = tempProofreadApiUrl.value.trim()
  settingStore.updateProofreadingApiUrl(url)
  if (url) {
    proofreadingService.setBaseUrl(url)
  }
}

// 测试纠错接口
const testProofreadApi = async () => {
  const url = tempProofreadApiUrl.value.trim()
  if (!url) {
    $tips.error('请先输入纠错接口地址')
    return
  }

  isTesting.value = true
  try {
    const result = await proofreadingService.testConnection(url)
    if (result.success) {
      $tips.success(result.message)
    } else {
      $tips.error(`${result.message}${result.error ? ': ' + result.error : ''}`)
    }
  } catch (error) {
    $tips.error('测试失败')
  } finally {
    isTesting.value = false
  }
}
</script>

<template>
<div class="base-setting">
  <div class="title">{{ props.title }}</div>
  <div class="content">
    <!-- 字体与排版 -->
    <div class="setting-group">
      <div class="group-title">📝 字体与排版</div>
      <div class="setting-item">
        <label>
          <span class="label-text" data-desc="影响全局文字和 UI">基准尺寸</span>
          <div class="input-group">
            <input type="number" v-model="tempBaseFontSize" @blur="handleBaseFontSizeBlur" min="12" max="24">
            <span class="unit">px</span>
          </div>
        </label>
      </div>

      <div class="setting-item">
        <label>
          <span class="label-text" data-desc="该值为基准尺寸的倍数">编辑区文字尺寸</span>
          <div class="input-group">
            <input type="number" v-model="tempEditorFontSize" @blur="handleEditorFontSizeBlur" min="0.5" max="3" step="0.1">
            <span class="unit">rem</span>
          </div>
        </label>
      </div>

      <div class="setting-item">
        <label>
          <span class="label-text" data-desc="默认 2.5 倍字体高度">字体行高</span>
          <div class="input-group">
            <input type="number" v-model="tempLineHeight" @blur="handleLineHeightBlur" min="1" max="5" step="0.1">
            <span class="unit">倍字体高度</span>
          </div>
        </label>
      </div>

      <div class="setting-item">
        <label class="checkbox-label">
          <input type="checkbox" :checked="settings.enableParagraphSpacing" @change="e => settingStore.toggleParagraphSpacing((e.target as HTMLInputElement).checked)">
          <span class="label-text" data-desc="段落之间会有一个不可编辑的当前行高的空白行">启用段间距</span>
        </label>
      </div>

    </div>

    <!-- 实体样式 -->
    <div class="setting-group">
      <div class="group-title">🏷️ 实体样式</div>
      <div class="setting-item">
        <label class="checkbox-label">
          <input type="checkbox" :checked="settings.entityStyle.underline" @change="e => settingStore.updateEntityStyle('underline', (e.target as HTMLInputElement).checked)">
          <span class="label-text">下划线</span>
          <input type="color" :value="underlineColorSix" @input="handleUnderlineColorChange" :disabled="!settings.entityStyle.underline">
        </label>
      </div>
      <div class="setting-item">
        <label class="checkbox-label">
          <input type="checkbox" :checked="settings.entityStyle.background" @change="e => settingStore.updateEntityStyle('background', (e.target as HTMLInputElement).checked)">
          <span class="label-text">背景色</span>
          <input type="color" :value="backgroundColorSix" @input="handleBackgroundColorChange" :disabled="!settings.entityStyle.background">
        </label>
      </div>
      <div class="setting-item">
        <label class="checkbox-label">
          <input type="checkbox" :checked="settings.entityStyle.textColor" @change="e => settingStore.updateEntityStyle('textColor', (e.target as HTMLInputElement).checked)">
          <span class="label-text">文字色</span>
          <input type="color" :value="textColorSix" @input="handleTextColorChange" :disabled="!settings.entityStyle.textColor">
        </label>
      </div>
      <div class="setting-item">
        <label class="checkbox-label">
          <input type="checkbox" :checked="settings.insertEntityAsPlainText" @change="e => settings.insertEntityAsPlainText = (e.target as HTMLInputElement).checked">
          <span class="label-text" data-desc="不勾选时插入的是实体节点，实体内容将同步更新文章中的节点">插入实体为普通文本</span>
        </label>
      </div>
    </div>

    <!-- 编辑行为 -->
    <div class="setting-group">
      <div class="group-title">⚙️ 编辑行为</div>
      <div class="setting-item">
        <label>
          <span class="label-text">自动保存间隔</span>
          <div class="input-group">
            <input type="number" :value="settings.autoSaveInterval" @input="e => settingStore.updateAutoSaveInterval(Number((e.target as HTMLInputElement).value))" min="1" max="60">
            <span class="unit">秒</span>
          </div>
        </label>
      </div>

      <div class="setting-item">
        <label class="checkbox-label">
          <input type="checkbox" :checked="settings.usePlainTextPaste" @change="e => settings.usePlainTextPaste = (e.target as HTMLInputElement).checked">
          <span class="label-text" data-desc="粘贴时对文本进行清洗，粘贴后将变更为普通文本">使用纯文本粘贴</span>
        </label>
      </div>
    </div>

    <!-- 自动完成 -->
    <div class="setting-group">
      <div class="group-title">💡 自动完成</div>
      <div class="setting-item">
        <label>
          <span class="label-text" data-desc="输入后多久显示实体匹配提示">悬浮层延迟</span>
          <div class="input-group">
            <input type="number" :value="settings.autoCompleteDelay" @input="e => settingStore.updateAutoCompleteDelay(Number((e.target as HTMLInputElement).value))" min="0" max="2000" step="50">
            <span class="unit">毫秒</span>
          </div>
        </label>
      </div>

      <div class="setting-item">
        <label>
          <span class="label-text">确认插入按键</span>
          <select :value="settings.autoCompleteConfirmKey" @change="e => settings.autoCompleteConfirmKey = (e.target as HTMLSelectElement).value as 'tab' | 'enter' | 'both'">
            <option value="tab">Tab 键</option>
            <option value="enter">Enter 键</option>
            <option value="both">Tab 或 Enter 键</option>
          </select>
        </label>
      </div>

      <div class="setting-item">
        <label class="checkbox-label">
          <input type="checkbox" :checked="settings.autoCompleteDefaultSelect" @change="e => settings.autoCompleteDefaultSelect = (e.target as HTMLInputElement).checked">
          <span class="label-text" data-desc="关闭后需要使用上下方向键手动选择">默认选中第一个建议</span>
        </label>
      </div>
    </div>

    <!-- 视觉背景 -->
    <div class="setting-group">
      <div class="group-title">🎨 视觉背景</div>
      <div class="setting-item">
        <label class="checkbox-label">
          <input type="checkbox" :checked="settings.enableGridLines" @change="e => settingStore.toggleGridLines((e.target as HTMLInputElement).checked)">
          <span class="label-text">启用网格线</span>
          <select :value="settings.gridLineStyle" @change="e => settingStore.updateGridLineStyle((e.target as HTMLSelectElement).value as GridLineStyle)" :disabled="!settings.enableGridLines">
            <option value="dashed">虚线</option>
            <option value="solid">实线</option>
          </select>
        </label>
      </div>
      <div class="setting-item">
        <label class="checkbox-label">
          <input type="checkbox" :checked="settings.enableBackgroundImage" @change="e => settingStore.toggleBackgroundImage((e.target as HTMLInputElement).checked)">
          <span class="label-text">启用图片背景</span>
          <button @click="handleImageUpload" :disabled="!settings.enableBackgroundImage">
            🖼️ 选择图片
          </button>
        </label>
      </div>
    </div>

    <!-- 纠错设置 -->
    <div class="setting-group">
      <div class="group-title">✅ 纠错设置</div>
      <div class="setting-item">
        <label>
          <span class="label-text" data-desc="本地纠错服务的 API 地址">纠错接口地址</span>
          <div class="input-group">
            <input type="text" v-model="tempProofreadApiUrl" @blur="handleProofreadApiUrlBlur" placeholder="例如：http://localhost:3006" style="min-width: 250px;">
            <button @click="testProofreadApi" :disabled="isTesting || !tempProofreadApiUrl.trim()" class="test-btn">
              {{ isTesting ? '测试中...' : '🔍 测试接口' }}
            </button>
          </div>
        </label>
      </div>

      <div class="setting-item">
        <label class="checkbox-label">
          <input type="checkbox" :checked="settingStore.proofreadingSettings.autoProofread" @change="e => settingStore.toggleAutoProofread((e.target as HTMLInputElement).checked)">
          <span class="label-text" data-desc="开启后编辑器将自动检测文本错误（需要接口地址配置且服务可用）">启用自动纠错</span>
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
  gap: .5rem;
  flex-wrap: wrap;
}
.checkbox-label {
  font-size: 1rem;
}
.checkbox-label .label-text {
  font-size: 1rem;
}
.label-text {
  font-size: 1rem;
  font-weight: 500;
  color: var(--text-primary);
  min-width: 120px;
  position: relative;
  cursor: help;
}
.label-text:hover::after {
  content: attr(data-desc);
  position: absolute;
  left: 0;
  top: 100%;
  background-color: var(--background-tertiary);
  color: var(--text-secondary);
  font-size: 0.85rem;
  font-weight: 400;
  padding: 0.5rem 0.75rem;
  border-radius: 0.25rem;
  border: 1px solid var(--border-color);
  white-space: normal;
  max-width: 300px;
  z-index: 100;
  margin-top: 0.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  line-height: 1.5;
}
.label-desc {
  display: none;
}
.input-group {
  display: flex;
  align-items: center;
  gap: .5rem;
}
.unit {
  color: var(--text-secondary);
  font-size: 0.85rem;
  white-space: nowrap;
}
.setting-group {
  margin: 0 0 1.5rem 0;
  padding: 1.25rem;
  background-color: var(--background-secondary);
  border-radius: 0.5rem;
  border: 1px solid var(--border-color);
}
.setting-group:first-of-type {
  margin-top: 0;
}
.group-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  gap: .5rem;
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
  gap: .5rem;
}
.test-btn {
  padding: 0.4rem 0.8rem;
  font-size: 0.85rem;
  white-space: nowrap;
  background-color: var(--primary);
  color: white;
  border: none;
  border-radius: 0.25rem;
  cursor: pointer;
  transition: background-color 0.2s;
}
.test-btn:hover:not(:disabled) {
  background-color: var(--primary-hover);
}
.test-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
