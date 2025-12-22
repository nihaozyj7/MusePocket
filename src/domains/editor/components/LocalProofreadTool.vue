<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useSettingStore } from '@domains/settings/stores/settings.store'
import { useSelectedArticleStore } from '@domains/editor/stores/selected-article.store'
import { proofreadingService, type ProofreadError } from '@domains/editor/services/proofreading.service'
import { $tips } from '@app/plugins'
import type { LocalProofreadIssue } from '@/shared/types'

const settingStore = useSettingStore()
const selectedArticleStore = useSelectedArticleStore()

const props = defineProps<{
  getEditorBody?: () => string | undefined
}>()

const emit = defineEmits<{
  (e: 'apply-fix', issue: LocalProofreadIssue): void
  (e: 'apply-all', issues: LocalProofreadIssue[]): void
}>()

/** 纠错问题列表 */
const issues = ref<LocalProofreadIssue[]>([])
/** 是否正在纠错 */
const isProofreading = ref(false)
/** 纠错状态 */
const proofreadState = ref('未启动')
/** 是否启用纠错服务 */
const isServiceEnabled = ref(false)

/** 是否全选 */
const isAllSelected = computed({
  get: () => issues.value.length > 0 && issues.value.every(i => i.selected),
  set: (value: boolean) => {
    issues.value.forEach(i => i.selected = value)
  }
})

/** 检查服务是否可用 */
async function checkServiceAvailability() {
  const apiUrl = settingStore.proofreadingSettings.apiUrl
  if (!apiUrl || !apiUrl.trim()) {
    isServiceEnabled.value = false
    proofreadState.value = '未配置接口地址'
    return
  }

  proofreadingService.setBaseUrl(apiUrl)
  proofreadState.value = '检查服务...'

  const health = await proofreadingService.checkHealth()
  if (health.healthy) {
    isServiceEnabled.value = true
    proofreadState.value = '✅ 服务就绪'
  } else {
    isServiceEnabled.value = false
    proofreadState.value = '❌ 服务未就绪'
  }
}

/**
 * 将文本按段落分割
 * 优先按段落分割，每个段落作为一个整体提交
 */
function splitByParagraphs(text: string): string[] {
  const result: string[] = []

  // 按段落分割（两个换行符分隔，或者单个换行符但内容连续）
  const paragraphs = text.split(/\n\s*\n/)

  paragraphs.forEach(paragraph => {
    const trimmedParagraph = paragraph.trim()
    if (trimmedParagraph) {
      result.push(trimmedParagraph)
    }
  })

  return result
}


/**
 * 根据行号合并同一段落的所有错误
 * 如果同一段落有多个错误，说明整个段落有问题，应该合并成一个段落级错误
 */
function mergeSameParagraphErrors(issues: LocalProofreadIssue[]): LocalProofreadIssue[] {
  // 按行号分组（现在代表段落索引）
  const grouped = new Map<number, LocalProofreadIssue[]>()

  issues.forEach(issue => {
    const lineNumber = issue.lineNumber
    if (!grouped.has(lineNumber)) {
      grouped.set(lineNumber, [])
    }
    grouped.get(lineNumber)!.push(issue)
  })

  const mergedIssues: LocalProofreadIssue[] = []

  // 处理每一个段落
  grouped.forEach((paragraphIssues, lineNumber) => {
    if (paragraphIssues.length === 1) {
      // 只有一个错误，直接保留
      mergedIssues.push(paragraphIssues[0])
    } else {
      // 多个错误，合并为段落级错误
      const paragraph = paragraphIssues[0].error.lineText || ''
      let correctedParagraph = paragraph

      // 按位置排序，从后往前替换以避免位置偏移
      const sortedIssues = [...paragraphIssues].sort((a, b) => b.error.position - a.error.position)

      sortedIssues.forEach(issue => {
        correctedParagraph = correctedParagraph.replace(issue.error.original, issue.error.corrected)
      })

      // 创建合并后的错误
      mergedIssues.push({
        id: `merged-${lineNumber}`,
        lineNumber: lineNumber,
        error: {
          original: paragraph,
          corrected: correctedParagraph,
          position: 0,
          lineText: paragraph
        },
        selected: false
      })
    }
  })

  return mergedIssues
}

