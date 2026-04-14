/**
 * 实体合并组合式函数
 * 处理AI实体合并和更新的核心逻辑
 */
import { ref, computed } from 'vue'
import { entitydb } from '@shared/db'
import { openaiFetch, type OpenAiParams } from '@core/api'
import type { Entity } from '@shared/types'
import { uid } from '@shared/utils'
import { $tips } from '@app/plugins'
import { event_emit } from '@shared/utils/event-bus'
import { useEntityStore } from '../stores/entities.store'
import { useEntityTypesStore } from '../stores/entity-types.store'
import { useSelectedBookStore } from '../stores/selected-book.store'
import { ENTITY_MERGE_PROMPTS } from '../constants/ai-prompts'

/** 合并组 */
export interface MergeGroup {
  id: string
  keep: Entity  // 保留的主实体
  merge: Entity[]  // 要合并的实体
  reason: string  // 合并原因
  selected: boolean  // 是否选中执行
}

/** 更新建议 */
export interface UpdateSuggestion {
  id: string
  entity: Entity  // 原实体
  updates: Partial<Entity>  // 更新内容
  reason: string  // 更新原因
  selected: boolean  // 是否选中执行
}

export function useEntityMerge(
  selectedModel: any,
  allMergePromptOptions: any
) {
  const entityStore = useEntityStore()
  const entityTypesStore = useEntityTypesStore()
  const selectedBookStore = useSelectedBookStore()

  // 状态
  const selectedMergePrompt = ref<string>('')
  const isMerging = ref(false)
  const mergeProgress = ref('')
  const mergeSuggestions = ref<MergeGroup[]>([])
  const updateSuggestions = ref<UpdateSuggestion[]>([])

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

      // 使用选中的合并提示词，如果没有则使用默认的第一个内置提示词
      const mergePromptId = selectedMergePrompt.value || ENTITY_MERGE_PROMPTS[0].id
      const mergePrompt = allMergePromptOptions.value.find((p: any) => p.id === mergePromptId)
      const systemPrompt = mergePrompt ? mergePrompt.prompt : ENTITY_MERGE_PROMPTS[0].prompt

      const userContent = `请分析以下实体，返回JSON格式的合并和更新建议：\n${JSON.stringify(compressedEntities)}`

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
        // 检查标题是否发生变化
        const titleChanged = updateItem.updates.title && updateItem.updates.title !== updateItem.entity.title
        const entityId = updateItem.entity.id
        const newTitle = updateItem.updates.title

        await entitydb.updateEntity({
          ...updateItem.entity,
          ...updateItem.updates,
          modifiedTime: Date.now()
        })

        // 如果标题发生变化，触发事件
        if (titleChanged) {
          event_emit('entity-title-updated', entityId, newTitle)
        }

        updatedCount++
      }

      // 3. 刷新实体列表和类型统计
      entityStore.load(selectedBookStore.v!.id)
      entityTypesStore.init(selectedBookStore.v!.id)

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

  return {
    // 状态
    selectedMergePrompt,
    isMerging,
    mergeProgress,
    mergeSuggestions,
    updateSuggestions,
    // 方法
    startMergeAnalysis,
    toggleMergeSelection,
    toggleUpdateSelection,
    toggleAllMerges,
    toggleAllUpdates,
    executeMerge,
    cancelMerge
  }
}
