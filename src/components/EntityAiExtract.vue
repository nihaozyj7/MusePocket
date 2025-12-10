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

// ========== AI合并功能 ==========
/** 是否正在合并分析 */
const isMerging = ref(false)
/** 合并进度 */
const mergeProgress = ref('')
/** 合并建议列表 */
const mergeSuggestions = ref<MergeGroup[]>([])
/** 更新建议列表 */
const updateSuggestions = ref<UpdateSuggestion[]>([])

/** 合并组 */
interface MergeGroup {
  id: string
  keep: Entity  // 保留的主实体
  merge: Entity[]  // 要合并的实体
  reason: string  // 合并原因
  selected: boolean  // 是否选中执行
}

/** 更新建议 */
interface UpdateSuggestion {
  id: string
  entity: Entity  // 原实体
  updates: Partial<Entity>  // 更新内容
  reason: string  // 更新原因
  selected: boolean  // 是否选中执行
}

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

/** 开始AI合并分析 */
async function startMergeAnalysis() {
  if (!selectedModel.value || entityStore.v.length === 0) {
    $tips.error('请先选择模型并确保有实体数据')
    return
  }

  isMerging.value = true
  mergeProgress.value = '正在分析实体...'
  mergeSuggestions.value = []
  updateSuggestions.value = []

  try {
    // 压缩实体数据
    const compressedEntities = entityStore.v.map(e => ({
      id: e.id,
      t: e.title,
      ty: e.type,
      d: e.description || '',
      a: e.attrs || []
    }))

    const systemPrompt = `你是一个实体合并专家。分析以下实体，找出重复和相似项，返回合并建议。

说明:
- id: 实体ID
- t: 标题/名称
- ty: 类型
- d: 描述
- a: 属性数组

任务:
1. 识别完全重复的实体(标题相同)
2. 识别相似实体(描述相似度>70%)
3. 对可合并实体,选择最完整的作为主实体
4. 合并属性时去重,保留所有有价值信息

返回JSON格式:
{
  "merges": [
    {
      "keepId": "保留的实体ID",
      "mergeIds": ["要合并的ID1", "要合并的ID2"],
      "reason": "合并原因"
    }
  ],
  "updates": [
    {
      "id": "实体ID",
      "title": "更新后的标题",
      "description": "补充完善的描述",
      "attrs": [更新后的属性],
      "reason": "更新原因"
    }
  ]
}`

    const userContent = `请分析以下实体，返回JSON格式的合并和曰新建议：\n${JSON.stringify(compressedEntities)}`

    mergeProgress.value = '正在调用AI...'
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

    // 解析AI返回
    mergeProgress.value = '正在解析结果...'
    let result: any
    try {
      result = JSON.parse(aiContent)
    } catch {
      const jsonMatch = aiContent.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[1].trim())
      } else {
        throw new Error('无法解析AI返回')
      }
    }

    // 处理合并建议
    if (result.merges && Array.isArray(result.merges)) {
      mergeSuggestions.value = result.merges.map((m: any) => {
        const keepEntity = entityStore.v.find(e => e.id === m.keepId)
        const mergeEntities = m.mergeIds.map((id: string) => entityStore.v.find(e => e.id === id)).filter(Boolean)

        if (!keepEntity || mergeEntities.length === 0) return null

        return {
          id: uid(),
          keep: keepEntity,
          merge: mergeEntities as Entity[],
          reason: m.reason || '未说明',
          selected: true  // 默认全选
        }
      }).filter(Boolean) as MergeGroup[]
    }

    // 处理更新建议
    if (result.updates && Array.isArray(result.updates)) {
      updateSuggestions.value = result.updates.map((u: any) => {
        const entity = entityStore.v.find(e => e.id === u.id)
        if (!entity) return null

        return {
          id: uid(),
          entity,
          updates: {
            title: u.title,
            description: u.description,
            attrs: u.attrs
          },
          reason: u.reason || '未说明',
          selected: true  // 默认全选
        }
      }).filter(Boolean) as UpdateSuggestion[]
    }

    const totalCount = mergeSuggestions.value.length + updateSuggestions.value.length
    if (totalCount === 0) {
      mergeProgress.value = '没有发现需要合并或更新的实体'
      $tips.success('实体库已是最优状态!')
    } else {
      mergeProgress.value = `分析完成! 发现 ${mergeSuggestions.value.length} 组合并, ${updateSuggestions.value.length} 个更新`
      $tips.success(`发现 ${totalCount} 个优化建议`)
    }

  } catch (err: any) {
    mergeProgress.value = `错误: ${err.message}`
    $tips.error(`分析失败: ${err.message}`)
    console.error(err)
  } finally {
    isMerging.value = false
  }
}

