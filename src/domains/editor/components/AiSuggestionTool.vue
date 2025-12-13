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

/** 内置预设场景（不可删除，不可编辑） */
const BUILTIN_PRESETS = [
  {
    id: 'continue-writing',
    title: '📝 续写建议',
    description: '基于当前内容提供续写方向',
    systemPrompt: `你是一个专业的写作助手，擅长为作者提供创作灵感和续写建议。

你必须严格按照以下JSON格式返回结果，不要包含任何其他内容：
{
  "title": "续写方向建议",
  "suggestions": [
    {
      "title": "方向标题",
      "description": "详细描述该方向的情节发展（200字左右）",
      "keyPoints": ["关键要点1", "关键要点2", "关键要点3"]
    }
  ],
  "summary": "总体建议"
}

注意：
1. 必须返回有效的JSON格式
2. 提供3-5个不同的续写方向
3. 每个方向要具有创意且符合前文逻辑
4. 关键要点应简洁明了`,
    userPrompt: `请基于以下内容，为我提供3-5个可能的续写方向。

要求：
1. 每个方向包含标题和200字左右的详细描述
2. 为每个方向提炼2-4个关键要点
3. 确保建议具有创意且符合前文逻辑
4. 严格按照JSON格式返回结果`
  },
  {
    id: 'plot-optimization',
    title: '🎯 情节优化',
    description: '分析当前情节并提供优化建议',
    systemPrompt: `你是一个专业的文学编辑，擅长分析故事情节并提供优化建议。

你必须严格按照以下JSON格式返回结果：
{
  "title": "情节优化建议",
  "suggestions": [
    {
      "title": "优化点标题",
      "description": "详细说明该优化点的具体建议和理由",
      "keyPoints": ["具体改进措施1", "具体改进措施2"]
    }
  ],
  "summary": "整体优化总结"
}

分析维度：
1. 情节逻辑性和连贯性
2. 人物行为的合理性
3. 冲突设置的有效性
4. 节奏把控
5. 伏笔与呼应`,
    userPrompt: `请分析以下内容的情节，从逻辑性、人物塑造、冲突设置、节奏把控等角度提供3-5个优化建议。

要求：
1. 指出可优化的具体问题
2. 提供切实可行的改进方案
3. 严格按照JSON格式返回结果`
  },
  {
    id: 'character-development',
    title: '👥 人物发展',
    description: '为人物角色提供深化发展建议',
    systemPrompt: `你是一个专业的角色设计顾问，擅长人物塑造和角色发展。

你必须严格按照以下JSON格式返回结果：
{
  "title": "人物发展建议",
  "suggestions": [
    {
      "title": "发展方向",
      "description": "详细说明该角色的发展路径和可能的情节设计",
      "keyPoints": ["性格特征变化", "关键事件触发", "关系网络影响"]
    }
  ],
  "summary": "人物发展总体建议"
}

关注点：
1. 人物性格的立体性
2. 成长弧线的设计
3. 人物关系的推进
4. 内心冲突的刻画`,
    userPrompt: `请基于以下内容，分析主要人物角色，提供3-5个人物深化发展的建议。

要求：
1. 分析人物当前状态
2. 提供具体的发展方向
3. 设计可能的关键转折点
4. 严格按照JSON格式返回结果`
  },
  {
    id: 'worldbuilding',
    title: '🌍 世界观扩展',
    description: '扩展和丰富作品的世界观设定',
    systemPrompt: `你是一个专业的世界观设计师，擅长构建丰富完整的虚拟世界。

你必须严格按照以下JSON格式返回结果：
{
  "title": "世界观扩展建议",
  "suggestions": [
    {
      "title": "扩展方向",
      "description": "详细说明该方向的设定内容和如何融入故事",
      "keyPoints": ["核心设定要素", "与主线的关联", "展现方式"]
    }
  ],
  "summary": "世界观建设总结"
}

关注维度：
1. 世界的历史背景
2. 社会结构和规则
3. 文化和风俗
4. 地理环境
5. 独特的体系设定`,
    userPrompt: `请基于以下内容，提供3-5个世界观扩展和丰富的建议。

要求：
1. 分析现有世界观框架
2. 提供具体的扩展方向
3. 说明如何自然地融入故事
4. 严格按照JSON格式返回结果`
  },
  {
    id: 'conflict-design',
    title: '⚔️ 冲突设计',
    description: '设计和强化故事冲突点',
    systemPrompt: `你是一个专业的故事架构师，擅长设计引人入胜的冲突和张力。

你必须严格按照以下JSON格式返回结果：
{
  "title": "冲突设计建议",
  "suggestions": [
    {
      "title": "冲突类型",
      "description": "详细说明冲突的设置、发展和解决思路",
      "keyPoints": ["冲突源头", "升级路径", "潜在影响"]
    }
  ],
  "summary": "冲突设计总体思路"
}

冲突类型：
1. 人物间冲突
2. 内心冲突
3. 人与环境的冲突
4. 价值观冲突
5. 目标与阻碍的冲突`,
    userPrompt: `请基于以下内容，设计3-5个可以增强故事张力的冲突点。

要求：
1. 分析现有冲突状态
2. 提供新的冲突设计方案
3. 说明冲突的发展和影响
4. 严格按照JSON格式返回结果`
  }
] as const

