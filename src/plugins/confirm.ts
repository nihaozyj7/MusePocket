import { createApp, h } from 'vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'

let confirmInstance: any = null

/**
 * 初始化确认对话框实例
 * 在应用启动时调用
 */
export function initConfirmDialog() {
  // 如果已存在实例，先销毁
  if (confirmInstance) {
    confirmInstance.unmount()
    confirmInstance = null
  }

  // 创建容器元素
  const container = document.createElement('div')
  container.id = 'confirm-dialog-container'
  document.body.appendChild(container)

  // 创建 Vue 应用实例
  const app = createApp({
    render() {
      return h(ConfirmDialog, { ref: 'confirmRef' })
    }
  })

  confirmInstance = app.mount(container)
}

/**
 * 显示确认对话框
 * @param message 提示消息
 * @param title 对话框标题，默认为"确认"
 * @returns Promise<boolean> 用户确认返回 true，取消返回 false
 */
export async function $confirm(message: string, title = '确认'): Promise<boolean> {
  if (!confirmInstance) {
    console.warn('ConfirmDialog not initialized. Call initConfirmDialog() first.')
    // 降级到原生 confirm
    return confirm(message)
  }

  const confirmRef = confirmInstance.$refs.confirmRef
  if (!confirmRef) {
    console.warn('ConfirmDialog ref not found.')
    return confirm(message)
  }

  return await confirmRef.show(message, title)
}
