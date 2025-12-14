<<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useModelsStore } from '@/domains/settings/stores/models.store'
import { usePromptsStore } from '@/domains/settings/stores/prompts.store'
import { useSettingStore } from '@domains/settings/stores/settings.store'
import { PROOFREAD_PRESETS } from '../constants/ai-prompts'
import { openaiFetch, type OpenAiParams } from '@core/api'
import { $tips } from '@app/plugins'
import { uid } from '@shared/utils'
import { useSelectedArticleStore } from '@domains/editor/stores/selected-article.store'
import { articledb } from '@shared/db'
import LocalProofreadTool from './LocalProofreadTool.vue'

interface ProofreadIssue {
  id: string
  type: 'error' | 'warning' | 'suggestion'
  category: string // 例如：拼写错误、标点符号、语法错误、用词不当等
  original: string // 原文
  suggestion: string // 建议修改
  reason: string // 修改原因
  position?: number // 在文本中的位置
  selected: boolean // 是否选中（用于批量操作）
}

const modelsStore = useModelsStore()
const promptsStore = usePromptsStore()
const settingStore = useSettingStore()
const selectedArticleStore = useSelectedArticleStore()

const props = defineProps<{
  getEditorBody?: () => string | undefined
  applyTextFix?: (original: string, corrected: string) => void
}>()

/** 主标签页：AI校对 or 本地纠错 */
const mainTab = ref<'ai' | 'local'>('local')

/** 是否显示本地纠错tab */
const showLocalProofread = computed(() => {
  return settingStore.proofreadingSettings.apiUrl && settingStore.proofreadingSettings.apiUrl.trim() !== ''
})

/** 选中的模型 */
const selectedModel = ref<OpenAiParams | null>(null)
/** 选中的预设 */
const selectedPreset = ref<string>('')
/** 校对提示词 */
const selectedPrompt = ref<string>('')
/** 是否正在校对 */
const isProofreading = ref(false)
/** 校对进度 */
const progress = ref('')
/** 校对问题列表 */
const issues = ref<ProofreadIssue[]>([])
/** 当前选中的标签页 */
const activeTab = ref<'errors' | 'preview'>('errors')
/** AI原始返回 */
const aiRawResponse = ref('')

/** 模型选项 */
const modelOptions = computed(() => modelsStore.v)

/** 提示词选项 */
const promptOptions = computed(() => promptsStore.v)

/** 是否可以开始校对 */
const canProofread = computed(() => {
  return selectedModel.value && selectedPrompt.value && selectedArticleStore.v?.id
})

/** 错误类型统计 */
const issueStats = computed(() => {
  const stats = {
    error: issues.value.filter(i => i.type === 'error').length,
    warning: issues.value.filter(i => i.type === 'warning').length,
    suggestion: issues.value.filter(i => i.type === 'suggestion').length
  }
  return stats
})

/** 过滤后的问题列表 */
const filteredIssues = computed(() => {
  return issues.value
})

/** 是否全选 */
const isAllSelected = computed({
  get: () => issues.value.length > 0 && issues.value.every(i => i.selected),
  set: (value: boolean) => {
    issues.value.forEach(i => i.selected = value)
  }
})

onMounted(() => {
  // 加载保存的配置
  const savedConfig = settingStore.getAiToolConfig('proofread')

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

  // 恢复预设选择
  if (savedConfig.presetId) {
    const preset = allPresetOptions.value.find(p => p.id === savedConfig.presetId)
    if (preset) {
      selectedPreset.value = savedConfig.presetId
      selectedPrompt.value = preset.prompt
    } else {
      // 如果保存的预设不存在，使用第一个内置预设
      if (PROOFREAD_PRESETS.length > 0) {
        selectedPreset.value = PROOFREAD_PRESETS[0].id
        selectedPrompt.value = PROOFREAD_PRESETS[0].prompt
      }
    }
  } else if (savedConfig.systemPrompt) {
    // 兼容旧配置：有保存的提示词但没有预设ID
    selectedPrompt.value = savedConfig.systemPrompt
  } else {
    // 默认使用第一个内置预设
    if (PROOFREAD_PRESETS.length > 0) {
      selectedPreset.value = PROOFREAD_PRESETS[0].id
      selectedPrompt.value = PROOFREAD_PRESETS[0].prompt
    }
  }
})

