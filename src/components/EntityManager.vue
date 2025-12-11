<script setup lang="ts">
import { onMounted, ref } from 'vue'
import EntityCreate from './EntityCreate.vue'
import EntityAiExtract from './EntityAiExtract.vue'
import EntityImportExport from './EntityImportExport.vue'
import EntityList from './EntityList.vue'
import { useEntityTypesStore } from '@/stores/EntityTypesStore'
import { useSelectedBookStore } from '@/stores/SelectedBookStore'
import { EntityMappingService } from '@/entityMappingService'
import { entitydb } from '@/db'
import { useEntityStore } from '@/stores/EntitysStore'
import { $tips } from '@/plugins/notyf'

const titles = ['查看', '导入导出', '提取&合并', '新建'] as const

const selectedTitle = ref<typeof titles[number]>('查看')
const isRebuildingMappings = ref(false)
const selectedBook = useSelectedBookStore()
const entityStore = useEntityStore()

onMounted(() => {
  // 初始化类型
  useEntityTypesStore().init(useSelectedBookStore().v.id)
})

function handleHeaderButtonClick(e: MouseEvent) {
  selectedTitle.value = (e.target as HTMLElement).innerText as typeof titles[number]
}

async function rebuildMappings() {
  if (!selectedBook.v?.id) {
    $tips.error('请先选择一本书籍')
    return
  }

  isRebuildingMappings.value = true
  try {
    await EntityMappingService.rebuildMappingsForBook(selectedBook.v.id)
    // 重新加载实体数据以获取最新的映射
    const entities = await entitydb.getBookEntities(selectedBook.v.id)
    entityStore.v = entities
    $tips.success('实体映射重建完成')
  } catch (err: any) {
    $tips.error('重建映射失败：' + err.message)
    console.error(err)
  } finally {
    isRebuildingMappings.value = false
  }
}

</script>

<template>
  <div class="container">
    <header>
      <div class="title-row">
        <h4>实体管理</h4>
        <button @click="rebuildMappings" :disabled="isRebuildingMappings" class="rebuild-btn" title="扫描所有文章，重新生成实体在章节中的引用映射">
          {{ isRebuildingMappings ? '🔄 重建中...' : '🔄 重建映射' }}
        </button>
      </div>
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

.title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 0.5rem;
}

header>h4,
.title-row>h4 {
  padding: 0;
  margin: 0;
  color: var(--text-primary);
}

.rebuild-btn {
  padding: 0.25rem 0.75rem;
  font-size: 0.85rem;
  background-color: var(--info);
  color: white;
  border: none;
  border-radius: 0.25rem;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.rebuild-btn:hover:not(:disabled) {
  background-color: var(--primary);
  transform: translateY(-1px);
}

.rebuild-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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
