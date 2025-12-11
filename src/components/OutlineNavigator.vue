<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import type { OutlineItem } from '@/types'
import { uid } from '@/utils'
import { useModelsStore } from '@/stores/ModelsStore'
import { usePromptsStore } from '@/stores/PromptsStore'
import { openaiFetch, type OpenAiParams } from '@/apis'
import { $tips } from '@/plugins/notyf'
import { useSelectedArticleStore } from '@/stores/SelectedArticleStore'
import { articledb } from '@/db'

interface Props {
  /** 文章ID */
  articleId: string
}

const props = defineProps<Props>()

const modelsStore = useModelsStore()
const promptsStore = usePromptsStore()
const selectedArticleStore = useSelectedArticleStore()

/** 大纲列表 */
const outline = ref<OutlineItem[]>([])
/** 当前正在编辑的大纲项 */
const editingItem = ref<OutlineItem | null>(null)
/** 新增大纲项的输入框 */
const newItemText = ref('')
/** 新增大纲项的级别 */
const newItemLevel = ref(1)
/** 是否显示AI灵感面板 */
const showAiPanel = ref(false)
/** 选中的AI模型 */
const selectedModel = ref<OpenAiParams | null>(null)
/** AI提示词 */
const aiPrompt = ref('')
/** AI灵感类型 */
const aiInspirationMode = ref<'outline' | 'continue' | 'expand'>('outline')
/** 是否正在生成AI内容 */
const isGenerating = ref(false)
/** AI生成的结果 */
const aiResult = ref('')

/** 模型选项 */
const modelOptions = computed(() => modelsStore.v)

/** 是否可以使用AI */
const canUseAi = computed(() => selectedModel.value && aiPrompt.value)

/** 监听文章ID变化,清空大纲 */
watch(() => props.articleId, () => {
  // 可以从本地存储加载该文章的大纲
  loadOutline()
  // 关闭AI面板
  showAiPanel.value = false
  aiResult.value = ''
})

// 初始化AI模型
watch(() => modelOptions.value, (models) => {
  if (models.length > 0 && !selectedModel.value) {
    selectedModel.value = models[0]
  }
}, { immediate: true })

/** 加载大纲(可以扩展为从数据库加载) */
function loadOutline() {
  const saved = localStorage.getItem(`outline_${props.articleId}`)
  if (saved) {
    outline.value = JSON.parse(saved)
  } else {
    outline.value = []
  }
}

/** 保存大纲到本地存储 */
function saveOutline() {
  localStorage.setItem(`outline_${props.articleId}`, JSON.stringify(outline.value))
}

/** 添加大纲项 */
function addOutlineItem() {
  if (!newItemText.value.trim()) return

  const newItem: OutlineItem = {
    text: newItemText.value.trim(),
    level: newItemLevel.value,
    position: outline.value.length,
    children: []
  }

  outline.value.push(newItem)
  newItemText.value = ''
  saveOutline()
}

/** 删除大纲项 */
function deleteItem(index: number) {
  outline.value.splice(index, 1)
  // 更新position
  outline.value.forEach((item, idx) => {
    item.position = idx
  })
  saveOutline()
}

/** 开始编辑大纲项 */
function startEdit(item: OutlineItem) {
  editingItem.value = { ...item }
}

/** 保存编辑 */
function saveEdit(index: number) {
  if (editingItem.value) {
    outline.value[index] = { ...editingItem.value }
    editingItem.value = null
    saveOutline()
  }
}

/** 取消编辑 */
function cancelEdit() {
  editingItem.value = null
}

/** 上移 */
function moveUp(index: number) {
  if (index > 0) {
    const temp = outline.value[index]
    outline.value[index] = outline.value[index - 1]
    outline.value[index - 1] = temp
    // 更新position
    outline.value.forEach((item, idx) => {
      item.position = idx
    })
    saveOutline()
  }
}

/** 下移 */
function moveDown(index: number) {
  if (index < outline.value.length - 1) {
    const temp = outline.value[index]
    outline.value[index] = outline.value[index + 1]
    outline.value[index + 1] = temp
    // 更新position
    outline.value.forEach((item, idx) => {
      item.position = idx
    })
    saveOutline()
  }
}

/** 升级(减小level) */
function promoteLevel(index: number) {
  if (outline.value[index].level > 1) {
    outline.value[index].level--
    saveOutline()
  }
}

/** 降级(增大level) */
function demoteLevel(index: number) {
  if (outline.value[index].level < 6) {
    outline.value[index].level++
    saveOutline()
  }
}

