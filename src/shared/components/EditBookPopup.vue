<script setup lang="ts">
import { getDefaultBook } from '@shared/constants/defaults'
import type { Book } from '@shared/types'
import { getImageByID } from '@shared/utils'
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
  coverUrl.value = await getImageByID(coverId)
}

/** 加载封面图片 */
async function loadCoverImage() {
  coverUrl.value = await getImageByID(book.value.coverId)
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
    <div class="w-[30rem] flex items-center">
      <div class="cover h-[17.6rem] w-[11rem] bg-secondary rounded relative overflow-hidden m-2">
        <img :src="coverUrl" :alt="`${book.title}的封面`" class="h-full w-full object-cover object-center block"></img>
        <button class="absolute bg-tertiary w-full bottom-0 text-[0.8rem]" @click="openCoverSelector">更换封面</button>
      </div>
      <div class="form flex-1 w-0 flex flex-col pl-2">
        <label for="title" class="text-[0.8rem] text-secondary mb-2">书名</label>
        <input type="text" id="title" placeholder="请输入书名" v-model="book.title" class="w-full border-b border-color p-2 mb-4">
        <label for="overview" class="text-[0.8rem] text-secondary mb-2">简介</label>
        <textarea id="overview" placeholder="请输入书籍简介" v-model="book.description" class="w-full border border-color leading-[1.5rem] mt-2 h-[9rem] p-2"></textarea>

        <div class="buttons flex" v-if="editType === 'edit'">
          <button @click="popupRef.close" class="mr-2 bg-secondary w-[8rem]">取消</button>
          <button @click="saveBook" class="bg-primary-dark mt-4 leading-[1.9rem] rounded text-primary">保存修改</button>
        </div>
        <button @click="saveBook" v-else class="bg-primary-dark mt-4 leading-[1.9rem] rounded text-primary">创建新书</button>
      </div>
    </div>
  </Popup>

  <!-- 封面选择弹窗 -->
  <SelectCoverPopup ref="selectCoverPopupRef" @select="handleCoverSelected" />
</template>
