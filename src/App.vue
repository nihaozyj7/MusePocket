<script setup lang="ts">
import { RouterView } from 'vue-router'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { useSettingStore } from '@/stores/SettingStore'
import { onMounted } from 'vue'

const settingStore = useSettingStore()

document.addEventListener('contextmenu', e => e.preventDefault())

onMounted(() => {
  // 在应用启动时统一应用背景图片设置
  settingStore.applyBackgroundImage()
})
</script>

<template>
  <div class="app-container">
    <RouterView />
    <ConfirmDialog />
  </div>
</template>

<style scoped>
.app-container {
  width: 100%;
  height: 100%;
}
</style>
