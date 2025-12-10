<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useModelsStore } from '@/stores/ModelsStore'
import { usePromptsStore } from '@/stores/PromptsStore'
import { useEntityStore } from '@/stores/EntitysStore'
import { useSelectedBookStore } from '@/stores/SelectedBookStore'
import { articledb, entitydb } from '@/db'
import { openaiFetch, type OpenAiParams } from '@/apis'
import type { Article, Entity } from '@/types'
import { uid } from '@/utils'
import { $tips } from '@/plugins/notyf'

const modelsStore = useModelsStore()
const promptsStore = usePromptsStore()
const entityStore = useEntityStore()
const selectedBookStore = useSelectedBookStore()

/** 选中的模型 */
const selectedModel = ref<OpenAiParams | null>(null)
/** 选中的提示词 */
const selectedPrompt = ref<string>('')
/** 是否携带已有实体 */
const includeExistingEntities = ref(false)
/** 选中的文章 */
const selectedArticles = ref<Article[]>([])
/** 所有文章 */
const allArticles = ref<Article[]>([])
/** 是否正在提取 */
const isExtracting = ref(false)
/** AI返回的结果 */
const extractResult = ref('')
/** 提取进度 */
const progress = ref('')

/** 模型选项 */
const modelOptions = computed(() => modelsStore.v)

/** 提示词选项 */
const promptOptions = computed(() => promptsStore.v)

/** 是否可以开始提取 */
const canExtract = computed(() => {
  return selectedModel.value && selectedPrompt.value && selectedArticles.value.length > 0
})

onMounted(() => {
  loadArticles()
  // 默认选择第一个模型
  if (modelOptions.value.length > 0) {
    selectedModel.value = modelOptions.value[0]
  }
})

/** 加载文章列表 */
async function loadArticles() {
  if (!selectedBookStore.v?.id) return

  allArticles.value = await articledb.getBookArticles(selectedBookStore.v.id)
}

/** 切换文章选择 */
function toggleArticle(article: Article) {
  const index = selectedArticles.value.findIndex(a => a.id === article.id)
  if (index > -1) {
    selectedArticles.value.splice(index, 1)
  } else {
    selectedArticles.value.push(article)
  }
}

/** 全选/反选 */
function toggleAllArticles() {
  if (selectedArticles.value.length === allArticles.value.length) {
    selectedArticles.value = []
  } else {
    selectedArticles.value = [...allArticles.value]
  }
}

/** 判断文章是否选中 */
function isArticleSelected(article: Article) {
  return selectedArticles.value.some(a => a.id === article.id)
}

/** 开始提取 */
async function startExtraction() {
  if (!canExtract.value || !selectedModel.value) return

  isExtracting.value = true
  extractResult.value = ''
  progress.value = '正在准备...'

  try {
    // 1. 获取所有选中文章的内容
    progress.value = '正在加载文章内容...'
    const articleContents: string[] = []
    for (const article of selectedArticles.value) {
      const body = await articledb.getArticleBody(article.id)
      if (body?.content) {
        articleContents.push(`### ${article.title}\n${body.content}`)
      }
    }

    if (articleContents.length === 0) {
      throw new Error('选中的文章没有内容')
    }

    // 2. 构建提示词
    let systemPrompt = selectedPrompt.value

    // 如果需要携带已有实体
    if (includeExistingEntities.value && entityStore.v.length > 0) {
      progress.value = '正在加载已有实体...'
      // 压缩实体信息:只保留必要字段,去除空值
      const existingEntities = entityStore.v.map(e => {
        const compressed: any = { t: e.title, ty: e.type }
        if (e.description) compressed.d = e.description
        if (e.attrs && e.attrs.length > 0) {
          compressed.a = e.attrs.map(attr => ({ t: attr.title, v: attr.value }))
        }
        return compressed
      })
      systemPrompt += `\n\n已有实体(t=标题,ty=类型,d=描述,a=属性[t=名,v=值]):\n${JSON.stringify(existingEntities)}`
    }

    // 3. 调用AI
    progress.value = '正在调用AI...'
    const userContent = `请从以下文章中提取实体信息，返回JSON格式的数组。每个实体包含：title(名称), type(类型), description(描述), attrs(自定义属性数组，每个属性包含title和value)。不需要包含id、bookId、时间等字段。

文章内容：
${articleContents.join('\n\n')}`

    const response = await openaiFetch({
      ...selectedModel.value,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent }
      ],
      stream: false
    })

    if (!response || !response.choices || !response.choices[0]) {
      throw new Error('AI返回格式错误')
    }

    const aiContent = response.choices[0].message?.content || ''
    extractResult.value = aiContent

    // 4. 解析AI返回的JSON
    progress.value = '正在解析结果...'
    let entities: Partial<Entity>[] = []

    try {
      // 尝试直接解析JSON
      entities = JSON.parse(aiContent)
    } catch {
      // 如果直接解析失败，尝试提取JSON代码块
      const jsonMatch = aiContent.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (jsonMatch) {
        entities = JSON.parse(jsonMatch[1].trim())
      } else {
        throw new Error('无法从返回中解析JSON数据')
      }
    }

    if (!Array.isArray(entities)) {
      throw new Error('AI返回的数据不是数组格式')
    }

    // 5. 批量创建实体
    progress.value = `正在创建实体... (0/${entities.length})`
    let successCount = 0

    for (let i = 0; i < entities.length; i++) {
      const entityData = entities[i]

      if (!entityData.title || !entityData.type) {
        console.warn('跳过无效实体:', entityData)
        continue
      }

      const now = Date.now()
      const newEntity: Entity = {
        id: uid(),
        bookId: selectedBookStore.v!.id,
        title: entityData.title,
        type: entityData.type,
        description: entityData.description || '',
        imgID: '',
        attrs: entityData.attrs || [],
        createdTime: now,
        modifiedTime: now,
        deletedTime: 0
      }

      const result = await entitydb.createEntity(newEntity)
      if (result.success) {
        successCount++
        progress.value = `正在创建实体... (${successCount}/${entities.length})`
      }
    }

    // 6. 刷新实体列表
    entityStore.load(selectedBookStore.v!.id)

    progress.value = `完成！成功创建 ${successCount}/${entities.length} 个实体`
    $tips.success(`成功提取并创建 ${successCount} 个实体`)

  } catch (err: any) {
    progress.value = `错误: ${err.message}`
    $tips.error(`提取失败: ${err.message}`)
    console.error(err)
  } finally {
    isExtracting.value = false
  }
}

