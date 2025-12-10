<script setup lang="ts">
import { RouterView } from 'vue-router'
import ConfirmDialog from '@/components/ConfirmDialog.vue'

document.addEventListener('contextmenu', e => e.preventDefault())
</script>

<template>
  <RouterView />
  <ConfirmDialog />
</template>

<style scoped></style>