/** 生成模型的唯一标识 */
function getModelId(model: OpenAiParams): string {
  return `${model.baseUrl}|${model.model}`
}

/** 保存配置（当用户修改时） */
function saveConfig() {
  if (!selectedModel.value) return

  settingStore.saveAiToolConfig('proofread', {
    modelId: getModelId(selectedModel.value),
    presetId: selectedPreset.value,
    systemPrompt: selectedPrompt.value
  })
}

// 监听配置变化，自动保存
watch([selectedModel, selectedPreset, selectedPrompt], () => {
  saveConfig()
})

/** 合并后的预设选项（内置 + 自定义） */
const allPresetOptions = computed(() => {
  return [
    ...PROOFREAD_PRESETS.map(p => ({ ...p, isBuiltin: true })),
    ...promptOptions.value.map(p => ({
      id: p.id,
      title: p.title,
      description: '自定义提示词',
      prompt: p.prompt,
      isBuiltin: false
    }))
  ]
})

/** 获取默认校对提示词 */
function getDefaultProofreadPrompt(): string {
  return `你是一个专业的文本校对专家。请仔细检查以下文本，找出所有的问题并给出修改建议。

                检查内容包括但不限于：
                1. 错别字和拼写错误
                2. 标点符号使用错误
                3. 语法错误
                4. 用词不当
                5. 表达不清晰的地方
                6. 逻辑不通顺的句子
                7. 语言风格不一致
                8. 重复的表达

                请以JSON数组格式返回，每个问题包含：
                - type: "error"（明显错误）| "warning"（需要注意）| "suggestion"（优化建议）
                - category: 问题类别（如“拼写错误”、“标点符号”、“语法错误”、“用词不当”等）
                - original: 需要修改的原文片段（尽量精确到词组或句子）
                - suggestion: 建议修改后的内容
                - reason: 简明的修改原因说明

                注意事项：
                1. 只指出真正的问题，不要过度挑剔
                2. original 字段应该是文本中实际存在的内容，以便精确替换
                3. 保持原文的语言风格和意图
                4. 对于文学作品，允许合理的修辞和艺术表达

                示例格式：
                [
                {
                "type": "error",
                "category": "拼写错误",
                "original": "旅游",
                "suggestion": "旅游",
                "reason": "正确写法应为“旅游”"
                },
                {
                "type": "warning",
                "category": "标点符号",
                "original": "你好,世界",
                "suggestion": "你好，世界",
                "reason": "中文应使用全角逗号"
                }
                ]`
}

/** 选择校对提示词 */
function selectProofreadPrompt(promptId: string) {
  const prompt = promptOptions.value.find(p => p.id === promptId)
  if (prompt) {
    selectedPrompt.value = prompt.prompt
    $tips.success('已填入提示词')
  }
}

/** 应用预设 */
function applyPreset(presetId: string) {
  const preset = allPresetOptions.value.find(p => p.id === presetId)
  if (preset) {
    selectedPrompt.value = preset.prompt
  }
}

/** 预设变化时 */
function onPresetChange(presetId: string) {
  if (!presetId) return
  applyPreset(presetId)
  saveConfig()
}

