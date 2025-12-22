<script setup lang="ts">
import { ref } from 'vue'
import { useEntityStore } from '@domains/library/stores/entities.store'
import { useEntityTypesStore } from '@domains/library/stores/entity-types.store'
import { useSelectedBookStore } from '@domains/library/stores/selected-book.store'
import { entitydb } from '@shared/db'
import type { Entity } from '@shared/types'
import { uid } from '@shared/utils'
import { $tips } from '@app/plugins'

const selectedBookStore = useSelectedBookStore()
const entityStore = useEntityStore()
const entityTypesStore = useEntityTypesStore()

/** 文件输入框ref */
const fileInputRef = ref<HTMLInputElement | null>(null)
/** 是否正在导入 */
const isImporting = ref(false)
/** 是否正在导出 */
const isExporting = ref(false)

/** 导出实体为JSON */
function exportEntities() {
  if (!selectedBookStore.v?.id) {
    $tips.error('请先选择一本书籍')
    return
  }

  isExporting.value = true

  entitydb.getBookEntities(selectedBookStore.v.id).then(entities => {
    if (entities.length === 0) {
      $tips.error('当前书籍没有实体可导出')
      isExporting.value = false
      return
    }

    // 移除bookId,仅导出必要字段
    const exportData = entities.map(entity => ({
      id: entity.id,
      title: entity.title,
      type: entity.type,
      description: entity.description,
      imgID: entity.imgID,
      attrs: entity.attrs,
      mappings: entity.mappings, // 导出映射信息
      createdTime: entity.createdTime,
      modifiedTime: entity.modifiedTime,
      deletedTime: entity.deletedTime
    }))

    const jsonStr = JSON.stringify(exportData, null, 2)
    const blob = new Blob([jsonStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `entities_${selectedBookStore.v.title}_${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)

    $tips.success(`已导出 ${entities.length} 个实体`)
    isExporting.value = false
  }).catch(err => {
    $tips.error(`导出失败: ${err.message}`)
    isExporting.value = false
  })
}

/** 触发文件选择 */
function triggerFileInput() {
  fileInputRef.value?.click()
}

/** 处理文件选择 */
function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]

  if (!file) return

  if (!file.name.endsWith('.json')) {
    $tips.error('请选择JSON文件')
    return
  }

  isImporting.value = true
  const reader = new FileReader()

  reader.onload = async (e) => {
    try {
      const content = e.target?.result as string
      const entities = JSON.parse(content) as Partial<Entity>[]

      if (!Array.isArray(entities)) {
        throw new Error('JSON文件格式不正确')
      }

      // 验证并转换实体
      const importedEntities: Entity[] = entities.map(entity => {
        if (!entity.title || !entity.type) {
          throw new Error('实体数据缺少必要字段')
        }

        const now = Date.now()
        return {
          id: uid(), // 生成新ID
          bookId: selectedBookStore.v!.id, // 强制使用当前书籍ID
          title: entity.title,
          type: entity.type,
          description: entity.description || '',
          imgID: entity.imgID || '',
          attrs: entity.attrs || [],
          mappings: [], // 导入时清空映射，需要重新扫描生成
          createdTime: now,
          modifiedTime: now,
          deletedTime: 0
        }
      })

      // 批量创建实体
      let successCount = 0
      for (const entity of importedEntities) {
        const result = await entitydb.createEntity(entity)
        if (result.success) {
          successCount++
        }
      }

      // 重新加载实体列表和类型统计
      entityStore.load(selectedBookStore.v!.id)
      entityTypesStore.init(selectedBookStore.v!.id)

      $tips.success(`成功导入 ${successCount}/${importedEntities.length} 个实体`)
      isImporting.value = false
    } catch (err: any) {
      $tips.error(`导入失败: ${err.message}`)
      isImporting.value = false
    }
  }

  reader.onerror = () => {
    $tips.error('文件读取失败')
    isImporting.value = false
  }

  reader.readAsText(file)

  // 清空输入，允许重复选择同一文件
  input.value = ''
}
</script>

<template>
<div class="entity-import-export">
  <div class="content">
    <div class="section">
      <h3>📤 导出实体</h3>
      <p class="description">
        将当前书籍的所有实体导出为JSON文件
      </p>
      <button @click="exportEntities" :disabled="isExporting" class="btn-primary wfull">
        {{ isExporting ? '导出中...' : '💾 导出实体' }}
      </button>
    </div>

    <div class="divider"></div>

    <div class="section">
      <h3>📥 导入实体</h3>
      <p class="description">
        从 JSON 文件导入实体到当前书籍<br />
        <span class="warning">⚠️ 注意：导入的实体将自动归属于当前书籍</span>
      </p>
      <input ref="fileInputRef" type="file" accept=".json" @change="handleFileChange" style="display: none;" />
      <button @click="triggerFileInput" :disabled="isImporting" class="btn-primary">
        {{ isImporting ? '导入中...' : '📁 选择JSON文件' }}
      </button>
    </div>

    <div class="info-box">
      <h4>💡 使用说明</h4>
      <ul>
        <li>导出：将当前书籍的所有实体保存为JSON文件</li>
        <li>导入：从 JSON 文件导入实体，会生成新的ID</li>
        <li>导入时会忽略原文件中的书籍ID，强制归属于当前书籍</li>
        <li>支持在不同书籍之间复制实体</li>
      </ul>
    </div>
  </div>
</div>
</template>

<style scoped>
.entity-import-export {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow-y: auto;
  padding: 1rem;
}
.content {
  max-width: 600px;
  margin: 0 auto;
  width: 100%;
}
.section {
  margin-bottom: 1.25rem;
}
.section h3 {
  color: var(--text-primary);
  margin-bottom: 0.6rem;
  font-size: 0.95rem;
}
</style>
