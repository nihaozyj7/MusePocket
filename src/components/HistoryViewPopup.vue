<script setup lang="ts">
import { ref, computed } from 'vue'
import { useHistoryStore } from '@/stores/HistoryStore'
import Popup from './Popup.vue'

const popupRef = ref<InstanceType<typeof Popup> | null>(null)
const historyStore = useHistoryStore()

const emit = defineEmits<{
  restore: [text: string]
}>()

/** 历史记录统计信息 */
const stats = computed(() => historyStore.stats || { undoCount: 0, redoCount: 0, canUndo: false, canRedo: false })

/** 显示弹窗 */
function show() {
  popupRef.value?.show()
}

/** 隐藏弹窗 */
function hide() {
  popupRef.value?.hide()
}

/** 执行撤销 */
function handleUndo() {
  emit('restore', '')
}

/** 执行重做 */
function handleRedo() {
  emit('restore', '')
}

/** 清除历史 */
function handleClearHistory() {
  if (confirm('确定要清除当前文章的所有历史记录吗？此操作不可恢复！')) {
    historyStore.resetCurrent()
  }
}

defineExpose({
  show,
  hide
})
</script>

<template>
  <Popup ref="popupRef" title="📜 历史记录" :width="600">
    <div class="history-container">
      <div class="stats">
        <div class="stat-item">
          <span class="label">可撤销步数：</span>
          <span class="value">{{ stats.undoCount }}</span>
        </div>
        <div class="stat-item">
          <span class="label">可重做步数：</span>
          <span class="value">{{ stats.redoCount }}</span>
        </div>
      </div>

      <div class="actions">
        <button class="action-btn undo" :disabled="!stats.canUndo" @click="handleUndo">
          ↩️ 撤销一步
        </button>
        <button class="action-btn redo" :disabled="!stats.canRedo" @click="handleRedo">
          ↪️ 重做一步
        </button>
        <button class="action-btn clear" @click="handleClearHistory">
          🗑️ 清除历史
        </button>
      </div>

      <div class="info">
        <p>💡 提示：</p>
        <ul>
          <li>历史记录会自动保存您的每次编辑（最多100步）</li>
          <li>使用 <kbd>Ctrl+Z</kbd> 快捷键可快速撤销</li>
          <li>使用 <kbd>Ctrl+Y</kbd> 快捷键可快速重做</li>
          <li>切换文章时会保留各自的历史记录</li>
          <li>历史记录仅保存在内存中，刷新页面后会清空</li>
        </ul>
      </div>
    </div>
  </Popup>
</template>

<style scoped>
.history-container {
  padding: 1rem;
}

.stats {
  display: flex;
  gap: 2rem;
  padding: 1rem;
  background-color: var(--background-tertiary);
  border-radius: 0.5rem;
  margin-bottom: 1.5rem;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.stat-item .label {
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.stat-item .value {
  font-size: 1.2rem;
  font-weight: bold;
  color: var(--primary);
}

.actions {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.action-btn {
  flex: 1;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  background-color: var(--background-tertiary);
  color: var(--text-primary);
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover:not(:disabled) {
  background-color: var(--primary);
  color: white;
}

.action-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.action-btn.clear {
  background-color: rgba(255, 59, 48, 0.1);
  color: #ff3b30;
}

.action-btn.clear:hover:not(:disabled) {
  background-color: #ff3b30;
  color: white;
}

.info {
  padding: 1rem;
  background-color: var(--background-tertiary);
  border-radius: 0.5rem;
  color: var(--text-secondary);
  font-size: 0.85rem;
  line-height: 1.6;
}

.info p {
  margin: 0 0 0.5rem 0;
  font-weight: bold;
  color: var(--text-primary);
}

.info ul {
  margin: 0;
  padding-left: 1.5rem;
}

.info li {
  margin-bottom: 0.5rem;
}

.info kbd {
  display: inline-block;
  padding: 0.1rem 0.4rem;
  background-color: var(--background-secondary);
  border: 1px solid var(--border-color);
  border-radius: 0.25rem;
  font-family: monospace;
  font-size: 0.8rem;
}
</style>