/** 开始校对 */
async function startProofread() {
  if (!canProofread.value) {
    $tips.error('请选择模型和提示词，并确保已打开文章')
    return
  }

  try {
    isProofreading.value = true
    progress.value = '正在获取文章内容...'
    issues.value = []
    aiRawResponse.value = ''

    // 获取当前文章内容
    const articleBody = await articledb.getArticleBody(selectedArticleStore.v.id)
    if (!articleBody?.content) {
      throw new Error('文章内容为空')
    }

    const content = articleBody.content
    const plainText = content.replace(/<[^>]+>/g, '').trim()

    if (!plainText) {
      throw new Error('文章内容为空')
    }

    // 调用AI
    progress.value = '正在进行AI校对分析...'
    const response = await openaiFetch({
      ...selectedModel.value,
      messages: [
        { role: 'system', content: selectedPrompt.value },
        {
          role: 'user',
          content: `请校对以下文本：\n\n${plainText}`
        }
      ],
      stream: false
    })

    if (!response || !response.choices || !response.choices[0]) {
      throw new Error('AI返回格式错误')
    }

    const aiContent = response.choices[0].message?.content || ''
    aiRawResponse.value = aiContent

    // 解析AI返回的JSON
    progress.value = '正在解析校对结果...'
    let parsedIssues: any[] = []

    try {
      parsedIssues = JSON.parse(aiContent)
    } catch {
      // 尝试提取JSON代码块
      const jsonMatch = aiContent.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (jsonMatch) {
        parsedIssues = JSON.parse(jsonMatch[1].trim())
      } else {
        throw new Error('无法解析AI返回的数据')
      }
    }

    if (!Array.isArray(parsedIssues)) {
      throw new Error('AI返回的数据不是数组格式')
    }

    // 转换为内部格式
    issues.value = parsedIssues.map(issue => ({
      id: uid(),
      type: issue.type || 'suggestion',
      category: issue.category || '未分类',
      original: issue.original || '',
      suggestion: issue.suggestion || '',
      reason: issue.reason || '',
      position: issue.position,
      selected: false
    }))

    progress.value = `校对完成，发现 ${issues.value.length} 个问题`
    $tips.success(`校对完成，发现 ${issues.value.length} 个问题`)

    // 切换到错误列表标签
    activeTab.value = 'errors'

  } catch (err: any) {
    console.error('校对失败:', err)
    progress.value = '校对失败'
    $tips.error(`校对失败: ${err.message}`)
  } finally {
    isProofreading.value = false
  }
}

