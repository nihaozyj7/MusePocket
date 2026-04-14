/**
 * 全局 z-index 管理器
 * 确保弹窗按打开顺序正确显示层级关系
 */

const STORAGE_KEY = 'popup-zindex-current'
const BASE_ZINDEX = 999

class ZIndexManager {
  private currentZIndex: number

  constructor() {
    // 从 sessionStorage 读取当前 z-index，如果不存在则使用基础值
    const stored = sessionStorage.getItem(STORAGE_KEY)
    this.currentZIndex = stored ? parseInt(stored, 10) : BASE_ZINDEX
  }

  /**
   * 获取下一个 z-index 值并更新存储
   * @returns 新的 z-index 值
   */
  getNext(): number {
    this.currentZIndex += 1
    sessionStorage.setItem(STORAGE_KEY, this.currentZIndex.toString())
    return this.currentZIndex
  }

  /**
   * 重置 z-index 到基础值（可选，一般不需要调用）
   */
  reset(): void {
    this.currentZIndex = BASE_ZINDEX
    sessionStorage.setItem(STORAGE_KEY, this.currentZIndex.toString())
  }

  /**
   * 获取当前 z-index 值（不递增）
   */
  getCurrent(): number {
    return this.currentZIndex
  }
}

// 导出单例
export const zIndexManager = new ZIndexManager()
