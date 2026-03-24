<script setup lang="ts">
import { computed, watch, ref, nextTick } from 'vue'
import { Popup } from '@shared/components'
import { confirmDialogState, confirmDialogConfirm, confirmDialogCancel } from '@app/plugins'

const popupRef = ref<InstanceType<typeof Popup>>()

// 使用全局状态
const visible = computed(() => confirmDialogState.value.visible)
const title = computed(() => confirmDialogState.value.title)
const message = computed(() => confirmDialogState.value.message)

// 监听 visible 变化，控制 Popup 显示隐藏
watch(visible, async (newVal) => {
  if (newVal) {
    // 等待下一个 tick，确保 DOM 已经渲染
    await nextTick()
    if (popupRef.value) {
      popupRef.value.show()
    } else {
      console.warn('ConfirmDialog: popupRef is null when trying to show')
    }
  } else if (popupRef.value) {
    popupRef.value.close()
  }
})

function handleConfirm() {
  confirmDialogConfirm()
}

function handleCancel() {
  confirmDialogCancel()
}

function handleClose() {
  // 点击关闭按钮或遮罩层，视为取消
  confirmDialogCancel()
}
</script>

<template>
<Popup :title="title" ref="popupRef" mask-closable destroy-on-close @close="handleClose">
  <div class="w-100 p-6 flex flex-col gap-2">
    <div class="text-[0.9rem] text-primary leading-normal whitespace-pre-wrap break-words min-h-12">{{ message }}</div>
    <div class="flex justify-end gap-2">
      <button class="btn-secondary" @click="handleCancel">取消</button>
      <button class="btn-primary" @click="handleConfirm">确认</button>
    </div>
  </div>
</Popup>
</template>
