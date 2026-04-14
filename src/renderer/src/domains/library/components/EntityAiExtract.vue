<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useModelsStore } from '@domains/settings/stores/models.store'
import { usePromptsStore } from '@domains/settings/stores/prompts.store'
import { useSettingStore } from '@domains/settings/stores/settings.store'
import { useEntityStore } from '@domains/library/stores/entities.store'
import type { OpenAiParams } from '@core/api'
import { ENTITY_MERGE_PROMPTS } from '../constants/ai-prompts'
import { useEntityExtraction } from '../composables/useEntityExtraction'
import { useEntityMerge } from '../composables/useEntityMerge'
import ArticleSelector from './ArticleSelector.vue'
import MergeSuggestionsList from './MergeSuggestionsList.vue'

const modelsStore = useModelsStore()
const promptsStore = usePromptsStore()
const settingStore = useSettingStore()
const entityStore = useEntityStore()

// 使用组合式函数 - 实体提取
const {
  selectedModel,
  selectedPrompt,
  includeExistingEntities,
  selectedArticles,
  allArticles,
  isExtracting,
  extractResult,
  progress,
  canExtract,
  loadArticles,
  toggleArticle,
  toggleAllArticles,
  isArticleSelected,
  startExtraction,
  clearResult
} = useEntityExtraction()

/** 模型选项 */
const modelOptions = computed(() => modelsStore.v)

/** 提示词选项 */
const promptOptions = computed(() => promptsStore.v)

/** 合并后的合并提示词选项（内置 + 自定义） */
const allMergePromptOptions = computed(() => {
  return [
    ...ENTITY_MERGE_PROMPTS.map(p => ({ ...p, isBuiltin: true })),
    ...promptOptions.value.map(p => ({
      id: p.id,
      title: p.title,
      prompt: p.prompt,
      isBuiltin: false
    }))
  ]
})

// 使用组合式函数 - 实体合并
const {
  selectedMergePrompt,
  isMerging,
  mergeProgress,
  mergeSuggestions,
  updateSuggestions,
  startMergeAnalysis,
  toggleMergeSelection,
  toggleUpdateSelection,
  toggleAllMerges,
  toggleAllUpdates,
  executeMerge,
  cancelMerge
} = useEntityMerge(selectedModel, allMergePromptOptions)

onMounted(() => {
  loadArticles()

  // 加载保存的配置
  const savedConfig = settingStore.getAiToolConfig('entityExtract')

  // 恢复模型选择
  if (savedConfig.modelId) {
    const model = modelOptions.value.find(m => getModelId(m) === savedConfig.modelId)
    if (model) {
      selectedModel.value = model
    } else if (modelOptions.value.length > 0) {
      selectedModel.value = modelOptions.value[0]
    }
  } else if (modelOptions.value.length > 0) {
    selectedModel.value = modelOptions.value[0]
  }

  // 恢复提示词
  if (savedConfig.systemPrompt) {
    selectedPrompt.value = savedConfig.systemPrompt
  }

  // 恢复其他配置
  if (savedConfig.includeExistingEntities !== undefined) {
    includeExistingEntities.value = savedConfig.includeExistingEntities
  }
})

/** 生成模型的唯一标识 */
function getModelId(model: OpenAiParams): string {
  return `${model.baseUrl}|${model.model}`
}

/** 保存配置 */
function saveConfig() {
  if (!selectedModel.value) return

  settingStore.saveAiToolConfig('entityExtract', {
    modelId: getModelId(selectedModel.value),
    systemPrompt: selectedPrompt.value,
    includeExistingEntities: includeExistingEntities.value
  })
}

// 监听配置变化，自动保存
watch([selectedModel, selectedPrompt, includeExistingEntities], () => {
  saveConfig()
})

/** 选择提取提示词 */
function selectExtractPrompt(promptId: string) {
  const prompt = promptOptions.value.find(p => p.id === promptId)
  if (prompt) {
    selectedPrompt.value = prompt.prompt
  }
}
</script>