/** 插入到编辑器 */
function insertToEditor(item: OutlineItem) {
  const markdown = '#'.repeat(item.level) + ' ' + item.text
  emit('insert', markdown)
}

/** 插入全部大纲到编辑器 */
function insertAllToEditor() {
  const markdown = outline.value.map(item => {
    return '#'.repeat(item.level) + ' ' + item.text
  }).join('\n\n')
  emit('insert', markdown)
}

/** 获取缩进样式 */
function getIndentStyle(level: number) {
  return {
    paddingLeft: `${(level - 1) * 1}rem`
  }
}

/** 打开AI灵感面板 */
function openAiPanel() {
  showAiPanel.value = true
  // 初始化默认提示词
  if (!aiPrompt.value) {
    aiPrompt.value = getDefaultAiPrompt()
  }
}

/** 关闭AI灵感面板 */
function closeAiPanel() {
  showAiPanel.value = false
}

/** 获取默认AI提示词 */
function getDefaultAiPrompt(): string {
  if (aiInspirationMode.value === 'outline') {
    return `你是一个专业的创作助手。请根据当前文章内容，生成详细的大纲建议。

要求：
1. 分析文章的主题和内容方向
2. 提供合理的章节结构建议
3. 每个章节包含简短的描述
4. 使用合适的标题层级（H1-H6）

请以JSON数组格式返回，每项包含：
- level: 标题层级（1-6）
- text: 标题文本
- description: 简短描述（可选）

示例格式：
[
  { "level": 1, "text": "引言", "description": "介绍主题背景" },
  { "level": 2, "text": "核心概念", "description": "详细阐述主要概念" }
]`
  } else if (aiInspirationMode.value === 'continue') {
    return `你是一个专业的创作助手。请根据当前文章内容，提供续写建议。

要求：
1. 分析文章已有内容的走向
2. 提供3-5个可能的续写方向
3. 每个方向包含简短的说明

请以JSON数组格式返回，每项包含：
- title: 续写方向的标题
- description: 详细说明

示例格式：
[
  { "title": "深入探讨技术细节", "description": "可以详细介绍技术实现..." },
  { "title": "添加实际案例", "description": "通过具体案例说明..." }
]`
  } else {
    return `你是一个专业的创作助手。请根据选中的大纲项，提供扩展建议。

要求：
1. 分析该章节的主题
2. 提供详细的子章节建议
3. 包含具体的内容要点

请以JSON数组格式返回，每项包含：
- level: 标题层级
- text: 标题文本
- points: 内容要点数组

示例格式：
[
  { "level": 3, "text": "子章节1", "points": ["要点1", "要点2"] }
]`
  }
}

/** 生成AI灵感 */
async function generateAiInspiration() {
  if (!canUseAi.value) {
    $tips.error('请选择AI模型并输入提示词')
    return
  }

  try {
    isGenerating.value = true
    aiResult.value = ''

    // 获取当前文章内容
    let contextText = ''
    if (selectedArticleStore.v?.id) {
      const articleBody = await articledb.getArticleBody(selectedArticleStore.v.id)
      if (articleBody?.content) {
        contextText = articleBody.content.replace(/<[^>]+>/g, '').trim()
      }
    }

    // 构建提示内容
    let userPrompt = ''
    if (aiInspirationMode.value === 'outline') {
      userPrompt = contextText
        ? `当前文章内容：

${contextText.substring(0, 2000)}

请根据以上内容生成大纲建议。`
        : '请为一篇新文章生成大纲建议。'
    } else if (aiInspirationMode.value === 'continue') {
      userPrompt = contextText
        ? `当前文章内容：

${contextText.substring(0, 2000)}

请提供续写建议。`
        : '请提供写作方向建议。'
    } else {
      const currentOutline = outline.value.map(item => `${'#'.repeat(item.level)} ${item.text}`).join('\n')
      userPrompt = `当前大纲：

${currentOutline}

请提供扩展建议。`
    }

    // 调用AI
    const response = await openaiFetch({
      ...selectedModel.value,
      messages: [
        { role: 'system', content: aiPrompt.value },
        { role: 'user', content: userPrompt }
      ],
      stream: false
    })

    if (!response || !response.choices || !response.choices[0]) {
      throw new Error('AI返回格式错误')
    }

    const aiContent = response.choices[0].message?.content || ''
    aiResult.value = aiContent

    // 尝试解析JSON并自动应用
    try {
      let parsed: any
      try {
        parsed = JSON.parse(aiContent)
      } catch {
        const jsonMatch = aiContent.match(/```(?:json)?\s*([\s\S]*?)```/)
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[1].trim())
        }
      }

      if (Array.isArray(parsed) && aiInspirationMode.value === 'outline') {
        // 自动应用大纲建议
        applyAiOutline(parsed)
      }
    } catch (err) {
      // 解析失败，仅显示原始结果
      console.log('无法自动应用AI结果，仅显示文本')
    }

    $tips.success('AI灵感生成完成')
  } catch (err: any) {
    console.error('AI生成失败:', err)
    $tips.error(`AI生成失败: ${err.message}`)
  } finally {
    isGenerating.value = false
  }
}

