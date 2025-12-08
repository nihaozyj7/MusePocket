<script setup lang="ts">
import { entitydb } from '@/db'
import { useSelectedBookStore } from '@/stores/SelectedBookStore'
import type { Entity } from '@/types'
import { newlineToP } from '@/utils'
import { onMounted, onUpdated, ref } from 'vue'


const entitys = ref<Entity[]>([])
const selectedBook = useSelectedBookStore()

onUpdated(() => {
  entitydb.getBookEntities(selectedBook.v.id).then(res => {
    entitys.value = res || []
  })
})

</script>

<template>
  <div class="entity-list">
    <div class="filter">

    </div>
    <div class="item" v-for="entity in entitys">
      <h4 :title="entity.title">{{ entity.title }}</h4>
      <span :title="entity.type">{{ entity.type }}</span>
      <p>{{ entity.description }}</p>
    </div>
  </div>
</template>

<style scoped>
.entity-list {
  display: flex;
  flex-direction: column;
  padding: .25rem 0;
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
</style>
