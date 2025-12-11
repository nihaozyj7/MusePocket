<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useModelsStore } from '@domains/settings/stores/models.store'
import { usePromptsStore } from '@domains/settings/stores/prompts.store'
import { useSettingStore } from '@domains/settings/stores/settings.store'
import { openaiFetch, type OpenAiParams } from '@core/api'
import { $tips } from '@app/plugins'
import { useSelectedArticleStore } from '@domains/editor/stores/selected-article.store'
import { useSelectedBookStore } from '@domains/library/stores/selected-book.store'
import { articledb } from '@shared/db'

const modelsStore = useModelsStore()
const promptsStore = usePromptsStore()
const settingStore = useSettingStore()
const selectedArticleStore = useSelectedArticleStore()
const selectedBookStore = useSelectedBookStore()

/** 选中的模型 */
const selectedModel = ref<OpenAiParams | null>(null)
/** 系统提示词（用户手动输入或选择） */
const systemPrompt = ref<string>('')
/** 用户提示词（用户手动输入或选择） */
const userPrompt = ref<string>('')
/** 参考文章内容 */
const referenceContent = ref<string>('')
/** 当前选中的参考文章ID */
const selectedReferenceArticleId = ref<string>('')
/** 是否使用当前文章作为参考 */
const useCurrentArticle = ref<boolean>(true)
/** 是否正在生成 */
const isGenerating = ref(false)
/** 生成进度 */
const progress = ref('')
/** AI生成的建议结果 */
const suggestionResult = ref('')
/** 当前标签页 */
const activeTab = ref<'config' | 'result'>('config')
/** 当前书籍的所有文章列表 */
const articles = ref<any[]>([])

/** 模型选项 */
const modelOptions = computed(() => modelsStore.v)

/** 提示词选项 */
const promptOptions = computed(() => promptsStore.v)

/** 是否可以开始生成 */
const canGenerate = computed(() => {
  return selectedModel.value && systemPrompt.value && userPrompt.value
})

onMounted(async () => {
  // 加载保存的配置
  const savedConfig = settingStore.getAiToolConfig('aiSuggestion')

  // 恢复模型选择
  if (savedConfig.modelId) {
    const model = modelOptions.value.find(m => getModelId(m) === savedConfig.modelId)
    if (model) {
      selectedModel.value = model
    } else {
      // 如果保存的模型不存在，使用默认第一个模型
      if (modelOptions.value.length > 0) {
        selectedModel.value = modelOptions.value[0]
      }
    }
  } else if (modelOptions.value.length > 0) {
    // 没有保存的配置，使用默认第一个模型
    selectedModel.value = modelOptions.value[0]
  }

  // 恢复提示词
  if (savedConfig.systemPrompt) {
    systemPrompt.value = savedConfig.systemPrompt
  } else {
    systemPrompt.value = getDefaultSystemPrompt()
  }

  if (savedConfig.userPrompt) {
    userPrompt.value = savedConfig.userPrompt
  } else {
    userPrompt.value = getDefaultUserPrompt()
  }

  // 加载当前书籍的所有文章
  await loadArticles()
})

/** 生成模型的唯一标识 */
function getModelId(model: OpenAiParams): string {
  return `${model.baseUrl}|${model.model}`
}

/** 保存配置（当用户修改时） */
function saveConfig() {
  if (!selectedModel.value) return

  settingStore.saveAiToolConfig('aiSuggestion', {
    modelId: getModelId(selectedModel.value),
    systemPrompt: systemPrompt.value,
    userPrompt: userPrompt.value
  })
}

// 监听配置变化，自动保存
watch([selectedModel, systemPrompt, userPrompt], () => {
  saveConfig()
})

/** 加载文章列表 */
async function loadArticles() {
  try {
    const bookId = selectedBookStore.v?.id
    if (!bookId) return

    const articleList = await articledb.getBookArticles(bookId)
    articles.value = articleList.filter(a => a.deletedTime === 0) // 只显示未删除的文章
  } catch (err: any) {
    console.error('加载文章列表失败:', err)
  }
}

/** 获取默认系统提示词 */
function getDefaultSystemPrompt(): string {
  return `你是一个专业的写作助手，擅长为作者提供创作灵感和续写建议。你需要：
1. 理解作者的创作风格和意图
2. 基于已有内容，提供有价值的续写方向
3. 保持文章的连贯性和一致性
4. 提供具有创意但合理的建议`
}

/** 获取默认用户提示词 */
function getDefaultUserPrompt(): string {
  return `请基于以下内容，为我提供3-5个可能的续写方向或创作灵感，每个方向简要说明200字左右。`
}

/** 从提示词库选择系统提示词 */
function selectSystemPrompt(promptId: string) {
  const prompt = promptOptions.value.find(p => p.id === promptId)
  if (prompt) {
    systemPrompt.value = prompt.prompt
    $tips.success('已应用提示词')
  }
}