/** 应用AI生成的大纲 */
function applyAiOutline(items: any[]) {
  const newItems: OutlineItem[] = items.map((item, index) => ({
    text: item.text || item.title || '',
    level: item.level || 1,
    position: outline.value.length + index,
    children: []
  }))

  outline.value.push(...newItems)
  saveOutline()
  $tips.success(`已添加 ${newItems.length} 个大纲项`)
}

/** 插入AI结果到编辑器 */
function insertAiResultToEditor() {
  if (aiResult.value) {
    emit('insert', aiResult.value)
    $tips.success('已插入到编辑器')
  }
}

/** 清空AI结果 */
function clearAiResult() {
  aiResult.value = ''
}

const emit = defineEmits<{
  insert: [markdown: string]
}>()

// 初始加载
loadOutline()
</script>

<template>
  <div class="outline-navigator">
    <!-- 普通大纲视图 -->
    <div v-if="!showAiPanel" class="normal-view">
      <div class="header">
        <h3>📋 大纲</h3>
        <button @click="openAiPanel" class="btn-ai" title="AI灵感">
          💡 AI灵感
        </button>
      </div>

      <!-- 添加新大纲项 -->
      <div class="add-section">
        <div class="input-group">
          <select v-model="newItemLevel" class="level-select">
            <option :value="1">H1</option>
            <option :value="2">H2</option>
            <option :value="3">H3</option>
            <option :value="4">H4</option>
            <option :value="5">H5</option>
            <option :value="6">H6</option>
          </select>
          <input v-model="newItemText" @keyup.enter="addOutlineItem" placeholder="输入标题后按 Enter" class="title-input" />
          <button @click="addOutlineItem" class="btn-add">➕</button>
        </div>
      </div>

      <div v-if="outline.length === 0" class="empty-state">
        暂无大纲，开始添加你的标题
      </div>

      <div v-else class="outline-list">
        <div v-for="(item, index) in outline" :key="index" class="outline-item" :style="getIndentStyle(item.level)">
          <template v-if="editingItem && editingItem.position === item.position">
            <div class="edit-mode">
              <select v-model="editingItem.level" class="level-select-small">
                <option :value="1">H1</option>
                <option :value="2">H2</option>
                <option :value="3">H3</option>
                <option :value="4">H4</option>
                <option :value="5">H5</option>
                <option :value="6">H6</option>
              </select>
              <input v-model="editingItem.text" @keyup.enter="saveEdit(index)" @keyup.esc="cancelEdit" class="edit-input" />
              <button @click="saveEdit(index)" class="btn-icon">✔️</button>
              <button @click="cancelEdit" class="btn-icon">❌</button>
            </div>
          </template>

          <template v-else>
            <div class="view-mode">
              <span class="level-indicator">{{ 'H' + item.level }}</span>
              <span class="item-text" @dblclick="startEdit(item)">{{ item.text }}</span>

              <div class="item-actions">
                <button @click="insertToEditor(item)" class="btn-icon" title="插入到编辑器">📝</button>
                <button @click="moveUp(index)" :disabled="index === 0" class="btn-icon" title="上移">⬆️</button>
                <button @click="moveDown(index)" :disabled="index === outline.length - 1" class="btn-icon" title="下移">⬇️</button>
                <button @click="promoteLevel(index)" :disabled="item.level === 1" class="btn-icon" title="升级">⬅️</button>
                <button @click="demoteLevel(index)" :disabled="item.level === 6" class="btn-icon" title="降级">➡️</button>
                <button @click="deleteItem(index)" class="btn-icon btn-delete" title="删除">🗑️</button>
              </div>
            </div>
          </template>
        </div>
      </div>

      <!-- 底部操作栏 -->
      <div v-if="outline.length > 0" class="footer">
        <button @click="insertAllToEditor" class="btn-insert-all">
          📝 插入全部大纲到编辑器
        </button>
      </div>
    </div>

    <!-- AI灵感面板 -->
    <div v-else class="ai-panel">
      <div class="header">
        <h3>💡 AI灵感</h3>
        <button @click="closeAiPanel" class="btn-close" title="关闭">
          ✖️
        </button>
      </div>

      <div class="ai-content">
        <!-- 配置区域 -->
        <div class="config-section">
          <div class="form-item">
            <label>灵感类型</label>
            <select v-model="aiInspirationMode" @change="aiPrompt = getDefaultAiPrompt()">
              <option value="outline">大纲建议</option>
              <option value="continue">续写建议</option>
              <option value="expand">扩展建议</option>
            </select>
          </div>

          <div class="form-item">
            <label>AI 模型</label>
            <select v-model="selectedModel">
              <option :value="null" disabled>请选择模型</option>
              <option v-for="model in modelOptions" :key="model.model" :value="model">
                {{ model.note || model.model }}
              </option>
            </select>
          </div>

          <div class="form-item">
            <label>提示词</label>
            <textarea v-model="aiPrompt" placeholder="输入AI提示词..." rows="6"></textarea>
          </div>

          <div class="actions">
            <button class="btn-primary" :disabled="!canUseAi || isGenerating" @click="generateAiInspiration">
              {{ isGenerating ? '生成中...' : '✨ 生成灵感' }}
            </button>
          </div>
        </div>

        <!-- 结果显示区域 -->
        <div class="result-section" v-if="aiResult">
          <div class="result-header">
            <h4>AI 生成结果</h4>
            <div class="result-actions">
              <button class="btn-small" @click="insertAiResultToEditor" title="插入到编辑器">
                📝 插入
              </button>
              <button class="btn-small" @click="clearAiResult" title="清空">
                🗑️ 清空
              </button>
            </div>
          </div>
          <pre class="result-content">{{ aiResult }}</pre>
        </div>

        <!-- 空状态 -->
        <div class="empty-state" v-if="!isGenerating && !aiResult">
          <div class="empty-icon">💡</div>
          <p>选择灵感类型和AI模型，点击“生成灵感”获取AI建议</p>
          <ul class="tips-list">
            <li><strong>大纲建议</strong>：根据文章内容生成结构化大纲</li>
            <li><strong>续写建议</strong>：提供后续写作方向</li>
            <li><strong>扩展建议</strong>：对现有大纲进行扩展</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.outline-navigator {
  display: flex;
  flex: 1;
  width: 0;
  flex-direction: column;
  height: 100%;
  background-color: var(--background-secondary);
}

