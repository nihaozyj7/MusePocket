<script setup lang="ts">
import { ref } from 'vue'
import { $tips } from '@app/plugins'
import { Popup } from '@shared/components'

const emit = defineEmits<{
  replace: [findText: string, replaceText: string, isRegex: boolean, replaceAll: boolean]
}>()

/** Popup 组件引用 */
const popupRef = ref<InstanceType<typeof Popup> | null>(null)

/** 查找文本 */
const findText = ref('')
/** 替换文本 */
const replaceText = ref('')
/** 是否使用正则表达式 */
const useRegex = ref(false)
/** 是否区分大小写 */
const caseSensitive = ref(false)
/** 匹配总数 */
const totalMatches = ref(0)
/** 预览内容列表 */
const previewItems = ref<Array<{ text: string; lineNumber: number; matched: boolean }>>([])
/** 当前编辑器内容 */
const editorContent = ref('')

/** 显示弹窗 */
function show(content?: string) {
  // 重置状态
  findText.value = ''
  replaceText.value = ''
  useRegex.value = false
  caseSensitive.value = false
  totalMatches.value = 0
  previewItems.value = []

  if (content) {
    editorContent.value = content
  }

  popupRef.value?.show()
}

/** 关闭弹窗 */
function close() {
  popupRef.value?.close()
}

/** 更新预览 */
function updatePreview() {
  if (!editorContent.value) {
    previewItems.value = []
    totalMatches.value = 0
    return
  }

  const lines = editorContent.value.split('\n')
  previewItems.value = []
  totalMatches.value = 0

  if (!findText.value) {
    previewItems.value = []
    return
  }

  try {
    let pattern: RegExp

    if (useRegex.value) {
      // 正则表达式模式
      const flags = caseSensitive.value ? 'g' : 'gi'
      pattern = new RegExp(findText.value, flags)
    } else {
      // 普通文本模式，转义特殊字符
      const escapedText = findText.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const flags = caseSensitive.value ? 'g' : 'gi'
      pattern = new RegExp(escapedText, flags)
    }

    // 遍历每一行，检查是否匹配
    lines.forEach((line, index) => {
      const hasMatch = pattern.test(line)
      if (hasMatch) {
        totalMatches.value++
        previewItems.value.push({
          text: line || ' ',
          lineNumber: index + 1,
          matched: true
        })
      }
    })

    // 如果没有匹配项，显示提示
    if (previewItems.value.length === 0) {
      totalMatches.value = 0
    }
  } catch (error) {
    // 正则表达式错误
    previewItems.value = []
    totalMatches.value = 0
  }
}

/** 执行查找 */
function handleFind() {
  if (!findText.value) {
    $tips.error('请输入查找内容')
    return
  }

  updatePreview()
}

/** 替换当前 */
function handleReplaceCurrent() {
  if (!findText.value) {
    $tips.error('请输入查找内容')
    return
  }

  emit('replace', findText.value, replaceText.value, useRegex.value, false)
  close()
}

/** 替换全部 */
function handleReplaceAll() {
  if (!findText.value) {
    $tips.error('请输入查找内容')
    return
  }

  emit('replace', findText.value, replaceText.value, useRegex.value, true)
  close()
}

/** 高亮显示匹配文本 */
function highlightText(text: string): string {
  if (!findText.value) return text

  try {
    let pattern: RegExp

    if (useRegex.value) {
      const flags = caseSensitive.value ? 'g' : 'gi'
      pattern = new RegExp(findText.value, flags)
    } else {
      const escapedText = findText.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const flags = caseSensitive.value ? 'g' : 'gi'
      pattern = new RegExp(escapedText, flags)
    }

    return text.replace(pattern, (match) => `<mark>${match}</mark>`)
  } catch (error) {
    return text
  }
}

defineExpose({
  show,
  close,
})
</script>