/** 切换合并项选择 */
function toggleMergeSelection(mergeId: string) {
  const merge = mergeSuggestions.value.find(m => m.id === mergeId)
  if (merge) merge.selected = !merge.selected
}

/** 切换更新项选择 */
function toggleUpdateSelection(updateId: string) {
  const update = updateSuggestions.value.find(u => u.id === updateId)
  if (update) update.selected = !update.selected
}

/** 全选/反选合并 */
function toggleAllMerges() {
  const allSelected = mergeSuggestions.value.every(m => m.selected)
  mergeSuggestions.value.forEach(m => m.selected = !allSelected)
}

/** 全选/反选更新 */
function toggleAllUpdates() {
  const allSelected = updateSuggestions.value.every(u => u.selected)
  updateSuggestions.value.forEach(u => u.selected = !allSelected)
}

/** 执行选中的合并和更新 */
async function executeMerge() {
  const selectedMerges = mergeSuggestions.value.filter(m => m.selected)
  const selectedUpdates = updateSuggestions.value.filter(u => u.selected)

  if (selectedMerges.length === 0 && selectedUpdates.length === 0) {
    $tips.error('请至少选择一项操作')
    return
  }

  isMerging.value = true
  mergeProgress.value = '正在执行合并...'

  try {
    let mergedCount = 0
    let updatedCount = 0

    // 1. 执行合并
    for (const mergeGroup of selectedMerges) {
      // 收集所有属性(确保数组存在)
      const allAttrs = [...(mergeGroup.keep.attrs || [])]
      for (const entity of mergeGroup.merge) {
        const entityAttrs = entity.attrs || []
        for (const attr of entityAttrs) {
          // 去重：如果属性名已存在，且值不同，保留两个
          const exists = allAttrs.find(a => a.title === attr.title && a.value === attr.value)
          if (!exists) {
            allAttrs.push(attr)
          }
        }
      }

      // 合并描述
      let mergedDescription = mergeGroup.keep.description || ''
      for (const entity of mergeGroup.merge) {
        if (entity.description && !mergedDescription.includes(entity.description)) {
          mergedDescription += (mergedDescription ? '; ' : '') + entity.description
        }
      }

      // 更新主实体
      await entitydb.updateEntity({
        ...mergeGroup.keep,
        description: mergedDescription,
        attrs: allAttrs,
        modifiedTime: Date.now()
      })

      // 删除被合并的实体
      for (const entity of mergeGroup.merge) {
        await entitydb.deleteEntity(entity.id)
      }

      mergedCount++
    }

    // 2. 执行更新
    for (const updateItem of selectedUpdates) {
      await entitydb.updateEntity({
        ...updateItem.entity,
        ...updateItem.updates,
        modifiedTime: Date.now()
      })
      updatedCount++
    }

    // 3. 刷新实体列表
    entityStore.load(selectedBookStore.v!.id)

    // 4. 清空建议列表
    mergeSuggestions.value = []
    updateSuggestions.value = []

    mergeProgress.value = `完成! 合并 ${mergedCount} 组, 更新 ${updatedCount} 个`
    $tips.success(`成功合并 ${mergedCount} 组实体, 更新 ${updatedCount} 个实体`)

  } catch (err: any) {
    mergeProgress.value = `错误: ${err.message}`
    $tips.error(`执行失败: ${err.message}`)
    console.error(err)
  } finally {
    isMerging.value = false
  }
}