/** 开始纠错 */
async function startProofread() {
  if (!isServiceEnabled.value) {
    $tips.error('纠错服务未就绪')
    return
  }

  // 从editor获取内容
  const text = props.getEditorBody?.()?.trim()
  if (!text) {
    $tips.error('没有可纠错的内容')
    return
  }

  isProofreading.value = true
  proofreadState.value = '⏳ 检查中...'
  issues.value = []

  try {
    // 将整个文本按段落分割
    const paragraphs = splitByParagraphs(text)
    const totalParagraphs = paragraphs.length

    if (totalParagraphs === 0) {
      proofreadState.value = '✅ 无内容需要检查'
      $tips.success('没有可检查的段落')
      isProofreading.value = false
      return
    }

    // 使用批量纠错接口
    proofreadState.value = `⏳ 准备提交 ${totalParagraphs} 个段落...`
    const batchResult = await proofreadingService.correctBatch(paragraphs)

    if (!batchResult) {
      throw new Error('批量纠错返回结果为空')
    }

    const allIssues: LocalProofreadIssue[] = []

    // 处理批量结果
    for (let i = 0; i < batchResult.results.length; i++) {
      const result = batchResult.results[i]
      const paragraphIndex = result.index
      const paragraphText = paragraphs[paragraphIndex]

      proofreadState.value = `⏳ 处理中... (${i + 1}/${totalParagraphs})`

      if (result.has_error && result.errors.length > 0) {
        result.errors.forEach(error => {
          allIssues.push({
            id: `${paragraphIndex}-${error.position}`,
            lineNumber: paragraphIndex + 1, // 使用段落索引作为"行号"
            error: {
              ...error,
              lineText: paragraphText
            },
            selected: false
          })
        })
      }
    }

    // 合并同一段落的所有错误
    issues.value = mergeSameParagraphErrors(allIssues)

    if (allIssues.length > 0) {
      proofreadState.value = `⚠️ 发现 ${allIssues.length} 个错误`
      $tips.success(`检查完成，发现 ${allIssues.length} 个错误`)
    } else {
      proofreadState.value = '✅ 无错误'
      $tips.success('检查完成，未发现错误')
    }
  } catch (error) {
    console.error('纠错失败:', error)
    proofreadState.value = '❌ 纠错失败'
    $tips.error('纠错失败，请检查服务是否正常')
  } finally {
    isProofreading.value = false
  }
}

/** 应用单个修正 */
function handleApplyFix(issue: LocalProofreadIssue) {
  emit('apply-fix', issue)
  // 从列表中移除
  issues.value = issues.value.filter(i => i.id !== issue.id)

  if (issues.value.length > 0) {
    proofreadState.value = `⚠️ 发现 ${issues.value.length} 个错误`
  } else {
    proofreadState.value = '✅ 无错误'
  }
}

/** 应用所有选中的修正 */
function applyAllSelected() {
  const selectedIssues = issues.value.filter(i => i.selected)
  if (selectedIssues.length === 0) {
    $tips.error('请先选择要修改的错误')
    return
  }

  emit('apply-all', selectedIssues)

  // 从列表中移除已应用的
  issues.value = issues.value.filter(i => !i.selected)

  if (issues.value.length > 0) {
    proofreadState.value = `⚠️ 发现 ${issues.value.length} 个错误`
  } else {
    proofreadState.value = '✅ 无错误'
  }
}

/** 忽略单个问题 */
function ignoreIssue(issue: LocalProofreadIssue) {
  issues.value = issues.value.filter(i => i.id !== issue.id)

  if (issues.value.length > 0) {
    proofreadState.value = `⚠️ 发现 ${issues.value.length} 个错误`
  } else {
    proofreadState.value = '✅ 无错误'
  }
}

