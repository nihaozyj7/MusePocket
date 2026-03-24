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
  <div class="select-cover-container w-[50rem] h-[35rem] flex flex-col">
    <!-- 操作栏 -->
    <div class="toolbar flex items-center gap-2 pb-4 border-b border-color">
      <button @click="handleUpload" :disabled="uploading">
        {{ uploading ? '上传中...' : '📤 上传新图片' }}
      </button>
      <span class="info text-[0.85rem] text-secondary">共 {{ images.length }} 张图片</span>
    </div>

    <!-- 图片网格 -->
    <div class="image-grid flex-1 overflow-y-auto grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-2 p-4" v-if="images.length > 0">
      <div class="image-item relative aspect-[3/4] border-2 border-color rounded overflow-hidden cursor-pointer transition-all duration-200 hover:border-primary hover:scale-105" :class="{ selected: image.id === selectedCoverId }" v-for="image in images" :key="image.id" @click="selectCover(image.id)">
        <div class="image-wrapper w-full h-full bg-tertiary flex items-center justify-center">
          <img :src="imageUrls.get(image.id)" :alt="image.id" class="w-full h-full object-cover" />
        </div>
        <div class="selected-badge absolute top-2 right-2 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-[0.9rem] font-bold" v-if="image.id === selectedCoverId">
          ✓
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div class="empty-state flex flex-col items-center justify-center p-12 text-center text-tertiary" v-else>
      <div class="empty-icon text-4xl">🖼️</div>
      <p class="mt-2">还没有图片</p>
      <p class="empty-tip text-[0.85rem] opacity-70 mt-1">点击上方按钮上传第一张图片</p>
    </div>

    <!-- 底部按钮 -->
    <div class="footer flex justify-end gap-2 pt-4 border-t border-color">
      <button @click="popupRef?.close()" class="btn-cancel bg-tertiary">取消</button>
      <button @click="confirmSelect" class="btn-confirm bg-primary text-white border-primary">确定</button>
    </div>
  </div>
</Popup>
</template>
