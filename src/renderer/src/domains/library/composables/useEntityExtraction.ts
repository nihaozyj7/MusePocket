/**
 * 实体提取组合式函数
 * 处理AI实体提取的核心逻辑
 */
import { ref, computed } from 'vue'
import type { Ref } from 'vue'
import { articledb, entitydb } from '@shared/db'
import { openaiFetch, type OpenAiParams } from '@core/api'
import type { Article, Entity } from '@shared/types'
import { uid } from '@shared/utils'
import { $tips } from '@app/plugins'
import { useEntityStore } from '../stores/entities.store'
import { useEntityTypesStore } from '../stores/entity-types.store'
import { useSelectedBookStore } from '../stores/selected-book.store'

export function useEntityExtraction() {
  const entityStore = useEntityStore()
  const entityTypesStore = useEntityTypesStore()
  const selectedBookStore = useSelectedBookStore()

  // 状态
  const selectedModel = ref<OpenAiParams | null>(null)
  const selectedPrompt = ref<string>('')
  const includeExistingEntities = ref(false)
  const selectedArticles = ref<Article[]>([])
  const allArticles = ref<Article[]>([])
  const isExtracting = ref(false)
  const extractResult = ref('')
  const progress = ref('')

  // 计算属性
  const canExtract = computed(() => {
    return selectedModel.value && selectedPrompt.value && selectedArticles.value.length > 0
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
      const userContent = `请从以下文章中提取实体信息，返回JSON格式的数组。每个实体包含：title(名称), type(类型), description(描述), attrs(自定义属性数组，每个属性包含title和value)。

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

      // 6. 刷新实体列表和类型统计
      entityStore.load(selectedBookStore.v!.id)
      entityTypesStore.init(selectedBookStore.v!.id)

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

  return {
    // 状态
    selectedModel,
    selectedPrompt,
    includeExistingEntities,
    selectedArticles,
    allArticles,
    isExtracting,
    extractResult,
    progress,
    // 计算属性
    canExtract,
    // 方法
    loadArticles,
    toggleArticle,
    toggleAllArticles,
    isArticleSelected,
    startExtraction,
    clearResult
  }
}