/** 清空所有问题 */
function clearAllIssues() {
  issues.value = []
  proofreadState.value = isServiceEnabled.value ? '✅ 服务就绪' : '未配置接口地址'
}

// 组件挂载时检查服务
onMounted(() => {
  checkServiceAvailability()
})

// 监听接口地址变化
watch(() => settingStore.proofreadingSettings.apiUrl, () => {
  checkServiceAvailability()
  clearAllIssues()
})

// 监听文章变化
watch(() => selectedArticleStore.v?.id, () => {
  clearAllIssues()
})

/** 高亮错误部分 */
function highlightError(fullText: string, errorText: string): Array<{ text: string, isError: boolean }> {
  const index = fullText.indexOf(errorText)
  if (index === -1) {
    return [{ text: fullText, isError: false }]
  }

  const parts = []
  if (index > 0) {
    parts.push({ text: fullText.substring(0, index), isError: false })
  }
  parts.push({ text: errorText, isError: true })
  if (index + errorText.length < fullText.length) {
    parts.push({ text: fullText.substring(index + errorText.length), isError: false })
  }

  return parts
}
</script>

<template>
<div class="local-proofread-tool">
  <!-- 操作按钮 -->
  <div class="action-buttons">
    <button @click="startProofread" :disabled="!isServiceEnabled || isProofreading" class="btn-primary wfull">
      {{ isProofreading ? '⏳ 检查中...' : '🔍 开始纠错' }}
    </button>

    <button v-if="issues.length > 0" @click="clearAllIssues" class="btn-secondary">
      🗑️ 清空结果
    </button>
  </div>

  <!-- 提示信息 -->
  <div v-if="!isServiceEnabled" class="hint-message">
    <p>⚠️ 纠错服务未配置或不可用</p>
    <p class="hint-desc">
      请前往【设置 → 基础设置 → 纠错设置】配置纠错接口地址
    </p>
  </div>

  <!-- 问题列表 -->
  <div v-if="issues.length > 0" class="issues-section">
    <div class="issues-header">
      <div class="stats">
        <span class="total-count">共 {{ issues.length }} 个错误</span>
      </div>
      <div class="batch-actions">
        <label class="checkbox-label">
          <input type="checkbox" v-model="isAllSelected" />
          全选
        </label>
        <button class="btn-small" :disabled="!issues.some(i => i.selected)" @click="applyAllSelected">
          批量修改
        </button>
      </div>
    </div>

    <div class="issues-list">
      <div v-for="issue in issues" :key="issue.id" class="issue-item">
        <div class="issue-header">
          <label class="checkbox-label">
            <input type="checkbox" v-model="issue.selected" />
            <span class="line-number">第 {{ issue.lineNumber }} 段</span>
          </label>
          <span class="position">位置: {{ issue.error.position }}</span>
        </div>

        <div class="issue-content">
          <!-- 完整段落展示 -->
          <div class="paragraph-display" v-if="issue.error.lineText">
            <span class="label">原文段落:</span>
            <div class="paragraph-text">
              <template v-for="(part, idx) in highlightError(issue.error.lineText, issue.error.original)" :key="idx">
                <span v-if="part.isError" class="error-highlight">{{ part.text }}</span>
                <span v-else>{{ part.text }}</span>
              </template>
            </div>
          </div>

          <!-- 错误与建议 -->
          <div class="error-info">
            <div class="error-text">
              <span class="label">错误:</span>
              <span class="text original">{{ issue.error.original }}</span>
            </div>
            <div class="arrow">→</div>
            <div class="correct-text">
              <span class="label">建议:</span>
              <span class="text suggestion">{{ issue.error.corrected }}</span>
            </div>
          </div>
        </div>

        <div class="issue-actions">
          <button class="btn-apply" @click="handleApplyFix(issue)">
            ✓ 应用
          </button>
          <button class="btn-ignore" @click="ignoreIssue(issue)">
            × 忽略
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- 空状态 -->
  <div v-else-if="!isProofreading && isServiceEnabled" class="empty-state">
    <div class="empty-icon">📝</div>
    <p>点击"开始纠错"检查当前文章</p>
  </div>
