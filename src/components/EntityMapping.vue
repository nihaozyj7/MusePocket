<script setup lang="ts">
import type { Entity, EntityMapping } from '@/types'
import { articledb, entitydb } from '@/db'
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { event_on, event_off } from '@/eventManager'

const props = defineProps<{
  entity: Entity
}>()

interface ArticleMappingInfo {
  articleId: string
  articleTitle: string
  count: number
}

const mappingInfo = ref<ArticleMappingInfo[]>([])
const isLoading = ref(true)

// 计算总的插入次数
const totalInsertCount = computed(() => {
  return mappingInfo.value.reduce((sum, item) => sum + item.count, 0)
})

// 计算出现的章节数
const chapterCount = computed(() => {
  return mappingInfo.value.length
})

onMounted(async () => {
  await loadMappings()
  // 监听映射重建完成事件
  event_on('entity-mappings-rebuilt', handleMappingsRebuilt)
})

onUnmounted(() => {
  // 组件卸载时移除事件监听
  event_off('entity-mappings-rebuilt', handleMappingsRebuilt)
})

// 处理映射重建完成事件
const handleMappingsRebuilt = async () => {
  // 重新从数据库获取最新的实体数据
  await refreshEntityData()
}

// 从数据库刷新实体数据
async function refreshEntityData() {
  try {
    const updatedEntity = await entitydb.getBookEntities(props.entity.bookId)
    const entity = updatedEntity.find(e => e.id === props.entity.id)
    if (entity) {
      // 更新 props.entity 的 mappings（通过重新加载）
      props.entity.mappings = entity.mappings
      await loadMappings()
    }
  } catch (err) {
    console.error('刷新实体数据失败:', err)
  }
}

async function loadMappings() {
  isLoading.value = true

  try {
    if (!props.entity.mappings || props.entity.mappings.length === 0) {
      mappingInfo.value = []
      return
    }

    // 获取所有涉及的文章信息
    const mappingPromises = props.entity.mappings.map(async (mapping: EntityMapping) => {
      try {
        const article = await articledb.getArticle(mapping.articleId)
        if (article) {
          return {
            articleId: mapping.articleId,
            articleTitle: article.title,
            count: mapping.count
          }
        }
        return null
      } catch (err) {
        console.error(`获取文章 ${mapping.articleId} 信息失败:`, err)
        return null
      }
    })

    const results = await Promise.all(mappingPromises)
    mappingInfo.value = results.filter(item => item !== null) as ArticleMappingInfo[]
  } catch (err) {
    console.error('加载实体映射信息失败:', err)
  } finally {
    isLoading.value = false
  }
}

defineExpose({
  loadMappings
})
</script>

<template>
  <div class="entity-mapping">
    <div class="mapping-header">
      <h5>实体引用统计</h5>
    </div>

    <div class="mapping-stats">
      <div class="stat-item">
        <span class="stat-label">出现章节:</span>
        <span class="stat-value">{{ chapterCount }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">插入次数:</span>
        <span class="stat-value">{{ totalInsertCount }}</span>
      </div>
    </div>

    <div v-if="isLoading" class="loading">
      加载中...
    </div>

    <div v-else-if="mappingInfo.length === 0" class="empty-state">
      该实体暂未在任何章节中使用
    </div>

    <div v-else class="mapping-list">
      <div class="list-header">
        <span class="header-chapter">章节</span>
        <span class="header-count">次数</span>
      </div>
      <div v-for="item in mappingInfo" :key="item.articleId" class="mapping-item">
        <span class="item-title">{{ item.articleTitle }}</span>
        <span class="item-count">{{ item.count }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.entity-mapping {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.75rem 0;
  border-top: 1px solid var(--border-color);
}

.mapping-header h5 {
  margin: 0;
  font-size: 1.1em;
  color: var(--text-primary);
}

.mapping-stats {
  display: flex;
  gap: 1.5rem;
  padding: 0.5rem 0;
  background: var(--background-tertiary);
  border-radius: 4px;
  padding: 0.5rem 0.75rem;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.stat-label {
  font-size: 0.9em;
  color: var(--text-secondary);
}

.stat-value {
  font-size: 1em;
  font-weight: bold;
  color: var(--primary);
}

.loading,
.empty-state {
  text-align: center;
  padding: 1.5rem;
  color: var(--text-tertiary);
  font-size: 0.9em;
}

.mapping-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  max-height: 200px;
  overflow-y: auto;
}

.list-header {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0.75rem;
  background: var(--background-tertiary);
  border-radius: 4px 4px 0 0;
  font-size: 0.85em;
  font-weight: bold;
  color: var(--text-secondary);
  position: sticky;
  top: 0;
  z-index: 1;
}

.header-chapter {
  flex: 1;
}

.header-count {
  width: 3rem;
  text-align: center;
}

.mapping-item {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid var(--border-color);
  transition: background-color 0.2s;
}

.mapping-item:hover {
  background-color: var(--background-tertiary);
}

.mapping-item:last-child {
  border-bottom: none;
}

.item-title {
  flex: 1;
  font-size: 0.9em;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-count {
  width: 3rem;
  text-align: center;
  font-size: 0.9em;
  color: var(--text-secondary);
  font-weight: 500;
}
</style>