/** 清空结果 */
function clearResult() {
  extractResult.value = ''
  progress.value = ''
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
        <select v-model="selectedPrompt" class="select-box">
          <option value="" disabled>请选择提示词</option>
          <option v-for="prompt in promptOptions" :key="prompt.id" :value="prompt.prompt">
            {{ prompt.title }}
          </option>
        </select>
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

      <!-- 文章选择 -->
      <div class="section">
        <div class="section-header">
          <h3>📚 选择文章</h3>
          <button @click="toggleAllArticles" class="btn-small">
            {{ selectedArticles.length === allArticles.length ? '反选' : '全选' }}
          </button>
        </div>
        <div class="article-list">
          <div v-if="allArticles.length === 0" class="empty-state">
            当前书籍没有文章
          </div>
          <label v-for="article in allArticles" :key="article.id" class="article-item" :class="{ selected: isArticleSelected(article) }">
            <input type="checkbox" :checked="isArticleSelected(article)" @change="toggleArticle(article)" />
            <span class="article-title">{{ article.title }}</span>
            <span class="article-words">{{ article.wordCount }} 字</span>
          </label>
        </div>
      </div>

      <!-- 提取按钮 -->
      <div class="section">
        <button @click="startExtraction" :disabled="!canExtract || isExtracting" class="btn-extract">
          {{ isExtracting ? '提取中...' : '✨ 开始提取实体' }}
        </button>
      </div>

      <!-- 进度显示 -->
      <div v-if="progress" class="section">
        <div class="progress-box">
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
    </div>
  </div>
</template>

<style scoped>
.entity-ai-extract {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow-y: auto;
  padding: 1.5rem;
}

.content {
  max-width: 700px;
  margin: 0 auto;
  width: 100%;
}

.section {
  margin-bottom: 1.5rem;
}

.section h3 {
  color: var(--text-primary);
  margin-bottom: 0.75rem;
  font-size: 1rem;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.select-box {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 0.25rem;
  background-color: var(--background-secondary);
  color: var(--text-primary);
  font-size: 0.9rem;
  cursor: pointer;
}

.select-box:focus {
  outline: none;
  border-color: var(--primary);
}

.hint {
  color: var(--text-tertiary);
  font-size: 0.85rem;
  margin-top: 0.5rem;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-primary);
  font-size: 0.9rem;
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  width: 1rem;
  height: 1rem;
  cursor: pointer;
}

.article-list {
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid var(--border-color);
  border-radius: 0.25rem;
  padding: 0.5rem;
}

.empty-state {
  text-align: center;
  padding: 2rem;
  color: var(--text-tertiary);
}

.article-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  border-radius: 0.25rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.article-item:hover {
  background-color: var(--background-tertiary);
}

.article-item.selected {
  background-color: var(--background-tertiary);
}

.article-item input[type="checkbox"] {
  cursor: pointer;
}

.article-title {
  flex: 1;
  color: var(--text-primary);
  font-size: 0.9rem;
}

.article-words {
  color: var(--text-tertiary);
  font-size: 0.8rem;
}

.btn-small {
  padding: 0.25rem 0.75rem;
  background-color: var(--background-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  border-radius: 0.25rem;
  cursor: pointer;
  font-size: 0.85rem;
}

.btn-small:hover {
  background-color: var(--background-secondary);
}

.btn-extract {
  width: 100%;
  padding: 1rem;
  background-color: var(--primary);
  color: white;
  border: none;
  border-radius: 0.25rem;
  cursor: pointer;
  font-size: 1rem;
  font-weight: bold;
  transition: background-color 0.2s;
}

.btn-extract:hover:not(:disabled) {
  background-color: var(--primary-dark);
}

.btn-extract:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.progress-box {
  padding: 1rem;
  background-color: var(--background-secondary);
  border-left: 3px solid var(--primary);
  border-radius: 0.25rem;
  color: var(--text-primary);
  font-size: 0.9rem;
}

.result-box {
  padding: 1rem;
  background-color: var(--background-secondary);
  border: 1px solid var(--border-color);
  border-radius: 0.25rem;
  color: var(--text-primary);
  font-size: 0.85rem;
  line-height: 1.6;
  overflow-x: auto;
  max-height: 400px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-wrap: break-word;
}

/* 滚动条样式 */
.article-list::-webkit-scrollbar,
.result-box::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.article-list::-webkit-scrollbar-track,
.result-box::-webkit-scrollbar-track {
  background: var(--background-secondary);
}

.article-list::-webkit-scrollbar-thumb,
.result-box::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 3px;
}

.article-list::-webkit-scrollbar-thumb:hover,
.result-box::-webkit-scrollbar-thumb:hover {
  background: var(--text-tertiary);
}
</style>
