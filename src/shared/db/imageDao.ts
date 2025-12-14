import db from "./db.ts"
import type { ImageBase64, Status } from "../types/index.ts"
import { uid } from "../utils/index.ts"

/** 图片操作类 */
export default new class {
  /** 创建图片 */
  async createImage(img: Blob): Promise<Status & { id?: string }> {
    try {
      const imageId = uid()
      const tx = db.transaction(['images'], 'readwrite')
      await tx.objectStore('images').add({ id: imageId, base64: img })
      await tx.done
      return { success: true, id: imageId }
    } catch (err: any) {
      return { success: false, message: err.message }
    }
  }
  /** 获取所有图片 */
  async getAllImages(): Promise<ImageBase64[]> {
    const store = db.transaction(['images'], 'readonly').objectStore('images')
    return store.getAll()
  }

  /** 删除图片 */
  async deleteImage(id: string): Promise<Status> {
    try {
      const tx = db.transaction(['images'], 'readwrite')
      await tx.objectStore('images').delete(id)
      await tx.done
      return { success: true }
    } catch (err: any) {
      return { success: false, message: err.message }
    }
  }
}()