<template>
<Popup ref="popupRef" title="🔍 查找替换" draggable>
  <div class="find-replace-container">
    <div class="form-group">
      <label>查找内容：</label>
      <input v-model="findText" type="text" placeholder="输入查找内容" @keyup.enter="handleFind" />
    </div>

    <div class="form-group">
      <label>替换为：</label>
      <input v-model="replaceText" type="text" placeholder="输入替换内容" @keyup.enter="handleReplaceCurrent" />
    </div>

    <div class="options">
      <label class="checkbox-label">
        <input type="checkbox" v-model="useRegex" />
        <span>使用正则表达式</span>
      </label>
      <label class="checkbox-label">
        <input type="checkbox" v-model="caseSensitive" />
        <span>区分大小写</span>
      </label>
    </div>

    <div class="hint" v-if="useRegex">
      <p>💡 正则表达式示例：</p>
      <ul>
        <li><code>\d+</code> - 匹配数字</li>
        <li><code>\s+</code> - 匹配空白字符</li>
        <li><code>^开头</code> - 匹配行首</li>
        <li><code>结尾$</code> - 匹配行尾</li>
      </ul>
    </div>

    <div class="actions">
      <button class="btn-secondary" @click="handleFind">🔍 查找</button>
      <button class="btn-primary" @click="handleReplaceCurrent">🔄 替换当前</button>
      <button class="btn-primary" @click="handleReplaceAll">🔄 替换全部</button>
    </div>

    <!-- 预览区域 -->
    <div class="preview-section" v-if="findText">
      <div class="preview-header">
        <h4>📋 预览结果</h4>
        <span class="match-count" v-if="totalMatches > 0">找到 {{ totalMatches }} 处匹配</span>
        <span class="match-count no-match" v-else>未找到匹配</span>
      </div>

      <div class="preview-content scroll-container">
        <div v-for="item in previewItems" :key="item.lineNumber" class="preview-line" :class="{ 'matched': item.matched }">
          <span class="line-number">{{ item.lineNumber }}</span>
          <span class="line-text" v-html="highlightText(item.text)"></span>
        </div>

        <div class="no-results" v-if="previewItems.length === 0 && findText">
          <p>😔 未找到匹配的内容</p>
        </div>
      </div>
    </div>
  </div>
</Popup>
</template>

<style scoped>
.find-replace-container {
  width: 600px;
  max-width: 90vw;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.form-group {
  margin-bottom: 0.75rem;
}
.form-group label {
  display: block;
  margin-bottom: 0.4rem;
  color: var(--text-primary);
  font-size: 0.85rem;
}
.form-group input[type="text"] {
  width: 100%;
  padding: 0.4rem 0.6rem;
  border: 1px solid var(--border-color);
  border-radius: 0.25rem;
  background: var(--background-secondary);
  color: var(--text-primary);
  font-size: 0.85rem;
}
.form-group input[type="text"]:focus {
  outline: none;
  border-color: var(--primary);
}
.options {
  display: flex;
  gap: .5rem;
  margin-bottom: 0.75rem;
}
.hint {
  background: var(--background-tertiary);
  padding: 0.75rem;
  border-radius: 0.25rem;
  margin-bottom: 0.75rem;
  font-size: 0.8rem;
}
.hint p {
  margin: 0 0 0.4rem 0;
  color: var(--text-primary);
  font-weight: bold;
}
.hint ul {
  margin: 0;
  padding-left: 1.2rem;
  color: var(--text-secondary);
}
.hint li {
  margin-bottom: 0.2rem;
}
.hint code {
  background: var(--background-primary);
  padding: 0.1rem 0.3rem;
  border-radius: 0.2rem;
  font-family: monospace;
  color: var(--primary);
}
.actions {
  display: flex;
  gap: .5rem;
  justify-content: flex-end;
  margin-bottom: 0.75rem;
}
.preview-section {
  margin-top: 0.75rem;
  border-top: 1px solid var(--border-color);
  padding-top: 0.75rem;
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}
.preview-header h4 {
  margin: 0;
  font-size: 0.85rem;
  color: var(--text-primary);
}
.match-count {
  font-size: 0.8rem;
  color: var(--primary);
  font-weight: bold;
}
.match-count.no-match {
  color: var(--text-tertiary);
}
.preview-content {
  flex: 1;
  overflow-y: auto;
  background: var(--background-secondary);
  border: 1px solid var(--border-color);
  border-radius: 0.25rem;
  padding: 0.5rem;
}
.preview-line {
  display: flex;
  padding: 0.2rem 0.4rem;
  font-family: monospace;
  font-size: 0.8rem;
  line-height: 1.5;
  border-radius: 0.2rem;
  margin-bottom: 0.2rem;
}
.preview-line.matched {
  background: rgba(var(--primary-rgb, 74, 144, 226), 0.1);
}
.line-number {
  color: var(--text-tertiary);
  margin-right: 0.75rem;
  min-width: 2.5rem;
  text-align: right;
  user-select: none;
}
.line-text {
  color: var(--text-primary);
  flex: 1;
  word-break: break-all;
}
.line-text :deep(mark) {
  background: #ffeb3b;
  color: #000;
  padding: 0.1rem 0.2rem;
  border-radius: 0.2rem;
  font-weight: bold;
}
.no-results {
  text-align: center;
  padding: 1.5rem;
  color: var(--text-tertiary);
}
.no-results p {
  margin: 0;
  font-size: 0.85rem;
}
</style>
