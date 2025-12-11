<script setup lang="ts">
import { getDefaultBook } from '@shared/constants/defaults'
import type { Book } from '@shared/types'
import { getImageBase64ByID } from '@shared/utils'
import { ref, defineAsyncComponent, computed } from 'vue'
import { Popup } from '@shared/components'

const SelectCoverPopup = defineAsyncComponent(() => import('./SelectCoverPopup.vue'))

type Type = 'create' | 'edit'

const editType = ref<Type>('create')

// 计算弹窗标题
const popupTitle = computed(() => {
  return editType.value === 'edit' ? '✍️ 修改书籍信息' : '📓 新书'
})

const emit = defineEmits({
  'status:save': (book: Book) => true
})

const popupRef = ref<InstanceType<typeof Popup> | null>(null)
const selectCoverPopupRef = ref<InstanceType<typeof SelectCoverPopup> | null>(null)

const book = ref<Book>(getDefaultBook())
const coverUrl = ref<string>('')

function saveBook() {
  emit('status:save', { ...book.value })
  popupRef.value.close()
}

/** 打开封面选择器 */
function openCoverSelector() {
  selectCoverPopupRef.value?.show(book.value.coverId)
}

/** 处理封面选择 */
async function handleCoverSelected(coverId: string) {
  book.value.coverId = coverId
  // 更新封面预览
  coverUrl.value = await getImageBase64ByID(coverId)
}

/** 加载封面图片 */
async function loadCoverImage() {
  coverUrl.value = await getImageBase64ByID(book.value.coverId)
}

defineExpose({
  show: (srcBook?: Book, _editType?: Type) => {
    editType.value = _editType || 'create'

    if (editType.value === 'edit') {
      book.value = { ...srcBook }
    } else {
      book.value = getDefaultBook()
    }

    // 加载封面图片
    loadCoverImage()

    popupRef.value.show()
  },
})

</script>

<template>
  <Popup :title="popupTitle" ref="popupRef">
    <div style="width: 30rem; display: flex; align-items: center;">
      <div class="cover">
        <img :src="coverUrl" :alt="`${book.title}的封面`"></img>
        <button @click="openCoverSelector">更换封面</button>
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
        <button @click="saveBook" v-else>创建新书</button>
      </div>
    </div>
  </Popup>

  <!-- 封面选择弹窗 -->
  <SelectCoverPopup ref="selectCoverPopupRef" @select="handleCoverSelected" />
</template>

<style scoped>
.cover {
  height: 17.6rem;
  width: 11rem;
  background-color: var(--background-secondary);
  border-radius: .25rem;
  position: relative;
  overflow: hidden;
  margin: .5rem;
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
  margin-bottom: .5rem;
}

.form input {
  border-bottom: 1px solid var(--border-color);
  padding: .5rem;
  margin-bottom: 1rem;
}

.form textarea {
  border: 1px solid var(--border-color);
  line-height: 1.5rem;
  margin-top: .5rem;
  height: 9rem;
  padding: .5rem;
}

.buttons {
  display: flex;
}

.form button {
  background-color: var(--primary-dark);
  margin-top: 1rem;
  line-height: 1.9rem;
  border-radius: .25rem;
  color: var(--text-primary);
}

.form button:first-child {
  background-color: var(--secondary);
  width: 8rem;
}
</style>