<template>
<div class="entity-ai-extract">
  <div class="content">
    <!-- 模型选择 -->
    <div class="section">
      <h3>🤖 选择AI模型</h3>
      <select v-model="selectedModel" class="select-box">
        <option :value="null" disabled>请选择模型</option>
        <option v-for="model in modelOptions" :key="model.model + model.baseUrl" :value="model">
          {{ model.note || model.model }}
        </option>
      </select>
      <p v-if="modelOptions.length === 0" class="hint">
        ⚠️ 请先在「设置 - AI接口」中配置AI模型
      </p>
    </div>

    <!-- 提示词选择 -->
    <div class="section">
      <h3>📝 选择系统提示词</h3>
      <div class="prompt-selector-wrapper">
        <select @change="selectExtractPrompt(($event.target as HTMLSelectElement).value)" class="prompt-quick-select">
          <option value="">从提示词库快速选择（可选）</option>
          <option v-for="prompt in promptOptions" :key="prompt.id" :value="prompt.id">
            {{ prompt.title }}
          </option>
        </select>
      </div>
      <textarea v-model="selectedPrompt" class="textarea-box" placeholder="输入系统提示词或从上方快速选择..." rows="4"></textarea>
      <p v-if="promptOptions.length === 0" class="hint">
        ⚠️ 请先在「设置 - 提示词」中添加提示词
      </p>
    </div>

    <!-- 选项 -->
    <div class="section">
      <label class="checkbox-label">
        <input type="checkbox" v-model="includeExistingEntities" />
        携带已有实体信息供参考合并
      </label>
    </div>

    <!-- 文章选择器组件 -->
    <ArticleSelector :articles="allArticles" :selected-articles="selectedArticles" @toggle="toggleArticle" @toggle-all="toggleAllArticles" />

    <!-- 提取按钮 -->
    <div class="section">
      <button @click="startExtraction" :disabled="!canExtract || isExtracting" class="btn-primary">
        {{ isExtracting ? '提取中...' : '✨ 开始提取实体' }}
      </button>
    </div>

    <!-- 进度显示 -->
    <div v-if="progress" class="section">
      <div class="progress">
        {{ progress }}
      </div>
    </div>

    <!-- 结果显示 -->
    <div v-if="extractResult" class="section">
      <div class="section-header">
        <h3>📊 AI返回结果</h3>
        <button @click="clearResult" class="btn-small">清空</button>
      </div>
      <pre class="result-box">{{ extractResult }}</pre>
    </div>

    <!-- AI合并功能 -->
    <div class="divider"></div>

    <div class="section">
      <h3>🤝 AI实体合并</h3>
      <p class="description">
        智能分析当前书籍的所有实体，识别重复和相似项，提供合并建议
      </p>

      <!-- 合并提示词选择 -->
      <div class="merge-prompt-selector">
        <label>合并策略</label>
        <select v-model="selectedMergePrompt" class="select-box">
          <option value="">使用默认策略</option>
          <optgroup label="内置策略">
            <option v-for="prompt in allMergePromptOptions.filter(p => p.isBuiltin)" :key="prompt.id" :value="prompt.id">
              {{ prompt.title }}
            </option>
          </optgroup>
          <optgroup label="自定义提示词" v-if="allMergePromptOptions.filter(p => !p.isBuiltin).length > 0">
            <option v-for="prompt in allMergePromptOptions.filter(p => !p.isBuiltin)" :key="prompt.id" :value="prompt.id">
              {{ prompt.title }}
            </option>
          </optgroup>
        </select>
      </div>

      <button @click="startMergeAnalysis" :disabled="!selectedModel || entityStore.v.length === 0 || isMerging" class="btn-secondary">
        {{ isMerging ? '分析中...' : '🔍 开始分析合并' }}
      </button>
    </div>

    <!-- 合并进度 -->
    <div v-if="mergeProgress" class="section">
      <div class="progress">
        {{ mergeProgress }}
      </div>
    </div>

    <!-- 合并建议列表组件 -->
    <MergeSuggestionsList v-if="mergeSuggestions.length > 0 || updateSuggestions.length > 0" :merge-suggestions="mergeSuggestions" :update-suggestions="updateSuggestions" :is-merging="isMerging" @toggle-merge="toggleMergeSelection" @toggle-update="toggleUpdateSelection" @toggle-all-merges="toggleAllMerges" @toggle-all-updates="toggleAllUpdates" @execute-merge="executeMerge" @cancel-merge="cancelMerge" />
  </div>
</div>
</template>

<style scoped>
.entity-ai-extract {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow-y: auto;
  padding: 1rem;
}
.content {
  max-width: 700px;
  margin: 0 auto;
  width: 100%;
}
.section {
  margin-bottom: 1rem;
}
.section h3 {
  color: var(--text-primary);
  margin-bottom: 0.6rem;
  font-size: 0.9rem;
}
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.6rem;
}
.section-header h3 {
  margin: 0;
}
.hint {
  color: var(--text-tertiary);
  font-size: 0.8rem;
  margin-top: 0.4rem;
}
.prompt-selector-wrapper {
  margin-bottom: 0.5rem;
}
.prompt-quick-select {
  width: 100%;
  padding: 0.4rem 0.5rem;
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
.merge-prompt-selector {
  margin-bottom: 0.75rem;
}
.merge-prompt-selector label {
  display: block;
  margin-bottom: 0.4rem;
  color: var(--text-secondary);
  font-size: 0.85rem;
  font-weight: 500;
}
.result-box {
  padding: 0.75rem;
  background-color: var(--background-secondary);
  border: 1px solid var(--border-color);
  border-radius: 0.25rem;
  color: var(--text-primary);
  font-size: 0.8rem;
  line-height: 1.5;
  overflow-x: auto;
  max-height: 350px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-wrap: break-word;
}
/* 滚动条样式 */
.result-box::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
.result-box::-webkit-scrollbar-track {
  background: var(--background-secondary);
}
.result-box::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 3px;
}
.result-box::-webkit-scrollbar-thumb:hover {
  background: var(--text-tertiary);
}
</style>
