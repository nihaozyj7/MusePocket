<script setup lang="ts">
import { $tips } from '@/plugins/notyf'
import type { Entity } from '@/types'
import { ref } from 'vue'
import EntityHover from './EntityHover.vue'
import { useEntityStore } from '@/stores/EntitysStore'
import { entries } from 'lodash-es'

const emit = defineEmits({
  /** 选中了一个实体或者实体将要关闭, 当无可行项造成关闭时会传递null */
  close: (entity: Entity | null) => true,
})

const hoverRef = ref<HTMLElement | null>(null)

/** 实体信息层 */
const entityInfoRef = ref<InstanceType<typeof EntityHover>>()

const entityStore = useEntityStore()

const entitys = ref<Entity[]>([])

const isVisible = ref(false)

const entity = ref<Entity | null>(null)

/** 当前 item 选中索引 */
const selectedIndex = ref(-1)

function copy(e: Event) {
  const target = e.target as HTMLElement
  const text = target.innerText.trim()
  text && navigator.clipboard.writeText(target.innerText.trim())
  $tips.success('已复制')
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'ArrowUp') {
    if (selectedIndex.value > 0) selectedIndex.value--
    else if (selectedIndex.value <= 0) selectedIndex.value = entitys.value.length - 1
    e.preventDefault()
  } else if (e.key === 'ArrowDown') {
    if (selectedIndex.value < entitys.value.length - 1) selectedIndex.value++
    else if (selectedIndex.value >= entitys.value.length - 1) selectedIndex.value = 0
    e.preventDefault()
  } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
    entitys.value = []
    hide()
  } else if (e.key === 'Tab') {
    hide(entitys.value[selectedIndex.value])
    e.preventDefault()
  }
}

function show(x?: number, y?: number) {
  if (!entityStore.v || entityStore.v.length === 0 || x === undefined || y === undefined) return

  isVisible.value = true

  move(x + 10, y)

  document.addEventListener('keydown', onKeydown)
  document.addEventListener('click', () => hide())
  entitys.value = entityStore.v
  selectedIndex.value = 0
}

function move(x: number, y: number) {
  hoverRef.value.style.left = `${x + 10}px`
  hoverRef.value.style.top = `${y}px`
}

function update(chars: string) {
  console.log(`筛选条件: ${chars}`)

  if (chars === '') {
    entitys.value = entityStore.v
  } else {
    entitys.value = entityStore.v.filter(entity => entity.title.includes(chars))
    console.log('筛选结果', entitys.value)
  }

  if (entitys.value.length === 0) hide()
}

function hide(ent?: Entity) {
  isVisible.value = false
  entity.value = null
  selectedIndex.value = -1
  entitys.value = []
  emit('close', ent || null)
  document.removeEventListener('keydown', onKeydown)
}

defineExpose({ show, move, update, hide })

</script>

<template>
  <!-- 展示实体信息 -->
  <div class="entity-box" ref="hoverRef" v-show="isVisible">
    <div class="item" :class="{ selected: selectedIndex === index }" @click="hide(entity)" v-for="entity, index in entitys" :key="entity.id">
      <span>{{ entity.type }}</span>
      <h5>{{ entity.title }}</h5>
    </div>
    <!-- 用户输入时的实体信息悬浮窗 -->
    <EntityHover ref="entityInfoRef" />
  </div>
</template>

<style scoped>
.entity-box {
  position: absolute;
  background-color: var(--background-secondary);
  border-radius: .25rem;
  font-size: .8rem;
  max-width: 200px;
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid var(--border-color);
  z-index: 2;
  display: flex;
  flex-direction: column;
  left: 0;
  top: 0;
  overflow-y: auto;
}

.item {
  padding: .5rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
  display: flex;
}

.item span {
  color: var(--text-secondary);
  background-color: var();
  color: var(--danger);
  width: 0.8rem;
  overflow: hidden;
  margin-right: .5rem;
}

.item h4 {
  flex: 1;
  width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.selected {
  background-color: var(--background-tertiary);
}

.item:hover {
  background-color: var(--background-tertiary);
}
</style>