/** 取消合并 */
function cancelMerge() {
  mergeSuggestions.value = []
  updateSuggestions.value = []
  mergeProgress.value = ''
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

      <!-- AI合并功能 -->
      <div class="divider"></div>

      <div class="section">
        <h3>🤝 AI实体合并</h3>
        <p class="description">
          智能分析当前书籍的所有实体，识别重复和相似项，提供合并建议
        </p>
        <button @click="startMergeAnalysis" :disabled="!selectedModel || entityStore.v.length === 0 || isMerging" class="btn-merge">
          {{ isMerging ? '分析中...' : '🔍 开始分析合并' }}
        </button>
      </div>

      <!-- 合并进度 -->
      <div v-if="mergeProgress" class="section">
        <div class="progress-box">
          {{ mergeProgress }}
        </div>
      </div>

      <!-- 合并建议列表 -->
      <div v-if="mergeSuggestions.length > 0 || updateSuggestions.length > 0" class="section">
        <div class="merge-suggestions">
          <div class="suggestions-header">
            <h4>📋 合并建议 ({{mergeSuggestions.filter(m => m.selected).length}}/{{ mergeSuggestions.length }})</h4>
            <button @click="toggleAllMerges" class="btn-small">
              {{mergeSuggestions.every(m => m.selected) ? '反选' : '全选'}}
            </button>
          </div>

          <div v-for="merge in mergeSuggestions" :key="merge.id" class="merge-item" :class="{ selected: merge.selected }">
            <div class="merge-header">
              <input type="checkbox" :checked="merge.selected" @change="toggleMergeSelection(merge.id)" />
              <span class="merge-title">合并组: {{ merge.keep.title }}</span>
            </div>
            <div class="merge-content">
              <div class="entity-keep">
                <span class="label">📌 保留:</span>
                <span class="entity-name">{{ merge.keep.title }}</span>
                <span class="entity-type">{{ merge.keep.type }}</span>
              </div>
              <div class="entity-merge">
                <span class="label">🔗 合并:</span>
                <span v-for="(entity, idx) in merge.merge" :key="entity.id" class="entity-name">
                  {{ entity.title }}<span v-if="idx < merge.merge.length - 1">, </span>
                </span>
              </div>
              <div class="merge-reason">
                <span class="label">💡 原因:</span>
                <span>{{ merge.reason }}</span>
              </div>
            </div>
          </div>

          <div v-if="updateSuggestions.length > 0" class="suggestions-header" style="margin-top: 1.5rem;">
            <h4>✨ 更新建议 ({{updateSuggestions.filter(u => u.selected).length}}/{{ updateSuggestions.length }})</h4>
            <button @click="toggleAllUpdates" class="btn-small">
              {{updateSuggestions.every(u => u.selected) ? '反选' : '全选'}}
            </button>
          </div>

          <div v-for="update in updateSuggestions" :key="update.id" class="update-item" :class="{ selected: update.selected }">
            <div class="merge-header">
              <input type="checkbox" :checked="update.selected" @change="toggleUpdateSelection(update.id)" />
              <span class="merge-title">更新: {{ update.entity.title }}</span>
            </div>
            <div class="merge-content">
              <div class="update-changes">
                <div v-if="update.updates.title && update.updates.title !== update.entity.title" class="change-item">
                  <span class="label">标题:</span>
                  <span class="old-value">{{ update.entity.title }}</span>
                  <span class="arrow">→</span>
                  <span class="new-value">{{ update.updates.title }}</span>
                </div>
                <div v-if="update.updates.description && update.updates.description !== update.entity.description" class="change-item">
                  <span class="label">描述:</span>
                  <span class="old-value">{{ update.entity.description || '无' }}</span>
                  <span class="arrow">→</span>
                  <span class="new-value">{{ update.updates.description }}</span>
                </div>
              </div>
              <div class="merge-reason">
                <span class="label">💡 原因:</span>
                <span>{{ update.reason }}</span>
              </div>
            </div>
          </div>

          <div class="merge-actions">
            <button @click="executeMerge" :disabled="isMerging" class="btn-execute">
              {{ isMerging ? '执行中...' : '✅ 执行选中操作' }}
            </button>
            <button @click="cancelMerge" class="btn-cancel">❌ 取消</button>
          </div>
        </div>
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

.divider {
  height: 1px;
  background-color: var(--border-color);
  margin: 2rem 0;
}

.description {
  color: var(--text-secondary);
  font-size: 0.9rem;
  line-height: 1.6;
  margin-bottom: 1rem;
}

.btn-merge {
  width: 100%;
  padding: 1rem;
  background-color: #10b981;
  color: white;
  border: none;
  border-radius: 0.25rem;
  cursor: pointer;
  font-size: 1rem;
  font-weight: bold;
  transition: background-color 0.2s;
}

.btn-merge:hover:not(:disabled) {
  background-color: #059669;
}

.btn-merge:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 合并建议样式 */
.merge-suggestions {
  border: 1px solid var(--border-color);
  border-radius: 0.25rem;
  padding: 1rem;
  background-color: var(--background-secondary);
}

.suggestions-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.suggestions-header h4 {
  margin: 0;
  color: var(--text-primary);
  font-size: 0.95rem;
}

.merge-item,
.update-item {
  border: 1px solid var(--border-color);
  border-radius: 0.25rem;
  padding: 0.75rem;
  margin-bottom: 0.75rem;
  background-color: var(--background-primary);
  transition: all 0.2s;
}

.merge-item:hover,
.update-item:hover {
  border-color: var(--primary);
}

.merge-item.selected,
.update-item.selected {
  background-color: var(--background-tertiary);
  border-color: var(--primary);
}

.merge-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.merge-header input[type="checkbox"] {
  width: 1rem;
  height: 1rem;
  cursor: pointer;
}

.merge-title {
  font-weight: bold;
  color: var(--text-primary);
  font-size: 0.9rem;
}

.merge-content {
  padding-left: 1.5rem;
}

.entity-keep,
.entity-merge,
.merge-reason,
.change-item {
  margin-bottom: 0.5rem;
  font-size: 0.85rem;
  line-height: 1.6;
}

.label {
  color: var(--text-secondary);
  margin-right: 0.5rem;
  font-weight: 500;
}

.entity-name {
  color: var(--text-primary);
  font-weight: 500;
}

.entity-type {
  color: var(--text-tertiary);
  font-size: 0.8rem;
  margin-left: 0.5rem;
  padding: 0.125rem 0.5rem;
  background-color: var(--background-tertiary);
  border-radius: 0.25rem;
}

.old-value {
  color: var(--text-tertiary);
  text-decoration: line-through;
}

.arrow {
  color: var(--primary);
  margin: 0 0.5rem;
}

.new-value {
  color: var(--primary);
  font-weight: 500;
}

.merge-actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color);
}

.btn-execute {
  flex: 1;
  padding: 0.75rem;
  background-color: var(--primary);
  color: white;
  border: none;
  border-radius: 0.25rem;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: bold;
  transition: background-color 0.2s;
}

.btn-execute:hover:not(:disabled) {
  background-color: var(--primary-dark);
}

.btn-execute:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-cancel {
  padding: 0.75rem 1.5rem;
  background-color: var(--background-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  border-radius: 0.25rem;
  cursor: pointer;
  font-size: 0.9rem;
}

.btn-cancel:hover {
  background-color: var(--background-secondary);
}
</style>
