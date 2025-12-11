<script setup lang="ts">
import { onMounted, ref } from 'vue'
import EntityCreate from './EntityCreate.vue'
import EntityAiExtract from './EntityAiExtract.vue'
import EntityImportExport from './EntityImportExport.vue'
import EntityList from './EntityList.vue'
import { useEntityTypesStore } from '@/stores/EntityTypesStore'
import { useSelectedBookStore } from '@/stores/SelectedBookStore'

const titles = ['查看', '导入导出', '提取&合并', '新建'] as const

const selectedTitle = ref<typeof titles[number]>('查看')

onMounted(() => {
  // 初始化类型
  useEntityTypesStore().init(useSelectedBookStore().v.id)
})

function handleHeaderButtonClick(e: MouseEvent) {
  selectedTitle.value = (e.target as HTMLElement).innerText as typeof titles[number]
}

</script>

<template>
  <div class="container">
    <header>
      <h4>实体管理</h4>
      <div class="buttons">
        <button @click="handleHeaderButtonClick" :class="{ selected: selectedTitle === title }" v-for="title in titles">{{ title }}</button>
      </div>
    </header>
    <!-- 实体列表 -->
    <EntityList v-show="selectedTitle === titles[0]" />
    <!-- 导入导出 -->
    <EntityImportExport v-show="selectedTitle === titles[1]" />
    <!-- AI提取 -->
    <EntityAiExtract v-show="selectedTitle === titles[2]" />
    <!-- 新建实体 -->
    <EntityCreate v-show="selectedTitle === titles[3]" />
  </div>
</template>

<style scoped>
.container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  flex: 1;
  width: 0;
  background-color: var(--background-secondary);
}

.container>div {
  flex: 1;
  height: 0;
}

header {
  background-color: var(--background-secondary);
  width: 100%;
  height: 5rem;
  padding: 0.5rem;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  border-bottom: 1px solid var(--border-color);
}

header>h4 {
  padding: 0 0.5rem;
  margin: 0;
  color: var(--text-primary);
}

.buttons {
  display: flex;
  justify-content: space-between;
  background-color: var(--background-tertiary);
  height: 2.2rem;
  border-radius: 0.25rem;
  overflow: hidden;
}

.buttons button {
  flex: 1;
  margin: 0;
  padding: 0.25rem 0.5rem;
  border-right: 1px solid var(--border-color);
  border-radius: 0;
}

.buttons button:last-child {
  border-right: none;
}

.selected {
  border-bottom: 1px solid var(--primary);
  color: var(--primary);
}
</style>
