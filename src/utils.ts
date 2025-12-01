let _uid: () => string
if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
  _uid = crypto.randomUUID
} else {
  _uid = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

/** 生成一个唯一的 UUID v4 */
export const uid = () => _uid()
