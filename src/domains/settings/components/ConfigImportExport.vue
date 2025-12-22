<script setup lang="ts">
import { ref } from 'vue'
import { importExportdb } from '@shared/db'
import type { ConfigExportData } from '@shared/types'
import { $tips } from '@app/plugins'
import { useModelsStore } from '@domains/settings/stores/models.store'
import { usePromptsStore } from '@domains/settings/stores/prompts.store'
import { useTextSnippetsStore } from '@domains/editor/stores/text-snippets.store'

const emit = defineEmits<{
  importSuccess: []
}>()

/** 文件输入框ref */
const fileInputRef = ref<HTMLInputElement | null>(null)
/** 是否正在导入 */
const isImporting = ref(false)
/** 是否正在导出 */
const isExporting = ref(false)

/** 导出配置 */
function exportConfigs() {
  try {
    isExporting.value = true

    const data = importExportdb.exportConfigs()

    if (!data.models?.length && !data.prompts?.length && !data.textSnippets?.length) {
      $tips.error('没有可导出的配置数据')
      isExporting.value = false
      return
    }

    const jsonStr = JSON.stringify(data, null, 2)
    const blob = new Blob([jsonStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `configs_${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)

    const count = (data.models?.length || 0) + (data.prompts?.length || 0) + (data.textSnippets?.length || 0)
    $tips.success(`已导出 ${count} 项配置`)
    isExporting.value = false
  } catch (err: any) {
    $tips.error(`导出失败: ${err.message}`)
    isExporting.value = false
  }
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
      const data = JSON.parse(content) as ConfigExportData

      // 验证数据格式
      if (!data.models && !data.prompts && !data.textSnippets) {
        throw new Error('JSON文件格式不正确')
      }

      // 导入配置（合并模式）
      const result = importExportdb.importConfigs(data, { merge: true })

      if (result.success) {
        // 重新加载各个 Store 的数据以立即生效
        reloadStores()

        const count = (data.models?.length || 0) + (data.prompts?.length || 0) + (data.textSnippets?.length || 0)
        $tips.success(`成功导入 ${count} 项配置`)
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

/** 重新加载所有配置 Store */
function reloadStores() {
  const modelsStore = useModelsStore()
  const promptsStore = usePromptsStore()
  const textSnippetsStore = useTextSnippetsStore()

  // 从 localStorage 重新加载数据
  const modelsData = localStorage.getItem('modelsStore')
  const promptsData = localStorage.getItem('promptsStore')
  const textSnippetsData = localStorage.getItem('textSnippetsStore')

  if (modelsData) {
    const parsed = JSON.parse(modelsData)
    modelsStore.$patch({ v: parsed.v || [] })
  }

  if (promptsData) {
    const parsed = JSON.parse(promptsData)
    promptsStore.$patch({ v: parsed.v || [] })
  }

  if (textSnippetsData) {
    const parsed = JSON.parse(textSnippetsData)
    textSnippetsStore.$patch({ v: parsed.v || [] })
  }
}
</script>

<template>
<div class="config-import-export">
  <div class="content">
    <div class="section">
      <h3>📤 导出配置</h3>
      <p class="description">
        导出AI接口、提示词和文本预设配置
      </p>
      <button @click="exportConfigs" :disabled="isExporting" class="btn-primary wfull">
        {{ isExporting ? '导出中...' : '💾 导出配置' }}
      </button>
    </div>

    <div class="divider"></div>

    <div class="section">
      <h3>📥 导入配置</h3>
      <p class="description">
        从 JSON 文件导入配置<br />
        <span class="warning">⚠️ 注意：导入会与现有配置合并，不会覆盖</span>
      </p>
      <input ref="fileInputRef" type="file" accept=".json" @change="handleFileChange" style="display: none;" />
      <button @click="triggerFileInput" :disabled="isImporting" class="btn-primary">
        {{ isImporting ? '导入中...' : '📁 选择JSON文件' }}
      </button>
    </div>

    <div class="info-box">
      <h4>💡 使用说明</h4>
      <ul>
        <li>配置包括：AI模型接口、提示词、文本预设</li>
        <li>导出的配置可以在不同设备间共享</li>
        <li>导入时会自动去重，不会产生重复配置</li>
        <li>导入后会立即生效，无需刷新</li>
      </ul>
    </div>
  </div>
</div>
</template>

<style scoped>
.config-import-export {
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
