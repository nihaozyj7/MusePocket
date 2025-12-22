<script setup lang="ts">
import { ref } from 'vue'
import { importExportdb } from '@shared/db'
import type { ArticleExportData } from '@shared/types'
import { $tips } from '@app/plugins'

const props = defineProps<{
  /** 当前书籍ID */
  bookId: string
}>()

const emit = defineEmits<{
  importSuccess: []
}>()

/** 文件输入框ref */
const fileInputRef = ref<HTMLInputElement | null>(null)
/** 是否正在导入 */
const isImporting = ref(false)

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

      // 判断是单篇文章还是多篇文章
      let articleDataList: ArticleExportData[] = []

      if (Array.isArray(data)) {
        // 多篇文章
        articleDataList = data
      } else if (data.article && data.body) {
        // 单篇文章
        articleDataList = [data as ArticleExportData]
      } else {
        throw new Error('JSON文件格式不正确')
      }

      // 导入文章到当前书籍
      const result = await importExportdb.importArticles(props.bookId, articleDataList, { generateNewIds: true })

      if (result.success) {
        $tips.success(result.message || `成功导入 ${articleDataList.length} 篇文章`)
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
<div class="article-import-export">
  <div class="content">
    <div class="section">
      <h3>📥 导入文章</h3>
      <p class="description">
        从 JSON 文件导入文章到当前书籍（支持单篇或多篇）<br />
        <span class="warning">⚠️ 导入会生成新的ID，文章将归属于当前书籍</span>
      </p>
      <input ref="fileInputRef" type="file" accept=".json" @change="handleFileChange" style="display: none;" />
      <button @click="triggerFileInput" :disabled="isImporting" class="btn-primary">
        {{ isImporting ? '导入中...' : '📁 选择JSON文件' }}
      </button>
    </div>

    <div class="info-box">
      <h4>💡 使用说明</h4>
      <ul>
        <li>支持导入单篇或多篇文章（包含文章内容）</li>
        <li>导入时会自动生成新的ID，不会与现有数据冲突</li>
        <li>导入的文章会自动归属于当前书籍</li>
        <li>文件必须是通过本系统导出的JSON格式</li>
      </ul>
    </div>
  </div>
</div>
</template>

<style scoped>
.article-import-export {
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
