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
  console.log('$confirm called:', { message, title })
  return new Promise((resolve) => {
    confirmDialogState.value = {
      visible: true,
      title,
      message,
      resolve
    }
    console.log('confirmDialogState updated:', confirmDialogState.value)
  })
}

/**
 * 确认操作
 */
export function confirmDialogConfirm() {
  console.log('confirmDialogConfirm called')
  confirmDialogState.value.resolve?.(true)
  confirmDialogState.value.visible = false
  confirmDialogState.value.resolve = null
}

/**
 * 取消操作
 */
export function confirmDialogCancel() {
  console.log('confirmDialogCancel called')
  confirmDialogState.value.resolve?.(false)
  confirmDialogState.value.visible = false
  confirmDialogState.value.resolve = null
}
