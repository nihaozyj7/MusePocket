<script setup lang="ts">
import { entitydb } from '@shared/db'
import { useEntityTypesStore } from '@domains/library/stores/entity-types.store'
import { useSelectedBookStore } from '@domains/library/stores/selected-book.store'
import type { Entity } from '@shared/types'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { ContextMenu, Popup } from '@shared/components'
import { $tips } from '@app/plugins'
import EntityCreate from './EntityCreate.vue'
import { event_off, event_on, event_emit } from '@shared/utils/event-bus'
import EntityDetail from './EntityDetail.vue'
import { useEntityStore } from '@domains/library/stores/entities.store'

/** 排序方式 */
const sortMethod = ['按创建时间升序⬆️', '按创建时间降序⬇️', '按更新时间升序⬆️', '按更新时间降序⬇️', '按名称升序⬆️', '按名称降序⬇️'] as const

/** 当前排序方式 */
const currentSortMethod = ref<typeof sortMethod[number] | null>(null)
/** 当前筛选的类型列表 */
const currentFilterTypes = ref<string[]>([])

/** 右键菜单 */
const entityContextMenuRef = ref<InstanceType<typeof ContextMenu> | null>(null)
/** 编辑弹出层 */
const editEntityPopupRef = ref<InstanceType<typeof Popup> | null>(null)
/** 实体详情弹出层 */
const showEntityPopupRef = ref<InstanceType<typeof Popup> | null>(null)

/** 搜索输入框值 */
const searchValue = ref('')

/** 实体类型整合列表 */
const entityTypes = useEntityTypesStore()
/** 用户右键选中的实体 */
let selectedEntity = ref<Entity | null>(null)
/** 所有实体 */
const entityStore = useEntityStore()

/** 当前书籍 */
const selectedBook = useSelectedBookStore()

const processEntityCreateEvent = (entity: Entity) => {
  entityStore.v.push(entity)
}

onMounted(() => {
  entitydb.getBookEntities(selectedBook.v.id).then(res => {
    entityStore.v = res || []
  }).catch(err => {
    $tips.error('实体获取失败：' + err.message)
  })
  event_on('entity-create-success', processEntityCreateEvent)
})

onUnmounted(() => {
  event_off('entity-create-success', processEntityCreateEvent)
})

/** 实体右键菜单项 */
const entityContextMenuItems = [
  {
    title: '👁️ 查看详情',
    callback() {
      showEntityPopupRef.value?.show()
    }
  },
  {
    title: '✏️ 编辑',
    callback() {
      editEntityPopupRef.value?.show()
    }
  },
  {
    title: '🗑️ 删除',
    callback() {
      entitydb.deleteEntity(selectedEntity.value?.id).then(res => {
        if (res.success) {
          entityTypes.remove(selectedEntity.value?.type)
          $tips.success('删除成功')
          entityStore.v = entityStore.v.filter(en => en.id !== selectedEntity.value?.id)
        } else {
          $tips.error('删除失败：' + res.message)
        }
      })
    }
  }
]

/** 筛选后的实体列表 */
const filteredEntitys = computed(() => {
  let es = entityStore.v

  if (currentFilterTypes.value.length) {
    es = es.filter(e => currentFilterTypes.value.includes(e.type))
  }

  if (currentSortMethod.value === sortMethod[0]) {
    es.sort((a, b) => a.createdTime - b.createdTime)
  } else if (currentSortMethod.value === sortMethod[1]) {
    es.sort((a, b) => b.createdTime - a.createdTime)
  } else if (currentSortMethod.value === sortMethod[2]) {
    es.sort((a, b) => a.modifiedTime - b.modifiedTime)
  } else if (currentSortMethod.value === sortMethod[3]) {
    es.sort((a, b) => b.modifiedTime - a.modifiedTime)
  } else if (currentSortMethod.value === sortMethod[4]) {
    es.sort((a, b) => a.title.localeCompare(b.title))
  } else if (currentSortMethod.value === sortMethod[5]) {
    es.sort((a, b) => b.title.localeCompare(a.title))
  }

  if (searchValue.value.trim()) {
    es = es.filter(e => (e.title + e.description).includes(searchValue.value))
  }

  return es
})

