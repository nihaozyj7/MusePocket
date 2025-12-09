<script setup lang="ts">
import { $tips } from '@/plugins/notyf'
import type { Entity } from '@/types'
import { ref } from 'vue'
import EntityHover from './EntityHover.vue'
import { useEntityStore } from '@/stores/EntitysStore'

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

function copy(e: Event) {
  const target = e.target as HTMLElement
  const text = target.innerText.trim()
  text && navigator.clipboard.writeText(target.innerText.trim())
  $tips.success('已复制')
}


defineExpose({
  show(x?: number, y?: number) {
    isVisible.value = true
    if (x !== undefined && y !== undefined) this.move(x, y)
  },

  move(x: number, y: number) {
    hoverRef.value.style.left = `${x}px`
    hoverRef.value.style.top = `${y}px`
    entitys.value = entityStore.v
  },

  update(chars: string) {
    if (chars === '') {
      entitys.value = entityStore.v
    } else {
      entitys.value = entityStore.v.filter(entity => entity.title.includes(chars))
    }
  },

  hide() {
    isVisible.value = false
    entity.value = null
  }
})

</script>

<template>
  <!-- 展示实体信息 -->
  <div class="entity-box" ref="hoverRef" v-show="isVisible">
    <div class="item" v-for="entity in entitys">{{ entity.title }}</div>
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
  padding-top: .25rem;
}

.item {
  margin: 0 .25rem .25rem .25rem;
  padding: .25rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