/** 应用单个修改 */
function applyIssue(issue: ProofreadIssue) {
                  // 触发应用修改的事件
                  emit('apply-fix', issue)
                  // 从列表中移除
                  issues.value = issues.value.filter(i => i.id !== issue.id)
                  $tips.success('已应用修改')
                  }

                  /** 忽略问题 */
                  function ignoreIssue(issue: ProofreadIssue) {
                  issues.value = issues.value.filter(i => i.id !== issue.id)
                  $tips.success('已忽略')
                  }

                  /** 批量应用修改 */
                  function applyAllSelected() {
                  const selectedIssues = issues.value.filter(i => i.selected)
                  if (selectedIssues.length === 0) {
                  $tips.error('请先选择要修改的问题')
                  return
                  }

                  selectedIssues.forEach(issue => {
                  emit('apply-fix', issue)
                  })

                  issues.value = issues.value.filter(i => !i.selected)
                  $tips.success(`已应用 ${selectedIssues.length} 处修改`)
                  }

                  /** 获取问题类型的图标 */
                  function getIssueIcon(type: string) {
                  switch (type) {
                  case 'error': return '❌'
                  case 'warning': return '⚠️'
                  case 'suggestion': return '💡'
                  default: return '📝'
                  }
                  }

                  /** 获取问题类型的颜色类名 */
                  function getIssueColorClass(type: string) {
                  switch (type) {
                  case 'error': return 'issue-error'
                  case 'warning': return 'issue-warning'
                  case 'suggestion': return 'issue-suggestion'
                  default: return ''
                  }
                  }

                  /** 处理本地纠错的单个修正 */
                  function handleLocalProofreadFix(issue: any) {
                  if (props.applyTextFix) {
                  props.applyTextFix(issue.error.original, issue.error.corrected)
                  }
                  }

                  /** 处理本地纠错的批量修正 */
                  function handleLocalProofreadAll(issues: any[]) {
                  if (props.applyTextFix) {
                  issues.forEach(issue => {
                  props.applyTextFix!(issue.error.original, issue.error.corrected)
                  })
                  }
                  }

                  const emit = defineEmits<{ 'apply-fix' : [issue: ProofreadIssue] }>()

                    defineExpose({
                    startProofread
                    })
                    </script>

                    <template>
                      <div class="proofread-tool">
                        <div class="tool-header">
                          <h3>✅ 文本校对</h3>
                        </div>

                        <!-- 主标签页 -->
                        <div class="main-tabs" v-if="showLocalProofread">
                          <button :class="{ active: mainTab === 'local' }" @click="mainTab = 'local'">
                            🔍 纠错
                          </button>
                          <button :class="{ active: mainTab === 'ai' }" @click="mainTab = 'ai'">
                            🤖 AI校对
                          </button>
                        </div>

                        <div class="tool-body">
                          <!-- AI校对内容 -->
                          <div v-show="mainTab === 'ai'" class="tab-content">
                            <!-- 配置区域 -->
                            <div class="config-section">
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
                                <label>校对场景</label>
                                <select v-model="selectedPreset" @change="onPresetChange(selectedPreset)" class="select-box">
                                  <option value="">选择校对场景（可选）</option>
                                  <optgroup label="内置场景">
                                    <option v-for="preset in allPresetOptions.filter(p => p.isBuiltin)" :key="preset.id" :value="preset.id">
                                      {{ preset.title }}
                                    </option>
                                  </optgroup>
                                  <optgroup label="自定义提示词" v-if="allPresetOptions.filter(p => !p.isBuiltin).length > 0">
                                    <option v-for="preset in allPresetOptions.filter(p => !p.isBuiltin)" :key="preset.id" :value="preset.id">
                                      {{ preset.title }}
                                    </option>
                                  </optgroup>
                                </select>
                                <p v-if="selectedPreset" class="preset-description">
                                  {{allPresetOptions.find(p => p.id === selectedPreset)?.description}}
                                </p>
                              </div>

                              <div class="form-item">
                                <label>校对提示词</label>
                                <div class="prompt-selector-wrapper">
                                  <select @change="selectProofreadPrompt(($event.target as HTMLSelectElement).value)" class="prompt-quick-select">
                                    <option value="">从提示词库快速选择（可选）</option>
                                    <option v-for="prompt in promptOptions" :key="prompt.id" :value="prompt.id">
                                      {{ prompt.title }}
                                    </option>
                                  </select>
                                </div>
                                <textarea v-model="selectedPrompt" placeholder="输入校对提示词或从上方快速选择..." rows="4"></textarea>
                              </div>

                              <div class="actions">
                                <button class="btn-primary" :disabled="!canProofread || isProofreading" @click="startProofread">
                                  {{ isProofreading ? '校对中...' : '开始校对' }}
                                </button>
                              </div>

                              <div class="progress" v-if="progress">
                                {{ progress }}
                              </div>
                            </div>

                            <!-- 标签页 -->
                            <div class="tabs" v-if="issues.length > 0">
                              <button :class="{ active: activeTab === 'errors' }" @click="activeTab = 'errors'">
                                纠错 ({{ issues.length }})
                              </button>
                              <button :class="{ active: activeTab === 'preview' }" @click="activeTab = 'preview'">
                                预览
                              </button>
                            </div>

                            <!-- 问题列表 -->
                            <div class="issues-section" v-if="activeTab === 'errors' && issues.length > 0">
                              <div class="issues-header">
                                <div class="stats">
                                  <span class="stat-item error">❌ 错误 {{ issueStats.error }}</span>
                                  <span class="stat-item warning">⚠️ 警告 {{ issueStats.warning }}</span>
                                  <span class="stat-item suggestion">💡 建议 {{ issueStats.suggestion }}</span>
                                </div>
                                <div class="batch-actions">
                                  <label class="checkbox-label">
                                    <input type="checkbox" v-model="isAllSelected" />
                                    全选
                                  </label>
                                  <button class="btn-small" :disabled="!issues.some(i => i.selected)" @click="applyAllSelected">
                                    全部修改
                                  </button>
                                </div>
                              </div>

                              <div class="issues-list">
                                <div v-for="issue in filteredIssues" :key="issue.id" class="issue-item" :class="getIssueColorClass(issue.type)">
                                  <div class="issue-header">
                                    <label class="checkbox-label">
                                      <input type="checkbox" v-model="issue.selected" />
                                    </label>
                                    <span class="issue-icon">{{ getIssueIcon(issue.type) }}</span>
                                    <span class="issue-category">{{ issue.category }}</span>
                                  </div>

                                  <div class="issue-content">
                                    <div class="issue-row">
                                      <span class="label">发现：</span>
                                      <span class="original-text">{{ issue.original }}</span>
                                    </div>
                                    <div class="issue-row" v-if="issue.suggestion">
                                      <span class="label">建议：</span>
                                      <span class="suggestion-text">{{ issue.suggestion }}</span>
                                    </div>
                                    <div class="issue-row" v-if="issue.reason">
                                      <span class="label">原因：</span>
                                      <span class="reason-text">{{ issue.reason }}</span>
                                    </div>
                                  </div>

                                  <div class="issue-actions">
                                    <button class="btn-action btn-apply" @click="applyIssue(issue)">
                                      修改
                                    </button>
                                    <button class="btn-action btn-ignore" @click="ignoreIssue(issue)">
                                      忽略
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <!-- 预览 -->
                            <div class="preview-section" v-if="activeTab === 'preview'">
                              <div class="preview-header">
                                <h4>AI 返回内容</h4>
                              </div>
                              <pre class="preview-content">{{ aiRawResponse || '暂无数据' }}</pre>
                            </div>

                            <!-- 空状态 -->
                            <div class="empty-state" v-if="!isProofreading && issues.length === 0 && !progress">
                              <div class="empty-icon">✅</div>
                              <p>选择AI模型和提示词，点击“开始校对”进行文本校对</p>
                            </div>
                          </div>

                          <!-- 本地纠错内容 -->
                          <div v-show="mainTab === 'local'" class="tab-content">
                            <LocalProofreadTool :getEditorBody="props.getEditorBody" @apply-fix="handleLocalProofreadFix" @apply-all="handleLocalProofreadAll" />
                          </div>
                        </div>
                      </div>
                    </template>

                    <style scoped>
                    .proofread-tool {
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

                    .main-tabs {
                      display: flex;
                      justify-content: space-between;
                      background-color: var(--background-tertiary);
                      height: 2.2rem;
                      border-radius: 0.25rem;
                      overflow: hidden;
                      margin: 0.5rem 1rem;
                      border-bottom: 1px solid var(--border-color);
                    }

                    .main-tabs button {
                      flex: 1;
                      margin: 0;
                      padding: 0.25rem 0.5rem;
                      border-right: 1px solid var(--border-color);
                      border-radius: 0;
                      background: none;
                      border-top: none;
                      border-left: none;
                      border-bottom: none;
                      color: var(--text-secondary);
                      font-size: 0.9rem;
                      font-weight: 500;
                      cursor: pointer;
                      transition: all 0.2s;
                    }

                    .main-tabs button:last-child {
                      border-right: none;
                    }

                    .main-tabs button:hover {
                      color: var(--text-primary);
                    }

                    .main-tabs button.active {
                      color: var(--primary);
                      border-bottom: 1px solid var(--primary);
                    }

                    .tool-body {
                      flex: 1;
                      overflow-y: auto;
                      display: flex;
                      flex-direction: column;
                    }

                    .tab-content {
                      flex: 1;
                      display: flex;
                      flex-direction: column;
                    }

                    .config-section {
                      margin-bottom: 1rem;
                      padding: .5rem;
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

                    .prompt-selector-wrapper {
                      margin-bottom: 0.5rem;
                    }

                    .prompt-quick-select {
                      width: 100%;
                      padding: 0.375rem 0.5rem;
                      border: 1px solid var(--border-color);
                      border-radius: 0.25rem;
                      background-color: var(--background-tertiary);
                      color: var(--text-tertiary);
                      font-size: 0.8rem;
                      cursor: pointer;
                    }

                    .prompt-quick-select:focus {
                      outline: none;
                      border-color: var(--primary);
                      color: var(--text-primary);
                    }

                    .preset-description {
                      margin-top: 0.4rem;
                      font-size: 0.8rem;
                      color: var(--text-tertiary);
                      line-height: 1.4;
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

                    .btn-primary:disabled {
                      opacity: 0.5;
                      cursor: not-allowed;
                    }

                    .progress {
                      margin-top: 0.5rem;
                      padding: 0.5rem;
                      background-color: var(--background-secondary);
                      border-radius: 0.25rem;
                      font-size: 0.875rem;
                      color: var(--text-secondary);
                      text-align: center;
                    }

                    .tabs {
                      display: flex;
                      justify-content: space-between;
                      background-color: var(--background-tertiary);
                      height: 2.2rem;
                      border-radius: 0.25rem;
                      overflow: hidden;
                      margin-bottom: 1rem;
                    }

                    .tabs button {
                      flex: 1;
                      margin: 0;
                      padding: 0.25rem 0.5rem;
                      border-right: 1px solid var(--border-color);
                      border-radius: 0;
                      background: none;
                      border-top: none;
                      border-left: none;
                      border-bottom: none;
                      color: var(--text-secondary);
                      cursor: pointer;
                      transition: all 0.2s;
                    }

                    .tabs button:last-child {
                      border-right: none;
                    }

                    .tabs button.active {
                      color: var(--primary);
                      border-bottom: 1px solid var(--primary);
                    }

                    .issues-section {
                      flex: 1;
                    }

                    .issues-header {
                      display: flex;
                      justify-content: space-between;
                      align-items: center;
                      margin-bottom: 1rem;
                      padding: 0.75rem;
                      background-color: var(--background-secondary);
                      border-radius: 0.25rem;
                    }

                    .stats {
                      display: flex;
                      gap: 1rem;
                      font-size: 0.875rem;
                    }

                    .stat-item {
                      display: flex;
                      align-items: center;
                      gap: 0.25rem;
                    }

                    .stat-item.error {
                      color: var(--danger);
                    }

                    .stat-item.warning {
                      color: var(--warning);
                    }

                    .stat-item.suggestion {
                      color: var(--info);
                    }

                    .batch-actions {
                      display: flex;
                      align-items: center;
                      gap: 0.5rem;
                    }

                    .checkbox-label {
                      display: flex;
                      align-items: center;
                      gap: 0.25rem;
                      font-size: 0.875rem;
                      cursor: pointer;
                    }

                    .btn-small {
                      padding: 0.25rem 0.75rem;
                      font-size: 0.875rem;
                      background-color: var(--primary);
                      color: white;
                      border: none;
                      border-radius: 0.25rem;
                      cursor: pointer;
                    }

                    .btn-small:disabled {
                      opacity: 0.5;
                      cursor: not-allowed;
                    }

                    .issues-list {
                      display: flex;
                      flex-direction: column;
                      gap: 0.75rem;
                    }

                    .issue-item {
                      padding: .5rem;
                      background-color: var(--background-secondary);
                      border-radius: 0.25rem;
                      border-left: 3px solid var(--border-color);
                      transition: all 0.2s;
                    }

                    .issue-item:hover {
                      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                    }

                    .issue-item.issue-error {
                      border-left-color: var(--danger);
                    }

                    .issue-item.issue-warning {
                      border-left-color: var(--warning);
                    }

                    .issue-item.issue-suggestion {
                      border-left-color: var(--info);
                    }

                    .issue-header {
                      display: flex;
                      align-items: center;
                      gap: 0.5rem;
                      margin-bottom: 0.75rem;
                    }

                    .issue-icon {
                      font-size: 1rem;
                    }

                    .issue-category {
                      font-weight: 600;
                      color: var(--text-primary);
                      font-size: 0.875rem;
                    }

                    .issue-content {
                      margin-bottom: 0.75rem;
                    }

                    .issue-row {
                      display: flex;
                      gap: 0.5rem;
                      margin-bottom: 0.5rem;
                      font-size: 0.875rem;
                    }

                    .issue-row .label {
                      color: var(--text-secondary);
                      font-weight: 500;
                      min-width: 3rem;
                    }

                    .original-text {
                      color: var(--danger);
                      text-decoration: line-through;
                    }

                    .suggestion-text {
                      color: var(--success);
                      font-weight: 500;
                    }

                    .reason-text {
                      color: var(--text-secondary);
                      font-style: italic;
                    }

                    .issue-actions {
                      display: flex;
                      gap: 0.5rem;
                    }

                    .btn-action {
                      padding: 0.375rem 0.75rem;
                      font-size: 0.875rem;
                      border: 1px solid var(--border-color);
                      border-radius: 0.25rem;
                      cursor: pointer;
                      transition: all 0.2s;
                    }

                    .btn-apply {
                      background-color: var(--primary);
                      color: white;
                      border-color: var(--primary);
                    }

                    .btn-ignore {
                      background-color: var(--background-tertiary);
                      color: var(--text-secondary);
                    }

                    .preview-section {
                      flex: 1;
                    }

                    .preview-header {
                      margin-bottom: 1rem;
                    }

                    .preview-header h4 {
                      margin: 0;
                      font-size: 0.875rem;
                      color: var(--text-secondary);
                    }

                    .preview-content {
                      padding: 1rem;
                      background-color: var(--background-secondary);
                      border-radius: 0.25rem;
                      border: 1px solid var(--border-color);
                      font-size: 0.875rem;
                      color: var(--text-primary);
                      white-space: pre-wrap;
                      word-wrap: break-word;
                      max-height: 500px;
                      overflow-y: auto;
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
                    }
                  </style>
