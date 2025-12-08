<script setup lang="ts">
import { entitydb } from '@/db'
import { useSelectedBookStore } from '@/stores/SelectedBookStore'
import type { Entity } from '@/types'
import { onMounted, onUpdated, ref } from 'vue'


const entitys = ref<Entity[]>([])
const selectedBook = useSelectedBookStore()

onUpdated(() => {
  entitydb.getBookEntities(selectedBook.selectedBook.id).then(res => {
    entitys.value = res || []
  })
})

</script>

<template>
  <div class="entity-list">
    <div class="item" v-for="entity in entitys">
      <h4>{{ entity.title }}</h4>
      <span>{{ entity.type }}</span>
      <p>{{ entity.description }}</p>
    </div>
  </div>
</template>

<style scoped>
.entity-list {
  display: flex;
  flex-direction: column;
}
</style>
