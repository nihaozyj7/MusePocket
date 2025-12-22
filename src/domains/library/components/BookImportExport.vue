<script setup lang="ts">
import { ref } from 'vue'
import { importExportdb } from '@shared/db'
import type { BookExportData } from '@shared/types'
import { $tips } from '@app/plugins'

/** 文件输入框ref */
const fileInputRef = ref<HTMLInputElement | null>(null)
/** 是否正在导入 */
const isImporting = ref(false)

const emit = defineEmits<{
  importSuccess: []
}>()

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
      const data = JSON.parse(content)

      // 判断是单本书籍还是多本书籍
      let bookDataList: BookExportData[] = []

      if (Array.isArray(data)) {
        // 多本书籍
        bookDataList = data
      } else if (data.book && data.articles && data.articleBodies && data.entities) {
        // 单本书籍
        bookDataList = [data as BookExportData]
      } else {
        throw new Error('JSON文件格式不正确')
      }

      // 导入书籍
      const result = await importExportdb.importBooks(bookDataList, { generateNewIds: true })

      if (result.success) {
        $tips.success(result.message || `成功导入 ${bookDataList.length} 本书籍`)
        emit('importSuccess')
      } else {
        $tips.error(`导入失败: ${result.message}`)
      }

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
<div class="book-import-export">
  <div class="content">
    <div class="section">
      <h3>📥 导入书籍</h3>
      <p class="description">
        从 JSON 文件导入书籍数据（支持单本或多本）<br />
        <span class="warning">⚠️ 导入会生成新的ID，不会覆盖现有书籍</span>
      </p>
      <input ref="fileInputRef" type="file" accept=".json" @change="handleFileChange" style="display: none;" />
      <button @click="triggerFileInput" :disabled="isImporting" class="btn-primary wfull">
        {{ isImporting ? '导入中...' : '📁 选择JSON文件' }}
      </button>
    </div>

    <div class="info-box">
      <h4>💡 使用说明</h4>
      <ul>
        <li>支持导入单本或多本书籍（包含文章、文章内容、实体）</li>
        <li>导入时会自动生成新的ID，不会与现有数据冲突</li>
        <li>文件必须是通过本系统导出的JSON格式</li>
      </ul>
    </div>
  </div>
</div>
</template>

<style scoped>
.book-import-export {
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
