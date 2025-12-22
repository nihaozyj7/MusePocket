<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Popup } from '@shared/components'
import { imagedb } from '@shared/db'
import type { ImageBase64 } from '@shared/types'
import { $tips } from '@app/plugins'

const emit = defineEmits<{
  'select': [coverId: string]
}>()

const popupRef = ref<InstanceType<typeof Popup>>()
/** 所有图片列表 */
const images = ref<ImageBase64[]>([])
/** 图片URL缓存 */
const imageUrls = ref<Map<string, string>>(new Map())
/** 当前选中的封面ID */
const selectedCoverId = ref<string>('')
/** 正在上传 */
const uploading = ref(false)

defineExpose({
  show: (currentCoverId?: string) => {
    selectedCoverId.value = currentCoverId || ''
    popupRef.value?.show()
    loadImages()
  }
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

/** 选择封面 */
function selectCover(imageId: string) {
  selectedCoverId.value = imageId
}

/** 确认选择 */
function confirmSelect() {
  if (!selectedCoverId.value) {
    $tips.error('请先选择一张图片')
    return
  }
  emit('select', selectedCoverId.value)
  popupRef.value?.close()
}

/** 上传新图片 */
async function handleUpload() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'

  input.onchange = async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      $tips.error('请选择有效的图片文件')
      return
    }

    // 验证文件大小（限制5MB）
    if (file.size > 5 * 1024 * 1024) {
      $tips.error('文件过大，请选择小于5MB的图片')
      return
    }

    uploading.value = true

    try {
      const res = await imagedb.createImage(file)
      if (res.success && res.id) {
        $tips.success('上传成功')
        await loadImages()
        // 自动选中新上传的图片
        selectedCoverId.value = res.id
      } else {
        $tips.error('上传失败')
      }
    } catch (err: any) {
      $tips.error(`上传失败: ${err.message}`)
    } finally {
      uploading.value = false
    }
  }

  input.click()
}
</script>

<template>
<Popup title="🖼️ 选择封面" ref="popupRef">
  <div class="select-cover-container">
    <!-- 操作栏 -->
    <div class="toolbar">
      <button @click="handleUpload" :disabled="uploading">
        {{ uploading ? '上传中...' : '📤 上传新图片' }}
      </button>
      <span class="info">共 {{ images.length }} 张图片</span>
    </div>

    <!-- 图片网格 -->
    <div class="image-grid" v-if="images.length > 0">
      <div class="image-item" :class="{ selected: image.id === selectedCoverId }" v-for="image in images" :key="image.id" @click="selectCover(image.id)">
        <div class="image-wrapper">
          <img :src="imageUrls.get(image.id)" :alt="image.id" />
        </div>
        <div class="selected-badge" v-if="image.id === selectedCoverId">
          ✓
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div class="empty-state" v-else>
      <div class="empty-icon">🖼️</div>
      <p>还没有图片</p>
      <p class="empty-tip">点击上方按钮上传第一张图片</p>
    </div>

    <!-- 底部按钮 -->
    <div class="footer">
      <button @click="popupRef?.close()" class="btn-cancel">取消</button>
      <button @click="confirmSelect" class="btn-confirm">确定</button>
    </div>
  </div>
</Popup>
</template>

<style scoped>
.select-cover-container {
  width: 50rem;
  height: 35rem;
  display: flex;
  flex-direction: column;
}
.toolbar {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border-color);
}
.info {
  font-size: 0.85rem;
  color: var(--text-secondary);
}
.image-grid {
  flex: 1;
  overflow-y: auto;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 1rem;
  padding: 1rem 0;
}
.image-item {
  position: relative;
  aspect-ratio: 3/4;
  border: 2px solid var(--border-color);
  border-radius: 0.25rem;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s;
}
.image-item:hover {
  border-color: var(--primary);
  transform: scale(1.05);
}
.image-item.selected {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(41, 151, 255, 0.2);
}
.image-wrapper {
  width: 100%;
  height: 100%;
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
.selected-badge {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  width: 1.5rem;
  height: 1.5rem;
  background-color: var(--primary);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
  font-weight: bold;
}
.empty-tip {
  font-size: 0.85rem;
  opacity: 0.7;
}
.footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color);
}
.btn-cancel {
  background-color: var(--background-tertiary);
}
.btn-confirm {
  background-color: var(--primary);
  color: white;
  border-color: var(--primary);
}
</style>
