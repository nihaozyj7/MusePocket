<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useSelectedArticleStore } from '@domains/editor/stores/selected-article.store'
import { useHistoryStore } from '@domains/editor/stores/history.store'
import { computeDiff, type DiffOperation } from '@domains/editor/services/history.service'
import { Popup } from '@shared/components'
import type { ArticleHistoryRecord } from '@shared/types'

const selectedArticleStore = useSelectedArticleStore()
const historyStore = useHistoryStore()

const emit = defineEmits<{
  restore: [historyId: string]
}>()


const histories = computed(() => historyStore.currentHistories)
/** 当前索引 (-1 表示在最新版本，0 表示在第一个历史版本) */
const currentIndex = computed(() => historyStore.getCurrentIndex())
/** 选中的历史记录 */
const selectedHistory = ref<ArticleHistoryRecord | null>(null)
/** 当前文章的文本 */
const currentText = ref('')
/** 可视化 diff 结果 */
interface VisualDiff {
  type: 'added' | 'removed' | 'unchanged'
  content: string
  lineNumber?: number
}
const visualDiffs = ref<VisualDiff[]>([])
/** diff 弹出层引用 */
const diffPopupRef = ref<InstanceType<typeof Popup> | null>(null)
/** 获取当前编辑器文本的回调函数 */
const getCurrentTextCallback = ref<(() => string) | null>(null)

/**
 * 判断某个历史记录是否为当前版本
 */
function isCurrentVersion(index: number): boolean {
  // currentIndex = -1 表示在最新版本（没有任何历史记录是当前的）
  // currentIndex = 0 表示在第一个历史版本（索引0）
  // currentIndex = 1 表示在第二个历史版本（索引1）
  return currentIndex.value === index
}

/**
 * 格式化时间
 *
 * @param timestamp 要格式化的时间戳（毫秒）
 * @returns 格式化后的时间字符串
 */
function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  const now = new Date()

  // 获取各部分并格式化为两位数（小时/分钟/秒）
  const pad = (n: number) => String(n).padStart(2, '0')
  const hh = pad(date.getHours())
  const mm = pad(date.getMinutes())
  const ss = pad(date.getSeconds())
  const month = date.getMonth() + 1
  const day = date.getDate()
  const year = date.getFullYear()

  // 判断是否为同一天
  const isSameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()

  // 同一天：返回 时:分:秒
  if (isSameDay) {
    return `${hh}:${mm}:${ss}`
  }

  // 判断是否为同一年（但不需要保证不同天，这一分支在同一天分支后）
  const isSameYear = date.getFullYear() === now.getFullYear()

  if (isSameYear) {
    return `${month}月${day}日 ${hh}:${mm}:${ss}`
  }

  // 不同年：返回 年月日 时:分:秒
  return `${year}年${month}月${day}日 ${hh}:${mm}:${ss}`
}

/** 点击历史记录 */
async function handleHistoryClick(history: ArticleHistoryRecord) {
  selectedHistory.value = history

  // 获取目标版本内容
  const historyContent = await historyStore.getHistoryContent(history.id)
  if (historyContent === null) {
    console.error('无法重建历史版本内容')
    return
  }

  // 获取当前内容
  const current = getCurrentTextCallback.value ? getCurrentTextCallback.value() : currentText.value

  // 计算 diff（注意：从当前版本到目标版本）
  const diffs = computeDiff(current, historyContent)

  // 转换为可视化 diff
  visualDiffs.value = convertToVisualDiff(diffs, current, historyContent)

  diffPopupRef.value?.show()
}

/** 将 diff 操作转换为可视化格式 */
function convertToVisualDiff(diffs: DiffOperation[], oldText: string, newText: string): VisualDiff[] {
  const result: VisualDiff[] = []
  let lineNumber = 1

  for (const diff of diffs) {
    const lines = diff.value.split('\n')

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]

      // 跳过最后一个空行（split 后的副产品）
      if (i === lines.length - 1 && line === '') continue

      if (diff.type === 'add') {
        result.push({
          type: 'added',
          content: line,
          lineNumber: lineNumber++
        })
      } else if (diff.type === 'remove') {
        result.push({
          type: 'removed',
          content: line,
          lineNumber: lineNumber++
        })
      } else {
        result.push({
          type: 'unchanged',
          content: line,
          lineNumber: lineNumber++
        })
      }
    }
  }

  return result
}

/** 回退到选中的历史版本 */
async function handleRestore() {
  if (!selectedHistory.value) return
  emit('restore', selectedHistory.value.id)
  diffPopupRef.value?.close()
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

      <div v-for="(history, index) in histories" :key="history.id" class="history-item" :class="{
        'selected': selectedHistory?.id === history.id,
        'snapshot': isCurrentVersion(index),
      }" @click="handleHistoryClick(history)">
        <div class="item-time">
          {{ `${formatTime(history.createdTime)}` }}
          <span class="badges">
            <span v-if="history.fullContent" class="badge snapshot-badge">快照</span>
            <span v-if="isCurrentVersion(index)" class="badge current-badge">当前</span>
          </span>
        </div>
      </div>
    </div>
  </div>

  <!-- Diff 对比弹出层 -->
  <Popup title="📊 版本对比" ref="diffPopupRef" :mask-closable="true" @close="closeDiffPopup">
    <div class="diff-dialog" v-if="selectedHistory" :key="selectedHistory.id">
      <div class="diff-info">
        <div class="info-left">
          <div class="info-item">
            <span class="label">ID：</span>
            <span class="value">{{ selectedHistory.id }}</span>
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
.current-indicator {
  display: flex;
  align-items: center;
  gap: .5rem;
  padding: 0.75rem;
  margin-bottom: 0.75rem;
  background: linear-gradient(135deg, rgba(52, 199, 89, 0.15) 0%, rgba(52, 199, 89, 0.05) 100%);
  border: 2px solid #34c759;
  border-radius: 0.5rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: #34c759;
}
.indicator-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  background-color: #34c759;
  color: white;
  border-radius: 50%;
  font-size: 0.9rem;
  font-weight: bold;
}
.indicator-text {
  flex: 1;
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
.history-item.current:hover {
  background-color: var(--primary-light);
  border-color: var(--primary);
}
.item-header {
  display: flex;
  align-items: center;
  gap: .5rem;
  margin-bottom: 0.25rem;
}
.sequence {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-primary);
}
.badges {
  display: flex;
  gap: .5rem;
  align-items: center;
}
.badge {
  font-size: 0.65rem;
  padding: 0.1rem 0.4rem;
  color: white;
  border-radius: 0.25rem;
  font-weight: 500;
}
.snapshot-badge {
  background-color: var(--primary);
}
.current-badge {
  background-color: #34c759;
}
.item-time {
  font-size: 0.75rem;
  color: var(--text-secondary);
  display: flex;
  justify-content: space-between;
  align-items: center;
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
  gap: .5rem;
  padding: 1rem;
  background-color: var(--background-tertiary);
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}
.info-left {
  display: flex;
  flex-direction: column;
  gap: .5rem;
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
  gap: .5rem;
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
.btn-cancel {
  background-color: var(--background-secondary);
  color: var(--text-primary);
}
</style>
