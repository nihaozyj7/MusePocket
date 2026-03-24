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
  // 功能已移除，仅保留空实现
}

/** 执行重做 */
function handleRedo() {
  // 功能已移除，仅保留空实现
}

defineExpose({
  show,
  hide
})
</script>

<template>
<Popup ref="popupRef" title="📜 历史记录" :width="600">
  <div class="history-container p-3">
    <div class="stats flex gap-2 p-3 bg-tertiary rounded-[0.375rem] mb-4">
      <div class="stat-item flex items-center gap-2">
        <span class="label text-secondary text-[0.85rem]">可撤销步数：</span>
        <span class="value text-[1.1rem] font-bold text-primary">{{ stats.undoCount }}</span>
      </div>
      <div class="stat-item flex items-center gap-2">
        <span class="label text-secondary text-[0.85rem]">可重做步数：</span>
        <span class="value text-[1.1rem] font-bold text-primary">{{ stats.redoCount }}</span>
      </div>
    </div>

    <div class="actions flex gap-2 mb-4">
      <button class="action-btn flex-1 px-4 py-[0.6rem] rounded-[0.375rem] bg-tertiary text-primary text-[0.85rem] cursor-pointer transition-all disabled:opacity-30 disabled:cursor-not-allowed" :disabled="!stats.canUndo" @click="handleUndo">
        ↩️ 撤销一步
      </button>
      <button class="action-btn flex-1 px-4 py-[0.6rem] rounded-[0.375rem] bg-tertiary text-primary text-[0.85rem] cursor-pointer transition-all disabled:opacity-30 disabled:cursor-not-allowed" :disabled="!stats.canRedo" @click="handleRedo">
        ↪️ 重做一步
      </button>
    </div>

    <div class="info p-3 bg-tertiary rounded-[0.375rem] text-secondary text-[0.8rem] leading-normal">
      <p class="m-0 mb-[0.4rem] font-bold text-primary">💡 提示：</p>
      <ul class="m-0 pl-6">
        <li class="mb-[0.35rem]">历史记录会自动保存您的每次编辑（最多 500 步）</li>
        <li class="mb-[0.35rem]">使用 <kbd class="inline-block px-1 py-[0.1rem] bg-secondary border border-color rounded text-[0.75rem] font-mono">Ctrl+Z</kbd> 快捷键可快速撤销</li>
        <li class="mb-[0.35rem]">使用 <kbd class="inline-block px-1 py-[0.1rem] bg-secondary border border-color rounded text-[0.75rem] font-mono">Ctrl+Y</kbd> 快捷键可快速重做</li>
        <li class="mb-[0.35rem]">切换文章时会保留各自的历史记录</li>
      </ul>
    </div>
  </div>
</Popup>
</template>