/** 筛选面板是否已打开 */
const filterOpen = ref(false)

/** 处理排序项目的单击事件 */
function handleSortItemClick(e: MouseEvent) {
  const target = e.target as HTMLElement
  const text = target.innerText
  if (!text) return

  if (!sortMethod.includes(text as typeof sortMethod[number])) return

  if (currentSortMethod.value === text) {
    currentSortMethod.value = null
  } else {
    currentSortMethod.value = text as typeof sortMethod[number]
  }
}

/** 处理筛选项目的单击事件 */
function handleFilterItemClick(e: MouseEvent) {
  const target = e.target as HTMLElement
  const text = target.innerText
  if (!text || target.tagName !== 'SPAN') return

  if (text === '全部') {
    currentFilterTypes.value = []
    return
  }

  if (currentFilterTypes.value.includes(text)) {
    currentFilterTypes.value = currentFilterTypes.value.filter(type => type !== text)
  } else {
    currentFilterTypes.value.push(text)
  }
}

/** 处理实体的右键菜单事件 */
function handleEntityRightClick(e: MouseEvent) {
  const target = e.target as HTMLElement
  const entityItem = target.closest('.item') as HTMLElement

  if (!entityItem) return

  const entityId = entityItem.dataset?.id
  if (!entityId) return

  selectedEntity.value = entityStore.v.find(en => en.id === entityId)

  entityContextMenuRef.value?.show(e, entityContextMenuItems)
}

/** 处理用户提交编辑的事件 */
function handleEntityUpdate(entity: Entity) {
  if (entity.type !== selectedEntity.value?.type) {
    entityTypes.remove(selectedEntity.value?.type)
    entityTypes.add(entity.type)
  }

  // 记录标题是否发生变化
  const titleChanged = selectedEntity.value.title !== entity.title
  const oldEntityId = selectedEntity.value.id

  selectedEntity.value.title = entity.title
  selectedEntity.value.description = entity.description
  selectedEntity.value.imgID = entity.imgID
  selectedEntity.value.type = entity.type
  selectedEntity.value.attrs = entity.attrs
  selectedEntity.value.modifiedTime = Date.now()

  entitydb.updateEntity(selectedEntity.value).then(res => {
    if (res.success) {
      $tips.success('更新成功')
      // 如果标题发生变化，触发事件通知编辑器更新
      if (titleChanged) {
        event_emit('entity-title-updated', oldEntityId, entity.title)
      }
    } else {
      $tips.error('更新失败：' + res.message)
    }
    editEntityPopupRef.value?.close()
  })
}

/** item项被点击时 */
function handleItemClick(entity: Entity) {
  selectedEntity.value = entity
  entityContextMenuItems[0].callback()
}

</script>

<template>
<div class="entity-list">
  <div class="filter">
    <div class="filter-title" @click="filterOpen = !filterOpen">
      <div class="current-filter-conditions">
        <span class="sort" v-if="currentSortMethod">{{ currentSortMethod }}</span>
        <span class="type" v-for="type in currentFilterTypes">{{ type }}</span>
        <span v-if="!currentSortMethod && !currentFilterTypes.length">点此处排序和筛选 😀</span>
      </div>
      <span v-if="filterOpen">🔼</span>
      <span v-else>🔽</span>
    </div>
    <div class="filter-panel" v-show="filterOpen">
      <div class="search">
        <input type="text" placeholder="输入关键词" v-model="searchValue" />
      </div>
      <div>
        <div class="divider">排序方式</div>
        <div class="sort" @click="handleSortItemClick">
          <span :class="{ selected: currentSortMethod === sortType }" v-for="sortType in sortMethod">{{ sortType }}</span>
        </div>
        <div class="divider">按类型筛选</div>
        <div class="by-type" @click="handleFilterItemClick">
          <span :class="{ selected: currentFilterTypes.length === 0 }">全部</span>
          <span :class="{ selected: currentFilterTypes.includes(type[0]) }" v-for="type in entityTypes.array">{{ type[0] }}</span>
        </div>
      </div>
    </div>
  </div>
  <div class="items">
    <div class="item" :key="entity.id" v-for="entity in filteredEntitys" :data-id="entity.id" @contextmenu="handleEntityRightClick" @click="handleItemClick(entity)">
      <h4 :title="entity.title">{{ entity.title }}</h4>
      <span :title="entity.type">{{ entity.type }}</span>
      <p>{{ entity.description }}</p>
    </div>
  </div>
  <ContextMenu ref="entityContextMenuRef" />
  <!-- 实体编辑 -->
  <Popup ref="editEntityPopupRef" v-if="selectedEntity" mask title="✍️ 编辑属性">
    <div style="width: 30rem;max-height: 60rem !important; overflow-y: auto;">
      <EntityCreate isUpdateMode :entity="selectedEntity" @submit="handleEntityUpdate" :key="selectedEntity.id" />
    </div>
  </Popup>
  <!-- 实体详情 -->
  <Popup ref="showEntityPopupRef" mask mask-closable title="👀 实体详情">
    <EntityDetail :key="selectedEntity.id" :entity="selectedEntity" v-if="selectedEntity" />
  </Popup>