/** 选中的模型 */
const selectedModel = ref<OpenAiParams | null>(null)
/** 当前选择的预设场景ID */
const selectedPreset = ref<string>('')
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
/** 解析后的建议结果 */
const parsedResult = ref<{
  title?: string
  suggestions?: Array<{
    title: string
    description: string
    keyPoints?: string[]
  }>
  summary?: string
} | null>(null)
/** 当前标签页 */
const activeTab = ref<'config' | 'result'>('config')
/** 当前书籍的所有文章列表 */
const articles = ref<any[]>([])

/** 模型选项 */
const modelOptions = computed(() => modelsStore.v)

/** 提示词选项（用户自定义的提示词） */
const promptOptions = computed(() => promptsStore.v)

/** 合并后的预设选项（内置 + 用户自定义） */
const allPresetOptions = computed(() => {
  return [
    ...BUILTIN_PRESETS.map(p => ({ ...p, isBuiltin: true })),
    ...promptOptions.value.map(p => ({
      id: p.id,
      title: p.title,
      description: '',
      systemPrompt: p.prompt,
      userPrompt: '',
      isBuiltin: false
    }))
  ]
})

/** 是否可以开始生成 */
const canGenerate = computed(() => {
  return selectedModel.value && systemPrompt.value  // 只要求系统提示词，用户提示词可选
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

  // 恢复预设场景选择
  if (savedConfig.presetId) {
    selectedPreset.value = savedConfig.presetId
    applyPreset(savedConfig.presetId)
  } else {
    // 默认使用第一个内置预设
    selectedPreset.value = BUILTIN_PRESETS[0].id
    applyPreset(BUILTIN_PRESETS[0].id)
  }

  // 如果有自定义保存的提示词，覆盖预设
  if (savedConfig.systemPrompt) {
    systemPrompt.value = savedConfig.systemPrompt
  }
  if (savedConfig.userPrompt) {
    userPrompt.value = savedConfig.userPrompt
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
    presetId: selectedPreset.value,
    systemPrompt: systemPrompt.value,
    userPrompt: userPrompt.value
  })
}

// 监听配置变化，自动保存
watch([selectedModel, selectedPreset, systemPrompt, userPrompt], () => {
  saveConfig()
})

/** 应用预设场景 */
function applyPreset(presetId: string) {
  const preset = allPresetOptions.value.find(p => p.id === presetId)
  if (preset) {
    systemPrompt.value = preset.systemPrompt
    if (preset.userPrompt) {
      userPrompt.value = preset.userPrompt
    }
    selectedPreset.value = presetId
  }
}

