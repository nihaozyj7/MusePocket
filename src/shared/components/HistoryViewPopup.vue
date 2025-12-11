<script setup lang="ts">
import { ref, computed } from 'vue'
import { useHistoryStore } from '@domains/editor/stores/history.store'
import { Popup } from '@shared/components'

const popupRef = ref<InstanceType<typeof Popup> | null>(null)
const historyStore = useHistoryStore()

const emit = defineEmits<{
  undo: []
  redo: []
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
  if (historyStore.canUndo) {
    emit('undo')
  }
}

/** 执行重做 */
function handleRedo() {
  if (historyStore.canRedo) {
    emit('redo')
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
      </div>

      <div class="info">
        <p>💡 提示：</p>
        <ul>
          <li>历史记录会自动保存您的每次编辑（最多500步）</li>
          <li>使用 <kbd>Ctrl+Z</kbd> 快捷键可快速撤销</li>
          <li>使用 <kbd>Ctrl+Y</kbd> 快捷键可快速重做</li>
          <li>切换文章时会保留各自的历史记录</li>
        </ul>
      </div>
    </div>
  </Popup>
</template>

<style scoped>
.history-container {
  padding: 0.75rem;
}

.stats {
  display: flex;
  gap: 1.5rem;
  padding: 0.75rem;
  background-color: var(--background-tertiary);
  border-radius: 0.375rem;
  margin-bottom: 1rem;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.stat-item .label {
  color: var(--text-secondary);
  font-size: 0.85rem;
}

.stat-item .value {
  font-size: 1.1rem;
  font-weight: bold;
  color: var(--primary);
}

.actions {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.action-btn {
  flex: 1;
  padding: 0.6rem 0.8rem;
  border-radius: 0.375rem;
  background-color: var(--background-tertiary);
  color: var(--text-primary);
  font-size: 0.85rem;
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
  padding: 0.75rem;
  background-color: var(--background-tertiary);
  border-radius: 0.375rem;
  color: var(--text-secondary);
  font-size: 0.8rem;
  line-height: 1.5;
}

.info p {
  margin: 0 0 0.4rem 0;
  font-weight: bold;
  color: var(--text-primary);
}

.info ul {
  margin: 0;
  padding-left: 1.5rem;
}

.info li {
  margin-bottom: 0.35rem;
}

.info kbd {
  display: inline-block;
  padding: 0.1rem 0.35rem;
  background-color: var(--background-secondary);
  border: 1px solid var(--border-color);
  border-radius: 0.25rem;
  font-family: monospace;
  font-size: 0.75rem;
}
</style>
