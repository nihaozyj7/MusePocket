<script setup lang="ts">
const props = defineProps<{ title: string }>()
</script>

<template>
  <div class="base-setting">
    <div class="title">{{ props.title }}</div>
    <div class="content">
      <label class="sitem" for="I0L9K">
        <span style="width: 6rem; text-align: right;">保存 : </span>
        <input id="I0L9K" type="text">
        <span style="margin-left: 2rem; width: 6rem; text-align: right;">一键排版 : </span>
        <input id="I0L9K" type="text">
      </label>
    </div>
  </div>
</template>

<style scoped>
input {
  width: 100px !important;
  width: 2.2rem;
  border: 1px solid var(--border-color);
  margin: 0 .5rem;
  padding: .25rem .5rem;
  border-radius: .25rem;
  width: 10rem !important;
}
</style>