/** 处理预设选择变化 */
function onPresetChange(presetId: string) {
  if (presetId) {
    applyPreset(presetId)
  }
}

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
  return BUILTIN_PRESETS[0].systemPrompt
}

/** 获取默认用户提示词 */
function getDefaultUserPrompt(): string {
  return ''  // 默认为空，用户可选择填写
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

/** 从提示词库选择参考内容 */
function selectReferencePrompt(promptId: string) {
  const prompt = promptOptions.value.find(p => p.id === promptId)
  if (prompt) {
    referenceContent.value = prompt.prompt
    $tips.success('已填入提示词')
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

    // 尝试解析JSON格式的结果
    try {
      // 清理可能的markdown代码块标记
      let cleanContent = aiContent.trim()
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.replace(/^```json\n/, '').replace(/\n```$/, '')
      } else if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.replace(/^```\n/, '').replace(/\n```$/, '')
      }

      const parsed = JSON.parse(cleanContent)
      parsedResult.value = parsed
    } catch (e) {
      console.warn('AI返回的不是有效的JSON格式，使用纯文本展示', e)
      parsedResult.value = null
    }

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
  parsedResult.value = null
  activeTab.value = 'config'
}

/** 复制单个建议 */
function copySuggestion(suggestion: any) {
  let text = `${suggestion.title}\n\n${suggestion.description}`

  if (suggestion.keyPoints && suggestion.keyPoints.length > 0) {
    text += '\n\n关键要点：\n'
    text += suggestion.keyPoints.map((p: string) => `• ${p}`).join('\n')
  }

  navigator.clipboard.writeText(text).then(() => {
    $tips.success('已复制建议')
  }).catch(err => {
    $tips.error('复制失败')
    console.error(err)
  })
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

        <!-- 预设场景选择 -->
        <div class="form-item">
          <label>场景预设</label>
          <select v-model="selectedPreset" @change="onPresetChange(selectedPreset)">
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
          <div class="preset-description" v-if="selectedPreset">
            {{allPresetOptions.find(p => p.id === selectedPreset)?.description}}
          </div>
        </div>

        <!-- 系统提示词 -->
        <div class="form-item">
          <label>系统提示词（可自定义修改）</label>
          <textarea v-model="systemPrompt" placeholder="输入系统提示词..." rows="4"></textarea>
        </div>

        <!-- 用户提示词 -->
        <div class="form-item">
          <label>用户提示词（可自定义修改）</label>
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

        <!-- 参考内容（手动输入或选择提示词） -->
        <div class="form-item">
          <label>或手动输入参考内容</label>
          <div class="prompt-selector-wrapper">
            <select @change="selectReferencePrompt(($event.target as HTMLSelectElement).value)" class="prompt-quick-select">
              <option value="">从提示词库快速填入（可选）</option>
              <option v-for="prompt in promptOptions" :key="prompt.id" :value="prompt.id">
                {{ prompt.title }}
              </option>
            </select>
          </div>
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
              📋 复制全部
            </button>
            <button class="btn-small" @click="clearResult">
              🗑️ 清空
            </button>
          </div>
        </div>

        <!-- 结构化展示 -->
        <div class="result-content" v-if="parsedResult && suggestionResult">
          <!-- 标题 -->
          <div class="result-title" v-if="parsedResult.title">
            <h3>{{ parsedResult.title }}</h3>
          </div>

          <!-- 建议列表 -->
          <div class="suggestions-list" v-if="parsedResult.suggestions && parsedResult.suggestions.length > 0">
            <div class="suggestion-card" v-for="(suggestion, index) in parsedResult.suggestions" :key="index">
              <div class="suggestion-header">
                <div class="suggestion-number">{{ index + 1 }}</div>
                <h4 class="suggestion-title">{{ suggestion.title }}</h4>
                <button class="btn-copy-suggestion" @click="copySuggestion(suggestion)" title="复制此建议">
                  📋
                </button>
              </div>

              <div class="suggestion-description">
                {{ suggestion.description }}
              </div>

              <div class="suggestion-keypoints" v-if="suggestion.keyPoints && suggestion.keyPoints.length > 0">
                <div class="keypoints-title">关键要点：</div>
                <ul>
                  <li v-for="(point, pIndex) in suggestion.keyPoints" :key="pIndex">
                    {{ point }}
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <!-- 总结 -->
          <div class="result-summary" v-if="parsedResult.summary">
            <div class="summary-icon">💬</div>
            <div class="summary-content">{{ parsedResult.summary }}</div>
          </div>
        </div>

        <!-- 纯文本展示（降级方案） -->
        <div class="result-content-plain" v-else-if="suggestionResult">
          <div class="fallback-notice">
            ℹ️ AI返回的不是标准格式，以下为原始内容：
          </div>
          <pre>{{ suggestionResult }}</pre>
        </div>

        <!-- 空状态 -->
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
  justify-content: space-between;
  background-color: var(--background-tertiary);
  height: 2.2rem;
  border-radius: 0.25rem;
  overflow: hidden;
  margin: 0.5rem 1rem;
  border-bottom: 1px solid var(--border-color);
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

.preset-description {
  margin-top: 0.25rem;
  padding: 0.5rem;
  background-color: var(--background-tertiary);
  border-left: 3px solid var(--primary);
  border-radius: 0.25rem;
  font-size: 0.8rem;
  color: var(--text-secondary);
  line-height: 1.5;
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
}

.prompt-quick-select:focus {
  outline: none;
  border-color: var(--primary);
  color: var(--text-primary);
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
  padding: .5rem;
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

.btn-small:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.result-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  user-select: text;
}

.result-title {
  text-align: center;
  border-radius: 0.5rem;
  margin-bottom: 0.5rem;
}

.result-title h3 {
  margin: 0;
  color: white;
  font-size: 1.125rem;
  font-weight: 600;
}

.suggestions-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.suggestion-card {
  background-color: var(--background-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
  padding: 1.25rem;
  transition: all 0.2s;
}

.suggestion-card:hover {
  border-color: var(--primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.suggestion-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.suggestion-number {
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  background-color: var(--primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.875rem;
  flex-shrink: 0;
}

.suggestion-title {
  flex: 1;
  margin: 0;
  font-size: 1rem;
  color: var(--text-primary);
  font-weight: 600;
}

.btn-copy-suggestion {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.25rem;
  font-size: 1rem;
  opacity: 0.6;
  transition: opacity 0.2s;
}

.suggestion-description {
  color: var(--text-primary);
  line-height: 1.8;
  font-size: 0.9rem;
  margin-bottom: 0.75rem;
  text-align: justify;
}

.suggestion-keypoints {
  background-color: var(--background-secondary);
  border-left: 3px solid var(--primary);
  padding: 0.75rem 1rem;
  border-radius: 0.25rem;
}

.keypoints-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 0.5rem;
}

.suggestion-keypoints ul {
  margin: 0;
  padding-left: 1.25rem;
}

.suggestion-keypoints li {
  color: var(--text-primary);
  line-height: 1.8;
  font-size: 0.875rem;
  margin-bottom: 0.25rem;
}

.suggestion-keypoints li:last-child {
  margin-bottom: 0;
}

.result-summary {
  background-color: var(--background-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
  padding: 1rem;
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
}

.summary-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.summary-content {
  flex: 1;
  color: var(--text-primary);
  line-height: 1.6;
  font-size: 0.9rem;
}

.result-content-plain {
  flex: 1;
}

.fallback-notice {
  padding: 0.75rem;
  background-color: rgba(255, 193, 7, 0.1);
  border: 1px solid rgba(255, 193, 7, 0.3);
  border-radius: 0.25rem;
  color: var(--text-secondary);
  font-size: 0.875rem;
  margin-bottom: 1rem;
}

.result-content-plain pre {
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
