<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useSelectedArticleStore } from '@domains/editor/stores/selected-article.store'
import { useHistoryStore } from '@domains/editor/stores/history.store'
import type { DBHistoryRecord } from '@shared/types'
import { computeVisualDiff, type VisualDiff } from '@domains/editor/services/history.service'
import { Popup } from '@shared/components'

const selectedArticleStore = useSelectedArticleStore()
const historyStore = useHistoryStore()

const emit = defineEmits<{
  restore: [text: string]
  getCurrentText: []
}>()

/** 历史记录列表（从 Pinia Store 读取） */
const histories = computed(() => historyStore.currentHistories)
/** 选中的历史记录 */
const selectedHistory = ref<DBHistoryRecord | null>(null)
/** 当前文章的文本 */
const currentText = ref('')
/** 对比的文本（选中历史记录的文本） */
const comparedText = ref('')
/** 可视化 diff 结果 */
const visualDiffs = ref<VisualDiff[]>([])
/** diff 弹出层引用 */
const diffPopupRef = ref<InstanceType<typeof Popup> | null>(null)
/** 获取当前编辑器文本的回调函数 */
const getCurrentTextCallback = ref<(() => string) | null>(null)

/** 格式化时间 */
function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  // 小于1分钟
  if (diff < 60000) {
    return '刚刚'
  }
  // 小于1小时
  if (diff < 3600000) {
    return `${Math.floor(diff / 60000)}分钟前`
  }
  // 小于1天
  if (diff < 86400000) {
    return `${Math.floor(diff / 3600000)}小时前`
  }
  // 同一年
  if (date.getFullYear() === now.getFullYear()) {
    return `${date.getMonth() + 1}月${date.getDate()}日 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  }
  // 不同年
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
}

/** 重建指定历史版本的文本 */
async function reconstructHistoryText(targetHistory: DBHistoryRecord): Promise<string> {
  // 使用 HistoryStore 的统一重建逻辑
  const targetIndex = histories.value.findIndex(h => h.id === targetHistory.id)
  if (targetIndex === -1) return ''

  // 调用 HistoryStore 的 reconstructTextAtIndex 方法，确保与回退逻辑一致
  const text = await historyStore.reconstructTextAtIndex(
    selectedArticleStore.v?.id || '',
    targetIndex
  )

  return text || ''
}

/** 点击历史记录 */
async function handleHistoryClick(history: DBHistoryRecord) {
  selectedHistory.value = history

  try {
    // 重建历史版本的文本
    comparedText.value = await reconstructHistoryText(history)

    // 获取当前编辑器的实时文本（而不是缓存的 currentText）
    const realCurrentText = getCurrentTextCallback.value ? getCurrentTextCallback.value() : currentText.value

    // 计算回退后的变化：从当前版本回退到历史版本会发生什么变化
    // 第一个参数：当前版本（旧），第二个参数：历史版本（新）
    // 这样显示：当前有但历史没有的是删除（-），当前没有但历史有的是新增（+）
    let diffs = computeVisualDiff(realCurrentText, comparedText.value)

    // 重新排序：删除的行放在前面，添加的行放在后面
    diffs = sortDiffByType(diffs)
    visualDiffs.value = diffs

    // 显示弹出层
    diffPopupRef.value?.show()
  } catch (err) {
    console.error('生成 diff 失败:', err)
  }
}

/** 对 diff 进行排序，使相同行号的删除行在前，添加行在后 */
function sortDiffByType(diffs: VisualDiff[]): VisualDiff[] {
  // 按行号分组
  const grouped = new Map<number, VisualDiff[]>()

  for (const diff of diffs) {
    const lineNum = diff.lineNumber || 0
    if (!grouped.has(lineNum)) {
      grouped.set(lineNum, [])
    }
    grouped.get(lineNum)!.push(diff)
  }

  // 对每组内排序：removed -> added -> unchanged
  const result: VisualDiff[] = []
  const sortedLineNums = Array.from(grouped.keys()).sort((a, b) => a - b)

  for (const lineNum of sortedLineNums) {
    const group = grouped.get(lineNum)!
    // 每组内按类型排序
    const removed = group.filter(d => d.type === 'removed')
    const added = group.filter(d => d.type === 'added')
    const unchanged = group.filter(d => d.type === 'unchanged')
    result.push(...removed, ...added, ...unchanged)
  }

  return result
}

/** 回退到选中的历史版本 */
async function handleRestore() {
  if (!selectedHistory.value) {
    console.error('没有选中的历史')
    return
  }

  try {
    // 使用 historyStore 的 restoreToHistory 方法
    const text = await historyStore.restoreToHistory(selectedHistory.value.id)

    if (text !== null && typeof text === 'string') {
      emit('restore', text)
      diffPopupRef.value?.close()
      selectedHistory.value = null
    } else {
      console.error('回退失败：未能获取有效文本')
    }
  } catch (err) {
    console.error('回退失败:', err)
  }
}

/** 关闭 diff 弹出层 */
function closeDiffPopup() {
  selectedHistory.value = null
}

/** 设置当前文本（由父组件调用） */
function setCurrentText(text: string) {
  currentText.value = text
}

/** 设置获取当前文本的回调函数 */
function setGetCurrentTextCallback(callback: () => string) {
  getCurrentTextCallback.value = callback
}

/** 刷新历史记录 */
async function refresh() {
  await historyStore.refreshHistories()
}

// 监听文章切换，关闭弹窗
watch(() => selectedArticleStore.v?.id, () => {
  selectedHistory.value = null
  diffPopupRef.value?.close()
})

defineExpose({
  setCurrentText,
  setGetCurrentTextCallback,
  refresh
})
</script>

<template>
  <div class="history-sidebar">
    <!-- 历史记录列表 -->
    <div class="history-list">
      <div class="header">
        <h3>📜 历史版本</h3>
        <button class="refresh-btn" @click="refresh">
          🔄
        </button>
      </div>

      <div class="list-container scroll-container">
        <div v-if="histories.length === 0" class="empty">
          <p>暂无历史记录</p>
        </div>

        <div v-for="history in histories" :key="history.id" class="history-item" :class="{
          'selected': selectedHistory?.id === history.id,
          'snapshot': history.isSnapshot
        }" @click="handleHistoryClick(history)">
          <div class="item-header">
            <span class="sequence">#{{ history.sequence }}</span>
            <span v-if="history.isSnapshot" class="badge">快照</span>
          </div>
          <div class="item-time">{{ formatTime(history.createdTime) }}</div>
        </div>
      </div>
    </div>

    <!-- Diff 对比弹出层 -->
    <Popup title="📊 版本对比" ref="diffPopupRef" :mask-closable="true" @close="closeDiffPopup">
      <div class="diff-dialog">
        <div class="diff-info">
          <div class="info-left">
            <div class="info-item">
              <span class="label">选中版本：</span>
              <span class="value">#{{ selectedHistory?.sequence }}</span>
            </div>
            <div class="info-item">
              <span class="label">时间：</span>
              <span class="value">{{ selectedHistory ? formatTime(selectedHistory.createdTime) : '' }}</span>
            </div>
          </div>
          <div class="info-hint">
            💡 以下差异展示的是：从当前版本回退到所选历史版本后的内容变化
          </div>
        </div>

        <div class="diff-content scroll-container">
          <div v-for="(diff, index) in visualDiffs" :key="index" class="diff-line" :class="diff.type">
            <span class="line-number">{{ diff.lineNumber }}</span>
            <span class="line-indicator">
              {{ diff.type === 'added' ? '+' : diff.type === 'removed' ? '-' : ' ' }}
            </span>
            <span class="line-content">{{ diff.content || ' ' }}</span>
          </div>
        </div>

        <div class="diff-actions">
          <button class="btn-restore" @click="handleRestore">
            ⬅️ 回退到此版本
          </button>
          <button class="btn-cancel" @click="diffPopupRef?.close()">
            取消
          </button>
        </div>
      </div>
    </Popup>
  </div>
</template>

<style scoped>
.history-sidebar {
  height: 100%;
  width: 100%;
  display: flex;
  background-color: var(--background-secondary);
  border-left: 1px solid var(--border-color);
}

.history-list {
  flex: 1;
  width: 0;
  display: flex;
  flex-direction: column;
}

.header {
  height: 3rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1rem;
  border-bottom: 1px solid var(--border-color);
}

.header h3 {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-primary);
}

.refresh-btn {
  padding: 0.25rem 0.5rem;
  background-color: var(--background-tertiary);
  border-radius: 0.25rem;
  cursor: pointer;
  transition: all 0.2s;
}

.refresh-btn:hover:not(:disabled) {
  background-color: var(--primary);
  color: white;
}

.refresh-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.list-container {
  flex: 1;
  height: 0;
  overflow-y: auto;
  padding: 0.5rem;
}

.empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-tertiary);
  font-size: 0.85rem;
}

.history-item {
  padding: .5rem;
  margin-bottom: 0.5rem;
  background-color: var(--background-tertiary);
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid transparent;
}

.history-item:hover {
  background-color: var(--background-primary);
  border-color: var(--primary-light);
}

.history-item.selected {
  background-color: var(--primary-dark);
  border-color: var(--primary);
}

.history-item.snapshot {
  border-left: 3px solid var(--primary);
}

.item-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}

.sequence {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-primary);
}

.badge {
  font-size: 0.65rem;
  padding: 0.1rem 0.4rem;
  background-color: var(--primary);
  color: white;
  border-radius: 0.25rem;
}

.item-time {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

/* Diff 弹出层样式 */
.diff-dialog {
  width: 60rem;
  height: 40rem;
  display: flex;
  flex-direction: column;
}

.diff-info {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 1rem;
  background-color: var(--background-tertiary);
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

.info-left {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex-shrink: 0;
}

.info-hint {
  flex: 1;
  padding: 0.75rem;
  background-color: rgba(0, 122, 255, 0.1);
  border-left: 3px solid var(--primary);
  border-radius: 0.25rem;
  font-size: 0.85rem;
  line-height: 1.5;
  color: var(--text-primary);
}

.info-item {
  display: flex;
  align-items: center;
  margin-bottom: 0.25rem;
  font-size: 0.85rem;
}

.info-item:last-child {
  margin-bottom: 0;
}

.info-item .label {
  color: var(--text-secondary);
  margin-right: 0.5rem;
}

.info-item .value {
  color: var(--text-primary);
  font-weight: 500;
}

.diff-content {
  flex: 1;
  height: 0;
  overflow-y: auto;
  padding: 0.5rem;
  background-color: var(--background-primary);
  font-family: 'Courier New', monospace;
  font-size: 0.85rem;
  line-height: 1.6;
}

.diff-line {
  display: flex;
  padding: 0.1rem 0.5rem;
  margin-bottom: 1px;
}

.diff-line.added {
  background-color: rgba(52, 199, 89, 0.15);
  color: #34c759;
}

.diff-line.removed {
  background-color: rgba(255, 59, 48, 0.15);
  color: #ff3b30;
}

.diff-line.unchanged {
  color: var(--text-secondary);
}

.line-number {
  display: inline-block;
  width: 3rem;
  text-align: right;
  margin-right: 1rem;
  color: var(--text-tertiary);
  user-select: none;
}

.line-indicator {
  display: inline-block;
  width: 1.5rem;
  text-align: center;
  font-weight: bold;
}

.line-content {
  flex: 1;
  white-space: pre-wrap;
  word-break: break-all;
}

.diff-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1rem;
  border-top: 1px solid var(--border-color);
  background-color: var(--background-secondary);
  flex-shrink: 0;
}

.btn-restore,
.btn-cancel {
  padding: 0.6rem 1.5rem;
  border-radius: 0.25rem;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid var(--border-color);
}

.btn-restore {
  background-color: var(--primary);
  color: white;
}

.btn-restore:hover {
  background-color: var(--primary-dark);
}

.btn-cancel {
  background-color: var(--background-secondary);
  color: var(--text-primary);
}

.btn-cancel:hover {
  background-color: var(--background-tertiary);
  border-color: var(--text-secondary);
}
</style>
