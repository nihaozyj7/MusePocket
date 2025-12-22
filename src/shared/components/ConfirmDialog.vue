<script setup lang="ts">
import { computed, watch, ref, nextTick } from 'vue'
import { Popup } from '@shared/components'
import { confirmDialogState, confirmDialogConfirm, confirmDialogCancel } from '@app/plugins'

const popupRef = ref<InstanceType<typeof Popup>>()

// 使用全局状态
const visible = computed(() => confirmDialogState.value.visible)
const title = computed(() => confirmDialogState.value.title)
const message = computed(() => confirmDialogState.value.message)

// 监听 visible 变化，控制 Popup 显示隐藏
watch(visible, async (newVal) => {
  if (newVal) {
    // 等待下一个 tick，确保 DOM 已经渲染
    await nextTick()
    if (popupRef.value) {
      popupRef.value.show()
    } else {
      console.warn('ConfirmDialog: popupRef is null when trying to show')
    }
  } else if (popupRef.value) {
    popupRef.value.close()
  }
})

function handleConfirm() {
  confirmDialogConfirm()
}

function handleCancel() {
  confirmDialogCancel()
}

function handleClose() {
  // 点击关闭按钮或遮罩层，视为取消
  confirmDialogCancel()
}
</script>

<template>
<Popup :title="title" ref="popupRef" mask-closable destroy-on-close @close="handleClose">
  <div class="confirm-dialog">
    <div class="message">{{ message }}</div>
    <div class="actions">
      <button class="btn-cancel" @click="handleCancel">取消</button>
      <button class="btn-confirm" @click="handleConfirm">确认</button>
    </div>
  </div>
</Popup>
</template>

<style scoped>
.confirm-dialog {
  width: 25rem;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: .5rem;
}
.message {
  font-size: 0.9rem;
  color: var(--text-primary);
  line-height: 1.6;
  white-space: pre-wrap;
  word-wrap: break-word;
  min-height: 3rem;
}
.actions {
  display: flex;
  justify-content: flex-end;
  gap: .5rem;
}
.actions button {
  padding: 0.5rem 1.5rem;
  border-radius: 0.25rem;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid var(--border-color);
}
.btn-cancel {
  background-color: var(--background-secondary);
  color: var(--text-primary);
}
.btn-confirm {
  background-color: var(--primary);
  color: white;
  border-color: var(--primary);
}
</style>
