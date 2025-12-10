<script setup lang="ts">
import { ref } from 'vue'
import Popup from './Popup.vue'

const popupRef = ref<InstanceType<typeof Popup>>()
const message = ref('')
const title = ref('确认')
let resolvePromise: ((value: boolean) => void) | null = null

/**
 * 显示确认对话框
 * @param msg 提示消息
 * @param dialogTitle 对话框标题，默认为"确认"
 * @returns Promise<boolean> 用户点击确认返回 true，取消返回 false
 */
function show(msg: string, dialogTitle = '确认'): Promise<boolean> {
  message.value = msg
  title.value = dialogTitle
  popupRef.value?.show()

  return new Promise((resolve) => {
    resolvePromise = resolve
  })
}

function handleConfirm() {
  popupRef.value?.close()
  resolvePromise?.(true)
  resolvePromise = null
}

function handleCancel() {
  popupRef.value?.close()
  resolvePromise?.(false)
  resolvePromise = null
}

function handleClose() {
  // 点击关闭按钮或遮罩层，视为取消
  resolvePromise?.(false)
  resolvePromise = null
}

defineExpose({ show })
</script>

<template>
  <Popup :title="title" ref="popupRef" mask-closable @close="handleClose">
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
  gap: 1.5rem;
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
  gap: 0.75rem;
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

.btn-cancel:hover {
  background-color: var(--background-tertiary);
  border-color: var(--text-secondary);
}

.btn-confirm {
  background-color: var(--primary);
  color: white;
  border-color: var(--primary);
}

.btn-confirm:hover {
  background-color: var(--primary-dark);
  border-color: var(--primary-dark);
}
</style>
