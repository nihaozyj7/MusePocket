<script setup lang="ts">
import { RouterView } from 'vue-router'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import SettingPopup from '@/components/SettingPopup.vue'
import { useSettingStore } from '@/stores/SettingStore'
import { onMounted, ref } from 'vue'
import { event_on } from '@/eventManager'

const settingStore = useSettingStore()

/** 设置弹出层 */
const settingPopupRef = ref<InstanceType<typeof SettingPopup> | null>(null)

document.addEventListener('contextmenu', e => e.preventDefault())

onMounted(() => {
  // 在应用启动时统一应用背景图片设置
  settingStore.applyBackgroundImage()

  // 监听打开设置的事件
  event_on('openSettings', () => {
    settingPopupRef.value?.show()
  })
})
</script>

<template>
  <div class="app-container">
    <RouterView />
    <ConfirmDialog />
    <SettingPopup ref="settingPopupRef" />
  </div>
</template>

<style scoped>
.app-container {
  width: 100%;
  height: 100%;
}
</style>
