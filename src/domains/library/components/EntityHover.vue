<script setup lang="ts">
import { $tips } from '@app/plugins'
import type { Entity } from '@shared/types'
import { ref } from 'vue'

const hoverRef = ref<HTMLElement | null>(null)

const isVisible = ref(false)

const entity = ref<Entity | null>(null)

function copy(e: Event) {
  const target = e.target as HTMLElement
  const text = target.innerText.trim()
  text && navigator.clipboard.writeText(target.innerText.trim())
  $tips.success('已复制')
}


defineExpose({
  show(ent: Entity, x?: number, y?: number) {
    entity.value = ent
    isVisible.value = true
    if (x !== undefined && y !== undefined) this.move(x, y)
  },

  move(x: number, y: number) {
    hoverRef.value.style.left = `${x}px`
    hoverRef.value.style.top = `${y}px`
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
    <div class="image" v-if="entity && entity.imgID.length > 5">
      <img :src="entity.imgID" />
    </div>
    <div class="info" v-if="entity">
      <div class="base">
        <span>{{ entity.type }}</span>
        <h5 class="title" @click="copy" title="点击复制">{{ entity.title }}</h5>
      </div>
      <div class="intro">
        <p @click="copy" title="点击复制">{{ entity.description }}</p>
      </div>
      <ul v-if="entity.attrs && entity.attrs.length > 0">
        <li v-for="attribute in entity.attrs">
          <span>{{ attribute.title }}</span>
          <span @click="copy" title="点击复制">{{ attribute.value }}</span>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
li span:first-child::after {
  content: ' :';
}

li span:first-child {
  margin-right: .25rem;
}

li span:last-child {
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
  flex: 1;
  width: 0;
  cursor: pointer;
}

li {
  display: flex;
}

ul {
  padding: .5rem .75rem;
  line-height: 1.8rem;
  flex: 1;
  height: 0;
  overflow: auto;
}

.intro p {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  cursor: pointer;
}

.intro {
  padding: .75rem;
  line-height: 1.6rem;
  border-bottom: 1px solid var(--border-color);
}

.base h5 {
  font-size: 1rem;
  color: var(--text-primary);
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
  width: 0;
  flex: 1;
  cursor: pointer;
}

.base span {
  padding: .1rem .25rem;
  background-color: var(--success);
  border-radius: .25rem;
  margin-right: .5rem;
  color: var(--text-primary);
  font-size: .8rem;
}

.base {
  display: flex;
  border-bottom: 1px solid var(--border-color);
  padding: .75rem;
  border-bottom: 1px solid var(--border-color);
}

.info>* {
  max-width: 12rem;
}

.info {
  display: flex;
  flex-direction: column;
  flex: 1;
  height: 0;
}

.entity-box {
  position: absolute;
  background-color: var(--background-secondary);
  border-radius: .25rem;
  font-size: .8rem;
  max-width: 50%;
  max-height: 300px;
  border: 1px solid var(--border-color);
  z-index: 2;
  display: flex;
  flex-direction: column;
  left: 0;
  top: 0;
}


.image {
  width: 70px;
  margin-left: .5rem;
  position: absolute;
  left: 100%;
  top: 0;
}

img {
  max-width: 100%;
  border-radius: .25rem;
  border: 1px solid var(--border-color);
  display: block;
}
</style>
