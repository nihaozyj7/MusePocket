<script setup lang="ts">
import { ref } from 'vue'
import { Popup } from '@shared/components'
import type { ProofreadError } from '@domains/editor/services/proofreading.service'

interface ProofreadIssue {
  lineNumber: number
  error: ProofreadError & { lineText?: string }
}

const popupRef = ref<InstanceType<typeof Popup>>()
const issues = ref<ProofreadIssue[]>([])

function show(errorList: ProofreadIssue[]) {
  issues.value = errorList
  popupRef.value?.show()
}

function close() {
  popupRef.value?.close()
}

/** 应用单个修改 */
function applyFix(issue: ProofreadIssue) {
  emit('apply-fix', issue)
  // 从列表中移除
  issues.value = issues.value.filter(i => i !== issue)
}

/** 忽略错误 */
function ignoreFix(issue: ProofreadIssue) {
  issues.value = issues.value.filter(i => i !== issue)
}

/** 全部修改 */
function applyAll() {
  emit('apply-all', issues.value)
  issues.value = []
  close()
}

const emit = defineEmits<{
  'apply-fix': [issue: ProofreadIssue]
  'apply-all': [issues: ProofreadIssue[]]
}>()

defineExpose({
  show,
  close
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
<Popup ref="popupRef" title="📝 纠错结果" :width="600">
  <div class="proofread-result">
    <!-- 空状态 -->
    <div v-if="issues.length === 0" class="empty-state">
      <div class="empty-icon">✅</div>
      <p>未发现错误</p>
    </div>

    <!-- 错误列表 -->
    <div v-else class="issues-container">
      <div class="issues-header">
        <span class="total-count">共发现 {{ issues.length }} 个错误</span>
        <button class="btn-apply-all" @click="applyAll" v-if="issues.length > 0">
          全部修改
        </button>
      </div>

      <div class="issues-list">
        <div v-for="(issue, index) in issues" :key="index" class="issue-item">
          <div class="issue-header">
            <span class="line-number">第 {{ issue.lineNumber }} 行</span>
            <span class="position">位置: {{ issue.error.position }}</span>
          </div>

          <div class="issue-content">
            <!-- 完整句子展示 -->
            <div class="sentence-display" v-if="issue.error.lineText">
              <span class="label">原句:</span>
              <div class="sentence-text">
                <template v-for="(part, idx) in highlightError(issue.error.lineText, issue.error.original)" :key="idx">
                  <span v-if="part.isError" class="error-highlight">{{ part.text }}</span>
                  <span v-else>{{ part.text }}</span>
                </template>
              </div>
            </div>

            <!-- 错误与建议 -->
            <div class="error-text">
              <span class="label">错误:</span>
              <span class="text original">{{ issue.error.original }}</span>
            </div>
            <div class="correct-text">
              <span class="label">建议:</span>
              <span class="text suggestion">{{ issue.error.corrected }}</span>
            </div>
          </div>

          <div class="issue-actions">
            <button class="btn-apply" @click="applyFix(issue)">
              ✓ 修改
            </button>
            <button class="btn-ignore" @click="ignoreFix(issue)">
              × 忽略
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</Popup>
</template>

<style scoped>
.proofread-result {
  max-height: 500px;
  overflow-y: auto;
}
.issues-container {
  display: flex;
  flex-direction: column;
  gap: .5rem;
}
.total-count {
  font-weight: 500;
  color: var(--text-primary);
}
.btn-apply-all {
  padding: 0.375rem 0.75rem;
  background-color: var(--primary);
  color: white;
  border: none;
  border-radius: 0.25rem;
  cursor: pointer;
  font-size: 0.875rem;
  transition: opacity 0.2s;
}
.btn-apply-all:hover {
  opacity: 0.9;
}
.issues-list {
  display: flex;
  flex-direction: column;
  gap: .5rem;
}
.issue-item {
  padding: .5rem;
  background-color: var(--background-secondary);
  border: 1px solid var(--border-color);
  border-left: 3px solid var(--danger);
  border-radius: 0.25rem;
  transition: box-shadow 0.2s;
}
.issue-item:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
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
  font-weight: 500;
  color: var(--primary);
  font-size: 0.875rem;
}
.position {
  font-size: 0.75rem;
  color: var(--text-tertiary);
}
.issue-content {
  display: flex;
  flex-direction: column;
  gap: .5rem;
  margin-bottom: 0.75rem;
}
.sentence-display {
  display: flex;
  flex-direction: column;
  gap: .5rem;
}
.sentence-text {
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
.error-text,
.correct-text {
  display: flex;
  align-items: center;
  gap: .5rem;
}
.label {
  font-size: 0.875rem;
  color: var(--text-secondary);
  min-width: 3rem;
}
.text {
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.875rem;
}
.text.original {
  background-color: rgba(255, 77, 79, 0.1);
  color: var(--danger);
  text-decoration: line-through;
}
.text.suggestion {
  background-color: rgba(82, 196, 26, 0.1);
  color: var(--success);
  font-weight: 500;
}
.issue-actions {
  display: flex;
  gap: .5rem;
  justify-content: flex-end;
}
.btn-apply,
.btn-ignore {
  padding: 0.375rem 0.75rem;
  border: none;
  border-radius: 0.25rem;
  cursor: pointer;
  font-size: 0.875rem;
  transition: opacity 0.2s;
}
.btn-apply {
  background-color: var(--success);
  color: white;
}
.btn-ignore {
  background-color: var(--background-tertiary);
  color: var(--text-secondary);
}
.btn-apply:hover,
.btn-ignore:hover {
  opacity: 0.9;
}
</style>