</div>
</template>

<style scoped>
.entity-list {
  display: flex;
  flex-direction: column;
  padding-bottom: 0.5rem;
  overflow-y: auto;
}
.items {
  display: flex;
  flex-direction: column;
  flex: 1;
  height: 0;
  overflow-y: auto;
}
.item {
  margin: 0.5rem;
  background-color: var(--background-secondary);
  position: relative;
  border: 1px solid var(--border-color);
  border-radius: 0.25rem;
  cursor: pointer;
  transition: all 0.2s;
}
.item:hover {
  background-color: var(--background-tertiary);
  border-color: var(--primary);
}
.item h4 {
  font-weight: bold;
  border-bottom: 1px solid var(--border-color);
  padding: 0.5rem;
  color: var(--primary);
}
.item span {
  position: absolute;
  right: 0.5rem;
  top: 0.5rem;
  max-width: 6rem;
  font-size: 0.85rem;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  background-color: var(--background-tertiary);
  color: var(--danger);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.item p {
  font-size: 0.85rem;
  margin-top: 0.5rem;
  padding: 0.25rem 0.5rem;
  margin-bottom: 0.5rem;
  color: var(--text-tertiary);
  word-wrap: break-word;
  word-break: break-all;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.filter-title {
  display: flex;
  padding: 0.5rem;
  margin-bottom: 0.5rem;
  background-color: var(--background-secondary);
  border-bottom: 1px solid var(--border-color);
  border-top: 1px solid var(--border-color);
  align-items: center;
  cursor: pointer;
}
.current-filter-conditions {
  flex: 1;
  width: 0;
  font-size: 0.85rem;
  margin-bottom: -.5rem
}
.current-filter-conditions span {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  margin-right: 0.5rem;
  margin-bottom: 0.5rem;
  border-radius: 0.25rem;
  background-color: var(--background-tertiary);
}
.current-filter-conditions .sort {
  color: var(--info);
}
.current-filter-conditions .type {
  color: var(--danger);
}
.filter-panel {
  display: flex;
  flex-direction: column;
  background-color: var(--background-secondary);
  border: 5px solid var(--border-color);
  margin: 0.5rem;
  border-radius: 0.25rem;
  z-index: 2;
}
.search {
  padding: 0.5rem;
  height: 2.5rem;
  display: flex;
  align-items: center;
}
.search input {
  flex: 1;
  width: 0;
  border: none;
}
.search button {
  padding: 0.25rem 0.5rem;
  font-size: 1rem;
  background-color: var(--background-tertiary);
  border-radius: 0.25rem;
}
.sort, .by-type {
  display: block;
  padding: 0.5rem;
}
.filter-panel span {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  margin: 0.25rem;
  background-color: var(--background-tertiary);
  font-size: 0.85rem;
  cursor: pointer;
  border-radius: 0.25rem;
  transition: all 0.2s;
  border: 1px solid transparent;
}
.filter-panel span:hover {
  color: white;
  background-color: var(--primary);
  border-color: var(--primary);
}
.filter-panel span.selected {
  color: white;
  background-color: var(--primary);
  border-color: var(--primary);
}
</style>
