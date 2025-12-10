import { ref } from 'vue'

// 对话框状态
export const confirmDialogState = ref({
  visible: false,
  title: '确认',
  message: '',
  resolve: null as ((value: boolean) => void) | null
})

/**
 * 显示确认对话框
 * @param message 提示消息
 * @param title 对话框标题，默认为"确认"
 * @returns Promise<boolean> 用户确认返回 true，取消返回 false
 */
export function $confirm(message: string, title = '确认'): Promise<boolean> {
  return new Promise((resolve) => {
    confirmDialogState.value = {
      visible: true,
      title,
      message,
      resolve
    }
  })
}

/**
 * 确认操作
 */
export function confirmDialogConfirm() {
  confirmDialogState.value.resolve?.(true)
  confirmDialogState.value.visible = false
  confirmDialogState.value.resolve = null
}

/**
 * 取消操作
 */
export function confirmDialogCancel() {
  confirmDialogState.value.resolve?.(false)
  confirmDialogState.value.visible = false
  confirmDialogState.value.resolve = null
}
