const $eventManager = new Map<string, ((...args: any[]) => void)[]>()

/**
 * 注册事件监听器
 */
export function event_on(eventName: string, callback: (...args: any[]) => void): void {
  const listeners = $eventManager.get(eventName) || []
  $eventManager.set(eventName, [...listeners, callback])
}

/**
 * 移除事件监听器（需传入与 on 中相同的函数引用）
 */
export function event_off(eventName: string, callback: (...args: any[]) => void): void {
  const listeners = $eventManager.get(eventName) || []
  $eventManager.set(eventName, listeners.filter(cb => cb !== callback))
}

/**
 * 触发事件，调用所有监听器
 */
export function event_emit(eventName: string, ...args: any[]): void {
  const listeners = $eventManager.get(eventName) || []
  listeners.forEach(callback => callback(...args))
}

/**
 * 注册一次性事件监听器，触发后自动移除
 */
export function event_once(eventName: string, callback: (...args: any[]) => void): void {
  const wrapped = (...args: any[]) => {
    event_off(eventName, wrapped)
    callback(...args)
  }
  event_on(eventName, wrapped)
}

/**
 * 清空所有事件监听器
 */
export function event_clearEvents(): void {
  $eventManager.clear()
}