/** 从提示词库选择用户提示词 */
function selectUserPrompt(promptId: string) {
  const prompt = promptOptions.value.find(p => p.id === promptId)
  if (prompt) {
    userPrompt.value = prompt.prompt
    $tips.success('已应用提示词')
  }
}

/** 选择参考文章 */
async function selectReferenceArticle(articleId: string) {
  if (!articleId) {
    referenceContent.value = ''
    selectedReferenceArticleId.value = ''
    return
  }

  try {
    const articleBody = await articledb.getArticleBody(articleId)
    if (articleBody?.content) {
      // 移除HTML标签，只保留纯文本
      const plainText = articleBody.content.replace(/<[^>]+>/g, '').trim()
      referenceContent.value = plainText
      selectedReferenceArticleId.value = articleId
      $tips.success('已加载参考文章')
    }
  } catch (err: any) {
    $tips.error(`加载参考文章失败: ${err.message}`)
  }
}

/** 开始生成AI建议 */
async function startGenerate() {
  if (!canGenerate.value) {
    $tips.error('请选择模型并填写提示词')
    return
  }

  try {
    isGenerating.value = true
    progress.value = '正在准备内容...'
    suggestionResult.value = ''

    // 获取当前文章内容
    let currentContent = ''
    if (useCurrentArticle.value && selectedArticleStore.v?.id) {
      progress.value = '正在获取当前文章内容...'
      const articleBody = await articledb.getArticleBody(selectedArticleStore.v.id)
      if (articleBody?.content) {
        currentContent = articleBody.content.replace(/<[^>]+>/g, '').trim()
      }
    }

    // 构建用户消息
    let userMessage = userPrompt.value

    // 添加当前文章内容
    if (currentContent) {
      userMessage += `\n\n【当前文章内容】：\n${currentContent}`
    }

    // 添加参考内容
    if (referenceContent.value) {
      userMessage += `\n\n【参考内容】：\n${referenceContent.value}`
    }

    // 调用AI
    progress.value = '正在生成AI建议...'
    const response = await openaiFetch({
      ...selectedModel.value,
      messages: [
        { role: 'system', content: systemPrompt.value },
        { role: 'user', content: userMessage }
      ],
      stream: false
    })

    if (!response || !response.choices || !response.choices[0]) {
      throw new Error('AI返回格式错误')
    }

    const aiContent = response.choices[0].message?.content || ''
    suggestionResult.value = aiContent

    progress.value = 'AI建议生成完成'
    $tips.success('AI建议生成完成')

    // 切换到结果标签页
    activeTab.value = 'result'

  } catch (err: any) {
    console.error('生成AI建议失败:', err)
    progress.value = '生成失败'
    $tips.error(`生成失败: ${err.message}`)
  } finally {
    isGenerating.value = false
  }
}

/** 复制结果到剪贴板 */
function copyToClipboard() {
  if (!suggestionResult.value) {
    $tips.error('没有可复制的内容')
    return
  }

  navigator.clipboard.writeText(suggestionResult.value).then(() => {
    $tips.success('已复制到剪贴板')
  }).catch(err => {
    $tips.error('复制失败')
    console.error(err)
  })
}

/** 清空结果 */
function clearResult() {
  suggestionResult.value = ''
  activeTab.value = 'config'
}
</script>

