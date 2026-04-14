<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { imagedb } from '@shared/db'
import type { ImageBase64 } from '@shared/types'
import { $tips } from '@app/plugins'
import { clearImageCache } from '@shared/utils'
import { $confirm } from '@app/plugins'

defineProps<{ title: string }>()

/** 所有图片列表 */
const images = ref<ImageBase64[]>([])
/** 图片URL缓存 */
const imageUrls = ref<Map<string, string>>(new Map())
/** 正在上传 */
const uploading = ref(false)

onMounted(async () => {
  await loadImages()
})

/** 加载所有图片 */
async function loadImages() {
  try {
    images.value = await imagedb.getAllImages()
    // 生成URL
    imageUrls.value.clear()
    images.value.forEach(img => {
      const url = URL.createObjectURL(img.base64)
      imageUrls.value.set(img.id, url)
    })
  } catch (err: any) {
    $tips.error(`加载图片失败: ${err.message}`)
  }
}

/** 上传图片 */
async function handleUpload() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.multiple = true

  input.onchange = async (e) => {
    const files = (e.target as HTMLInputElement).files
    if (!files || files.length === 0) return

    uploading.value = true

    try {
      for (const file of Array.from(files)) {
        // 验证文件类型
        if (!file.type.startsWith('image/')) {
          $tips.error(`${file.name} 不是有效的图片文件`)
          continue
        }

        // 验证文件大小（限制5MB）
        if (file.size > 5 * 1024 * 1024) {
          $tips.error(`${file.name} 文件过大，请选择小于5MB的图片`)
          continue
        }

        const res = await imagedb.createImage(file)
        if (res.success && res.id) {
          $tips.success(`上传成功: ${file.name}`)
        } else {
          $tips.error(`上传失败: ${file.name}`)
        }
      }

      // 重新加载图片列表
      await loadImages()
    } catch (err: any) {
      $tips.error(`上传失败: ${err.message}`)
    } finally {
      uploading.value = false
    }
  }

  input.click()
}

/** 删除图片 */
async function handleDelete(image: ImageBase64) {
  const confirmed = await $confirm('确定要删除这张图片吗？删除后无法恢复。', '确认删除')

  if (!confirmed) return

  try {
    const res = await imagedb.deleteImage(image.id)
    if (res.success) {
      $tips.success('删除成功')
      // 清除缓存
      clearImageCache(image.id)
      const url = imageUrls.value.get(image.id)
      if (url) {
        URL.revokeObjectURL(url)
        imageUrls.value.delete(image.id)
      }
      // 重新加载列表
      await loadImages()
    } else {
      $tips.error(`删除失败: ${res.message}`)
    }
  } catch (err: any) {
    $tips.error(`删除失败: ${err.message}`)
  }
}

/** 复制图片ID */
function copyImageId(id: string) {
  navigator.clipboard.writeText(id).then(() => {
    $tips.success('图片ID已复制到剪贴板')
  }).catch(() => {
    $tips.error('复制失败')
  })
}
</script>

<template>
<div>
  <div class="title">{{ title }}</div>
  <div class="content">
    <!-- 操作栏 -->
    <div class="toolbar">
      <button @click="handleUpload" :disabled="uploading">
        {{ uploading ? '上传中...' : '📤 上传图片' }}
      </button>
      <div class="info">
        <span>共 {{ images.length }} 张图片</span>
        <span class="tip">（支持批量上传，单张图片不超过5MB）</span>
      </div>
    </div>

    <!-- 图片网格 -->
    <div class="image-grid" v-if="images.length > 0">
      <div class="image-item" v-for="image in images" :key="image.id">
        <div class="image-wrapper">
          <img :src="imageUrls.get(image.id)" :alt="image.id" />
        </div>
        <div class="image-actions">
          <button class="btn-copy" @click="copyImageId(image.id)" title="复制ID">
            📋
          </button>
          <button class="btn-delete" @click="handleDelete(image)" title="删除">
            🗑️
          </button>
        </div>
        <div class="image-id">{{ image.id }}</div>
      </div>
    </div>

    <!-- 空状态 -->
    <div class="empty-state" v-else>
      <div class="empty-icon">🖼️</div>
      <p>还没有上传图片</p>
      <p class="empty-tip">点击上方按钮上传图片，用于书籍封面或其他用途</p>
    </div>
  </div>
</div>
</template>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  gap: .5rem;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border-color);
}
.info {
  display: flex;
  align-items: center;
  gap: .5rem;
  font-size: 0.85rem;
  color: var(--text-secondary);
}
.tip {
  font-size: 0.75rem;
  opacity: 0.7;
}
.image-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: .5rem;
}
.image-item {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--border-color);
  border-radius: 0.25rem;
  overflow: hidden;
  background-color: var(--background-secondary);
  transition: all 0.2s;
}
.image-item:hover {
  border-color: var(--primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
.image-wrapper {
  width: 100%;
  height: 150px;
  overflow: hidden;
  background-color: var(--background-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
}
.image-wrapper img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.image-actions {
  display: flex;
  gap: .5rem;
  padding: 0.5rem;
  border-top: 1px solid var(--border-color);
}
.image-actions button {
  flex: 1;
  padding: 0.25rem;
  font-size: 0.85rem;
  border: 1px solid var(--border-color);
  background-color: var(--background-tertiary);
}
.image-id {
  padding: 0.5rem;
  font-size: 0.75rem;
  color: var(--text-secondary);
  font-family: monospace;
  text-align: center;
  border-top: 1px solid var(--border-color);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.empty-tip {
  font-size: 0.85rem;
  opacity: 0.7;
}
</style>