.normal-view,
.ai-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: .5rem;
  border-bottom: 1px solid var(--border-color);
}

.header h3 {
  margin: 0;
  color: var(--text-primary);
}

.btn-ai {
  padding: .25rem .5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 0.25rem;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 500;
  transition: all 0.2s;
  box-shadow: 0 2px 4px rgba(102, 126, 234, 0.3);
}

.btn-ai:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(102, 126, 234, 0.4);
}

.btn-close {
  padding: 0.25rem 0.5rem;
  background: transparent;
  border: 1px solid var(--border-color);
  border-radius: 0.25rem;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.2s;
}

.btn-close:hover {
  background-color: var(--background-tertiary);
}

.add-section {
  padding: .5rem;
  border-bottom: 1px solid var(--border-color);
  background-color: var(--background-secondary);
}

.input-group {
  display: flex;
  gap: 0.5rem;
}

.level-select {
  padding: 0.5rem;
  border: 1px solid var(--border-color);
  border-radius: 0.25rem;
  background-color: var(--background-primary);
  color: var(--text-primary);
  font-size: 0.85rem;
  cursor: pointer;
}

.level-select-small {
  padding: 0.25rem 0.5rem;
  border: 1px solid var(--border-color);
  border-radius: 0.25rem;
  background-color: var(--background-primary);
  color: var(--text-primary);
  font-size: 0.75rem;
}

.title-input {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid var(--border-color);
  border-radius: 0.25rem;
  background-color: var(--background-primary);
  color: var(--text-primary);
  font-size: 0.9rem;
}

.btn-add {
  padding: .25rem 1rem;
  background-color: var(--primary);
  color: white;
  border: none;
  border-radius: 0.25rem;
  cursor: pointer;
  font-size: 0.9rem;
}

.btn-add:hover {
  background-color: var(--primary-dark);
}

.empty-state {
  text-align: center;
  padding: 2rem;
  color: var(--text-tertiary);
}

.outline-list {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem 0;
}

.outline-item {
  padding: 0.5rem 1rem;
  border-bottom: 1px solid var(--border-color);
}