</div>
</template>

<style scoped>
.local-proofread-tool {
  display: flex;
  flex-direction: column;
  gap: .5rem;
  height: 100%;
}
.status-text {
  display: flex;
  align-items: center;
  gap: .5rem;
  font-size: 0.9rem;
}
.status-indicator {
  font-weight: 600;
  padding: 0.25rem 0.75rem;
  border-radius: 0.25rem;
}
.status-indicator.enabled {
  color: #28a745;
  background-color: rgba(40, 167, 69, 0.1);
}
.status-indicator.disabled {
  color: #dc3545;
  background-color: rgba(220, 53, 69, 0.1);
}
.btn-refresh {
  padding: 0.4rem 0.8rem;
  font-size: 0.85rem;
  background-color: var(--primary);
  color: white;
  border: none;
  border-radius: 0.25rem;
  cursor: pointer;
}
.btn-refresh:hover {
  opacity: 0.9;
}
.action-buttons {
  padding: 0 .5rem;
  display: flex;
  gap: .5rem;
}
.hint-message {
  padding: 1.5rem;
  background-color: rgba(255, 193, 7, 0.1);
  border: 1px solid rgba(255, 193, 7, 0.3);
  border-radius: 0.5rem;
  text-align: center;
}
.hint-message p {
  margin: 0.5rem 0;
  color: var(--text-primary);
}
.hint-desc {
  font-size: 0.85rem;
  color: var(--text-secondary);
}
.issues-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.stats {
  display: flex;
  gap: .5rem;
}
.total-count {
  font-weight: 600;
  color: var(--text-primary);
}
.batch-actions {
  display: flex;
  align-items: center;
  gap: .5rem;
}
.issues-list {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
}
.issue-item {
  background-color: var(--background-secondary);
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
  padding: .5rem;
  margin-bottom: 0.75rem;
}
.issue-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--border-color);
}
.line-number {
  font-weight: 600;
  color: var(--primary);
}
.position {
  font-size: 0.85rem;
  color: var(--text-secondary);
}
.issue-content {
  margin-bottom: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: .5rem;
}
.paragraph-display {
  display: flex;
  flex-direction: column;
  gap: .5rem;
}
.paragraph-text {
  padding: 0.5rem;
  background-color: var(--background-tertiary);
  border-radius: 0.25rem;
  border-left: 3px solid var(--primary);
  line-height: 1.6;
  font-size: 0.95rem;
}
.error-highlight {
  color: #dc3545;
  font-weight: 600;
  background-color: rgba(220, 53, 69, 0.15);
  padding: 0.1rem 0.2rem;
  border-radius: 0.2rem;
  text-decoration: underline wavy #dc3545;
  text-underline-offset: 2px;
}
.error-info {
  display: flex;
  align-items: center;
  gap: .5rem;
  flex-wrap: wrap;
}
.error-text,
.correct-text {
  display: flex;
  align-items: center;
  gap: .5rem;
}
.label {
  font-size: 0.85rem;
  color: var(--text-secondary);
}
.text {
  font-weight: 500;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
}
.text.original {
  color: #dc3545;
  background-color: rgba(220, 53, 69, 0.1);
  text-decoration: line-through;
}
.text.suggestion {
  color: #28a745;
  background-color: rgba(40, 167, 69, 0.1);
}
.arrow {
  color: var(--text-secondary);
  font-weight: bold;
}
.issue-actions {
  display: flex;
  gap: .5rem;
  justify-content: flex-end;
}
.btn-apply,
.btn-ignore {
  font-size: 0.8rem;
  border: none;
  border-radius: 0.25rem;
  cursor: pointer;
  transition: opacity 0.2s;
}
.btn-apply {
  background-color: #28a745;
  color: white;
}
.btn-ignore {
  background-color: var(--background-tertiary);
  color: var(--text-secondary);
}
.btn-ignore:hover {
  background-color: var(--background-secondary);
}
</style>
