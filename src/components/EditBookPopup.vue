<script setup lang="ts">
import { getDefaultBook } from '@/defaultObjects.ts'
import type { Book } from '@/types.ts'
import { getImageBase64ByID } from '@/utils.ts'
import { ref } from 'vue'
import Popup from './Popup.vue'

type Type = 'create' | 'edit'

const editType = ref<Type>('create')

const emit = defineEmits({
  'status:save': (book: Book) => true
})

const popupRef = ref<InstanceType<typeof Popup> | null>(null)

const book = ref<Book>(getDefaultBook())

function saveBook() {
  emit('status:save', { ...book.value })
  popupRef.value.close()
}

defineExpose({
  show: (srcBook?: Book, _editType?: Type) => {
    editType.value = _editType || 'create'

    if (editType.value === 'edit') {
      book.value = { ...srcBook }
    } else {
      book.value = getDefaultBook()
    }
    popupRef.value.show()
  },
})

</script>

<template>
  <Popup title="📓 新书" ref="popupRef">
    <div style="width: 30rem; display: flex; align-items: center;">
      <div class="cover">
        <img :src="getImageBase64ByID(book.coverId)" :alt="`${book.title}的封面`"></img>
        <button>更换封面</button>
      </div>
      <div class="form">
        <label for="title">书名</label>
        <input type="text" id="title" placeholder="请输入书名" v-model="book.title">
        <label for="overview">简介</label>
        <textarea id="overview" placeholder="请输入书籍简介" v-model="book.description"></textarea>

        <div class="buttons" v-if="editType === 'edit'">
          <button @click="popupRef.close" style="margin-right: .5rem;">取消</button>
          <button @click="saveBook">保存修改</button>
        </div>
        <button @click="saveBook" v-else>保存修改</button>
      </div>
    </div>
  </Popup>
</template>

<style scoped>
.cover {
  height: 17.6rem;
  width: 11rem;
  background-color: var(--background-secondary);
  border-radius: .25rem;
  position: relative;
  overflow: hidden;
  /* margin: 0 2rem; */
}

.cover img {
  height: 100%;
  width: 100%;
  object-fit: cover;
  object-position: center;
  display: block;
}

.cover button {
  position: absolute;
  background-color: var(--background-tertiary);
  height: 2rem;
  width: 100%;
  bottom: 0;
  font-size: .8rem;
}

.form {
  flex: 1;
  width: 0;
  display: flex;
  flex-direction: column;
  padding-left: .5rem;
}

.form * {
  width: 100%;
}

.form label {
  font-size: .8rem;
  color: var(--text-secondary);
}

.form input {
  border-bottom: 1px solid var(--border-color);
  padding: .5rem .5rem .5rem 0;
  margin-bottom: 1rem;
}

.form textarea {
  border: 1px solid var(--border-color);
  line-height: 1.5rem;
  margin-top: .5rem;
  height: 9rem;
  padding: 0 .25rem;
}

.buttons {
  display: flex;
}

.form button {
  background-color: var(--primary-dark);
  margin-top: 1rem;
  height: 1.9rem;
  line-height: 1.9rem;
  border-radius: .25rem;
  color: var(--text-primary);
}

.form button:first-child {
  background-color: var(--secondary);
  width: 8rem;
}
</style>
