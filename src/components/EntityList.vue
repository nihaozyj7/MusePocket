<script setup lang="ts">
import { entitydb } from '@/db'
import { useEntityTypesStore } from '@/stores/EntityTypesStore'
import { useSelectedBookStore } from '@/stores/SelectedBookStore'
import type { Entity } from '@/types'
import { computed, onUpdated, ref } from 'vue'
import ContextMenu from './ContextMenu.vue'

/** 排序方式 */
const sortMethod = ['按创建时间升序⬆️', '按创建时间降序⬇️', '按更新时间升序⬆️', '按更新时间降序⬇️', '按名称升序⬆️', '按名称降序⬇️'] as const

/** 当前排序方式 */
const currentSortMethod = ref<typeof sortMethod[number] | null>(null)
/** 当前筛选的类型列表 */
const currentFilterTypes = ref<string[]>([])

/** 右键菜单 */
const entityContextMenuRef = ref<InstanceType<typeof ContextMenu> | null>(null)

/** 搜索输入框值 */
const searchValue = ref('')

/** 实体类型整合列表 */
const entityTypes = useEntityTypesStore()
/** 用户右键选中的实体 */
let selectedEntity = ref<Entity | null>(null)
/** 所有实体 */
const entitys = ref<Entity[]>([])

/** 当前书籍 */
const selectedBook = useSelectedBookStore()


/** 实体右键菜单项 */
const entityContextMenuItems = [
  {
    title: '👁️ 查看详情',
    callback() {
      console.log('查看详情')
    }
  },
  {
    title: '✏️ 编辑',
    callback() {
      console.log('编辑')
    }
  },
  {
    title: '🗑️ 删除',
    callback() {
      console.log('删除')
    }
  },
  {
    title: '🔧 复制为JSON',
    callback() {
      console.log('复制为JSON')
    }
  },
  {
    title: '📝 复制文本',
    callback() {
      console.log('复制文本')
    }
  }
]

/** 筛选后的实体列表 */
const filteredEntitys = computed(() => {
  let es = entitys.value

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
const filterOpen = ref(true)

onUpdated(() => {
  entitydb.getBookEntities(selectedBook.v.id).then(res => {
    entitys.value = res || []
  })
})

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
    return currentFilterTypes.value = []
  }

  if (currentFilterTypes.value.includes(text)) {
    currentFilterTypes.value = currentFilterTypes.value.filter(type => type !== text)
  } else[
    currentFilterTypes.value.push(text)
  ]
}

/** 处理实体的右键菜单事件 */
function handleEntityRightClick(e: MouseEvent) {
  const target = e.target as HTMLElement
  const entityItem = target.closest('.item') as HTMLElement

  if (!entityItem) return

  console.log(target)

  const entityId = entityItem.dataset?.id
  if (!entityId) return

  entityContextMenuRef.value?.show(e, entityContextMenuItems)
  selectedEntity.value = entitys.value.find(e => e.id === entityId)
}
</script>

<template>
  <div class="entity-list">
    <div class="filter">
      <div class="filter-title" @click="filterOpen = !filterOpen">
        <div class="current-filter-conditions">
          <span class="sort" v-if="currentSortMethod">{{ currentSortMethod }}</span>
          <span class="type" v-for="type in currentFilterTypes">{{ type }}</span>
          <span v-if="!currentSortMethod && !currentFilterTypes.length">点点击此处进行排序和筛选 ➡️</span>
        </div>
        <span v-if="filterOpen">🔼</span>
        <span v-else>🔽</span>
      </div>
      <div class="filter-panel" v-show="filterOpen">
        <div class="search">
          <input type="text" placeholder="输入关键词" v-model="searchValue" />
        </div>
        <div>
          <div class="divider-line">排序方式</div>
          <div class="sort" @click="handleSortItemClick">
            <span :class="{ selected: currentSortMethod === sortType }" v-for="sortType in sortMethod">{{ sortType }}</span>
          </div>
          <div class="divider-line">按类型筛选</div>
          <div class="by-type" @click="handleFilterItemClick">
            <span :class="{ selected: currentFilterTypes.length === 0 }">全部</span>
            <span :class="{ selected: currentFilterTypes.includes(type[0]) }" v-for="type in entityTypes.array">{{ type[0] }}</span>
          </div>
        </div>
      </div>
    </div>
    <div class="items">
      <div class="item" v-for="entity in filteredEntitys" :data-id="entity.id" @contextmenu="handleEntityRightClick">
        <h4 :title="entity.title">{{ entity.title }}</h4>
        <span :title="entity.type">{{ entity.type }}</span>
        <p>{{ entity.description }}</p>
      </div>
    </div>
    <ContextMenu ref="entityContextMenuRef" />
  </div>
</template>

<style scoped>
.entity-list {
  display: flex;
  flex-direction: column;
  padding-bottom: .25rem;
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
  margin: .25rem .5rem;
  background-color: var(--background-secondary);
  position: relative;
  border: 1px solid var(--border-color);
  border-radius: .25rem;
  cursor: pointer;
}

.item:hover {
  background-color: var(--background-tertiary);
}

.item h4 {
  font-weight: bold;
  border-bottom: 1px solid var(--border-color);
  padding: .5rem;
  color: var(--primary);
}

.item span {
  position: absolute;
  right: .3rem;
  top: .3rem;
  max-width: 6rem;
  font-size: .8rem;
  padding: .25rem .5rem;
  border-radius: .25rem;
  background-color: var(--background-tertiary);
  color: var(--danger);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item p {
  font-size: .8rem;
  margin-top: .5rem;
  padding: .25rem .5rem .25rem .5rem;
  margin-bottom: .5rem;
  color: var(--text-tertiary);
  word-wrap: break-word;
  word-break: break-all;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.filter-title {
  display: flex;
  padding: .5rem .5rem .25rem .5rem;
  margin-bottom: .25rem;
  background-color: var(--background-secondary);
  border-bottom: 1px solid var(--border-color);
  border-top: 1px solid var(--border-color);
  align-items: center;
  cursor: pointer;
}

.current-filter-conditions {
  flex: 1;
  width: 0;
  font-size: .8rem;
}

.current-filter-conditions span {
  display: inline-block;
  padding: .25rem .5rem;
  margin-right: .25rem;
  margin-bottom: .25rem;
  border-radius: .25rem;
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
  margin: .5rem;
  border-radius: .25rem;
  z-index: 2;
  border: 5px solid var(--border-color);
}

.search {
  padding: 0 .5rem;
  height: 2.5rem;
  display: flex;
  align-items: center;
}

.search input {
  flex: 1;
  width: 0;
}

.search button {
  padding: .25rem .5rem;
  font-size: 1rem;
  background-color: var(--background-tertiary);
  border-radius: .25rem;
}

.divider-line {
  font-size: .8rem;
  background-color: var(--background-tertiary);
  padding: .25rem .5rem;
}

.sort, .by-type {
  display: block;
  padding: .25rem;
}

.filter-panel span {
  display: inline-block;
  padding: .25rem .5rem;
  margin: .25rem;
  background-color: var(--background-tertiary);
  font-size: .8rem;
  cursor: pointer;
}

.filter-panel span:hover {
  color: var(--primary);
}

.filter-panel span.selected {
  color: var(--primary);
}
</style>