<template>
  <div class="ai-suggestion-tool">
    <div class="tool-header">
      <h3>💡 AI建议</h3>
    </div>

    <!-- 标签页 -->
    <div class="tabs">
      <button :class="{ active: activeTab === 'config' }" @click="activeTab = 'config'">
        配置
      </button>
      <button :class="{ active: activeTab === 'result' }" @click="activeTab = 'result'">
        结果
      </button>
    </div>

    <div class="tool-body">
      <!-- 配置区域 -->
      <div class="config-section" v-if="activeTab === 'config'">
        <!-- 模型选择 -->
        <div class="form-item">
          <label>AI 模型</label>
          <select v-model="selectedModel">
            <option :value="null" disabled>请选择模型</option>
            <option v-for="model in modelOptions" :key="model.model" :value="model">
              {{ model.note || model.model }}
            </option>
          </select>
        </div>

        <!-- 系统提示词 -->
        <div class="form-item">
          <label>系统提示词</label>
          <div class="prompt-selector">
            <select @change="selectSystemPrompt(($event.target as HTMLSelectElement).value)">
              <option value="">从提示词库选择（可选）</option>
              <option v-for="prompt in promptOptions" :key="prompt.id" :value="prompt.id">
                {{ prompt.title }}
              </option>
            </select>
          </div>
          <textarea v-model="systemPrompt" placeholder="输入系统提示词..." rows="4"></textarea>
        </div>

        <!-- 用户提示词 -->
        <div class="form-item">
          <label>用户提示词</label>
          <div class="prompt-selector">
            <select @change="selectUserPrompt(($event.target as HTMLSelectElement).value)">
              <option value="">从提示词库选择（可选）</option>
              <option v-for="prompt in promptOptions" :key="prompt.id" :value="prompt.id">
                {{ prompt.title }}
              </option>
            </select>
          </div>
          <textarea v-model="userPrompt" placeholder="输入用户提示词..." rows="4"></textarea>
        </div>

        <!-- 是否使用当前文章 -->
        <div class="form-item">
          <label class="checkbox-label">
            <input type="checkbox" v-model="useCurrentArticle" />
            使用当前文章作为上下文
          </label>
        </div>

        <!-- 参考文章选择 -->
        <div class="form-item">
          <label>参考文章（可选）</label>
          <select v-model="selectedReferenceArticleId" @change="selectReferenceArticle(selectedReferenceArticleId)">
            <option value="">不选择参考文章</option>
            <option v-for="article in articles" :key="article.id" :value="article.id">
              {{ article.title }}
            </option>
          </select>
        </div>

        <!-- 参考内容（手动输入） -->
        <div class="form-item">
          <label>或手动输入参考内容</label>
          <textarea v-model="referenceContent" placeholder="可以粘贴任何参考内容..." rows="4"></textarea>
        </div>

        <!-- 操作按钮 -->
        <div class="actions">
          <button class="btn-primary" :disabled="!canGenerate || isGenerating" @click="startGenerate">
            {{ isGenerating ? '生成中...' : '生成建议' }}
          </button>
        </div>

        <!-- 进度提示 -->
        <div class="progress" v-if="progress">
          {{ progress }}
        </div>
      </div>

      <!-- 结果区域 -->
      <div class="result-section" v-if="activeTab === 'result'">
        <div class="result-header">
          <h4>AI建议结果</h4>
          <div class="result-actions">
            <button class="btn-small" @click="copyToClipboard" :disabled="!suggestionResult">
              📋 复制
            </button>
            <button class="btn-small" @click="clearResult">
              🗑️ 清空
            </button>
          </div>
        </div>

        <div class="result-content" v-if="suggestionResult">
          <pre>{{ suggestionResult }}</pre>
        </div>

        <div class="empty-state" v-else>
          <div class="empty-icon">💡</div>
          <p>暂无生成结果，请先在配置页面生成</p>
        </div>
      </div>

      <!-- 空状态（初始状态） -->
      <div class="empty-state" v-if="activeTab === 'config' && !isGenerating && !progress && !suggestionResult">
        <div class="empty-icon">💡</div>
        <p>配置AI模型和提示词，获取文章创作灵感和续写建议</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ai-suggestion-tool {
  flex: 1;
  width: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: var(--background-secondary);
}

.tool-header {
  padding: 1rem;
  border-bottom: 1px solid var(--border-color);
  background-color: var(--background-secondary);
}

.tool-header h3 {
  margin: 0;
  font-size: 1rem;
  color: var(--text-primary);
}

.tabs {
  display: flex;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-bottom: 1px solid var(--border-color);
  background-color: var(--background-secondary);
}

.tabs button {
  padding: 0.5rem 1rem;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.tabs button.active {
  color: var(--primary);
  border-bottom-color: var(--primary);
}

.tool-body {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

.config-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-item label {
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
  font-family: inherit;
}

.prompt-selector {
  margin-bottom: 0.25rem;
}

.prompt-selector select {
  font-size: 0.8rem;
  padding: 0.375rem 0.5rem;
  color: var(--text-tertiary);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  cursor: pointer;
  user-select: none;
}

.checkbox-label input[type="checkbox"] {
  cursor: pointer;
}

.actions {
  display: flex;
  gap: 0.5rem;
}

.btn-primary {
  flex: 1;
  padding: 0.625rem 1rem;
  background-color: var(--primary);
  color: white;
  border: none;
  border-radius: 0.25rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-primary:hover:not(:disabled) {
  background-color: var(--primary-dark);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.progress {
  padding: 0.5rem;
  background-color: var(--background-tertiary);
  border-radius: 0.25rem;
  font-size: 0.875rem;
  color: var(--text-secondary);
  text-align: center;
}

.result-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--border-color);
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
  padding: 0.25rem 0.75rem;
  font-size: 0.875rem;
  background-color: var(--background-tertiary);
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
  border-radius: 0.25rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-small:hover:not(:disabled) {
  background-color: var(--background-primary);
}

.btn-small:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.result-content {
  flex: 1;
}

.result-content pre {
  padding: 1rem;
  background-color: var(--background-tertiary);
  border-radius: 0.25rem;
  border: 1px solid var(--border-color);
  font-size: 0.875rem;
  color: var(--text-primary);
  white-space: pre-wrap;
  word-wrap: break-word;
  line-height: 1.6;
  margin: 0;
  font-family: inherit;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1rem;
  text-align: center;
  color: var(--text-tertiary);
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.empty-state p {
  font-size: 0.875rem;
  margin: 0;
  line-height: 1.5;
}
</style>