.view-mode {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.edit-mode {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.edit-input {
  flex: 1;
  padding: 0.25rem 0.5rem;
  border: 1px solid var(--primary);
  border-radius: 0.25rem;
  background-color: var(--background-primary);
  color: var(--text-primary);
  font-size: 0.85rem;
}

.level-indicator {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 2rem;
  height: 1.5rem;
  padding: 0 0.5rem;
  font-size: 0.7rem;
  font-weight: bold;
  color: var(--primary);
  background-color: var(--background-secondary);
  border-radius: 0.25rem;
}

.item-text {
  flex: 1;
  color: var(--text-primary);
  font-size: 0.9rem;
  cursor: text;
}

.item-actions {
  display: flex;
  gap: 0.25rem;
  opacity: 0.6;
  transition: opacity 0.2s;
}

.outline-item:hover .item-actions {
  opacity: 1;
}

.btn-icon {
  padding: 0.25rem 0.5rem;
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 0.85rem;
  border-radius: 0.25rem;
  transition: background-color 0.2s;
}

.btn-icon:hover {
  background-color: var(--background-tertiary);
}

.btn-icon:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.btn-delete:hover {
  background-color: #ff4444;
}

.footer {
  padding: 1rem;
  border-top: 1px solid var(--border-color);
  background-color: var(--background-secondary);
}

.btn-insert-all {
  width: 100%;
  padding: 0.75rem;
  background-color: var(--primary);
  color: white;
  border: none;
  border-radius: 0.25rem;
  cursor: pointer;
  font-size: 0.9rem;
}

.btn-insert-all:hover {
  background-color: var(--primary-dark);
}

/* AI面板样式 */
.ai-content {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

.config-section {
  margin-bottom: 1rem;
}

.form-item {
  margin-bottom: 1rem;
}

.form-item label {
  display: block;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  color: var(--text-secondary);
  font-weight: 500;
}

.form-item select,
.form-item textarea {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid var(--border-color);
  border-radius: 0.25rem;
  background-color: var(--background-secondary);
  color: var(--text-primary);
  font-size: 0.875rem;
}

.form-item textarea {
  resize: vertical;
  min-height: 80px;
  font-family: monospace;
}

.actions {
  display: flex;
  gap: 0.5rem;
}

.btn-primary {
  flex: 1;
  padding: 0.625rem 1rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 0.25rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 4px rgba(102, 126, 234, 0.3);
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(102, 126, 234, 0.4);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.result-section {
  margin-top: 1rem;
  padding: 1rem;
  background-color: var(--background-secondary);
  border-radius: 0.25rem;
  border: 1px solid var(--border-color);
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.result-header h4 {
  margin: 0;
  font-size: 0.875rem;
  color: var(--text-primary);
}

.result-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-small {
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  background-color: var(--primary);
  color: white;
  border: none;
  border-radius: 0.25rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-small:hover {
  background-color: var(--primary-dark);
}

.result-content {
  padding: 0.75rem;
  background-color: var(--background-primary);
  border-radius: 0.25rem;
  font-size: 0.875rem;
  color: var(--text-primary);
  white-space: pre-wrap;
  word-wrap: break-word;
  max-height: 300px;
  overflow-y: auto;
  margin: 0;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.empty-state p {
  font-size: 0.875rem;
  margin: 0 0 1rem 0;
  color: var(--text-secondary);
}

.tips-list {
  text-align: left;
  margin: 1rem auto 0;
  padding: 0;
  list-style: none;
  max-width: 300px;
}

.tips-list li {
  padding: 0.5rem 0;
  font-size: 0.875rem;
  color: var(--text-secondary);
  border-bottom: 1px solid var(--border-color);
}

.tips-list li:last-child {
  border-bottom: none;
}

.tips-list strong {
  color: var(--text-primary);
}

/* 滚动条样式 */
.outline-list::-webkit-scrollbar,
.ai-content::-webkit-scrollbar,
.result-content::-webkit-scrollbar {
  width: 6px;
}

.outline-list::-webkit-scrollbar-track,
.ai-content::-webkit-scrollbar-track,
.result-content::-webkit-scrollbar-track {
  background: var(--background-secondary);
}

.outline-list::-webkit-scrollbar-thumb,
.ai-content::-webkit-scrollbar-thumb,
.result-content::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 3px;
}

.outline-list::-webkit-scrollbar-thumb:hover,
.ai-content::-webkit-scrollbar-thumb:hover,
.result-content::-webkit-scrollbar-thumb:hover {
  background: var(--text-tertiary);
}
</style>
