<script setup lang="ts">
const props = defineProps<{ title: string }>()
</script>

<template>
  <div class="base-setting">
    <div class="title">{{ props.title }}</div>
    <div class="content">


    </div>
  </div>
</template>

<style scoped></style>
