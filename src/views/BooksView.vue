<script setup lang="ts">
import { bookdb } from '@/db.ts'
import router from '@/router.ts'
import { useSelectedBookStore } from '@/stores/SelectedBookStore.ts'
import { useSettingStore } from '@/stores/SettingStore.ts'
import type { Book } from '@/types.ts'
import { getImageBase64ByID } from '@/utils.ts'
import { onMounted, ref } from 'vue'
import ContextMenu from '@/components/ContextMenu.vue'
import EditBookPopup from '@/components/EditBookPopup.vue'


/** 当前是否在主页，只有主页和书籍详情页两种状态 */
const onHome = ref(true)
/** 主题状态管理器 */
const settingStore = useSettingStore()
/** 所有书籍 */
const books = ref<Book[]>([])
/** 当前用户选中的书籍 */
const selectedBookStore = useSelectedBookStore()
/** 书籍右键菜单Ref */
const bookContextMenuRef = ref<InstanceType<typeof ContextMenu> | null>(null)
/** 单击选中的书籍 */
const clickSelectedBook = ref<Book | null>(null)
/** 编辑书籍弹出层 */
const updateBookPopupRef = ref<InstanceType<typeof EditBookPopup> | null>(null)
/** 创建书籍弹出层 */
const createBookPopupRef = ref<InstanceType<typeof EditBookPopup> | null>(null)

/** 右键菜单选中的书籍 */
let rightSelectedBook: Book | null = null

/** 书籍的右键菜单功能 */
const bookContextMenuHanders = {
  open() {
    selectedBookStore.selectedBook = rightSelectedBook
    router.push('/Edit')
  },
  delete() {
    bookdb.softDeleteBook(rightSelectedBook.id).then(res => {
      if (res.success) {
        books.value = books.value.filter(book => book.id !== rightSelectedBook.id)
        if (selectedBookStore.selectedBook === rightSelectedBook) {
          clickSelectedBook.value = selectedBookStore.selectedBook = null
        }
      } else {
        console.error(`删除书籍失败, ${res.message}`)
      }
    })
  },
  edit() {
    updateBookPopupRef.value.show(rightSelectedBook, 'edit')
  },
  exportTxt() {
    console.log('右键菜单导出TXT', rightSelectedBook)
  },
  exportBackup() {
    console.log('右键菜单导出备份', rightSelectedBook)
  }
}

onMounted(async () => {
  loadBooks()
})

function bookIdEqual(book: Book) {
  return book && clickSelectedBook.value && book.id === clickSelectedBook.value.id
}

function handleBookDoubleClick(book: Book) {
  selectedBookStore.selectedBook = book
  router.push('/Edit')
}

function handleBookItemContextMenu(e: MouseEvent, book: Book) {
  e.preventDefault()

  rightSelectedBook = book

  bookContextMenuRef.value.show(e, [
    { title: '📂 打开', callback: bookContextMenuHanders.open },
    { title: '🗑️ 删除', callback: bookContextMenuHanders.delete },
    { title: '✏️ 编辑', callback: bookContextMenuHanders.edit },
    { title: '📄 导出为TXT', callback: bookContextMenuHanders.exportTxt },
    { title: '💾 下载ZIP备份', callback: bookContextMenuHanders.exportBackup },
  ])
}


function handleClickBookItem(book: Book) {
  onHome.value = false
  clickSelectedBook.value = book
}

function goHome() {
  onHome.value = true
  clickSelectedBook.value = selectedBookStore.selectedBook = null
}

function openAddBookDialog() {
  createBookPopupRef.value.show()
}

function addBook(book: Book) {
  bookdb.createBook(book).then(res => {
    if (res.success) {
      books.value.unshift(book)
    } else {
      console.error(`创建书籍失败, ${res.message}`)
    }
  })
}

function updateBook(book: Book) {
  rightSelectedBook.description = book.description
  rightSelectedBook.title = book.title
  rightSelectedBook.coverId = book.coverId

  bookdb.updateBook(rightSelectedBook).then(res => {
    if (!res.success) {
      return console.error(`更新书籍失败: ${res.message}`)
    }
  })
}

function loadBooks() {
  bookdb.getAllBooks().then(res => {
    res.sort((a, b) => b.modifiedTime - a.modifiedTime)
    books.value = res
  }).catch(err => {
    console.error(`获取书籍列表失败, ${err.message}`)
  })
}

</script>

<template>
  <div class="left-container">
    <div class="sidebar">
      <!-- 搜索栏 -->
      <div class="logo">
        灵感口袋（MusePocket）
      </div>
      <!-- 操作按钮 -->
      <div class="operations">
        <!-- 导入导出 -->
        <button class="button-m" title="导入导出">📥 导入导出</button>
        <!-- 回收站 -->
        <button class="button-m" title="回收站">🗑 回收站</button>
        <!-- 占位符 -->
        <div style="flex: 1;"></div>
        <!-- 新建书籍 -->
        <button class="button-m" title="创建新书籍" @click="openAddBookDialog">📓 新书</button>
      </div>
      <div class="bookshelf">
        <div class="scroll-container">
          <!-- 单个书籍项（示例） -->
          <div class="book-item" :class="{ 'checked': bookIdEqual(book) }" v-for="book in books" :key="book.id" @contextmenu="handleBookItemContextMenu($event, book)" @click="handleClickBookItem(book)" @dblclick="handleBookDoubleClick(book)">
            <!-- 封面占位 -->
            <div class="cover">
              <img :src="getImageBase64ByID(book.coverId)" alt="封面" class="cover-img"></img>
            </div>
            <!-- 书籍信息 -->
            <div class="bookInfo">
              <h4>{{ book.title }}</h4>
              <p>1584字 | 更新5天</p>
              <p>{{ book.description }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="right-container">
      <header class="toolbar">
        <!-- 面包屑 -->
        <div class="breadcrumb">
          <div class="flex" v-if="onHome">
            <span>〽️&nbsp;&nbsp;总览</span>
          </div>
          <div class="flex" v-else>
            <button style="padding: .5rem .1rem .5rem .5rem;" title="回到主页" @click="goHome">🔙</button>
            <span>书籍详情</span>
          </div>
        </div>
        <!-- 工具按钮 -->
        <div class="tools">
          <button @click="settingStore.setDark(!settingStore.isDark)">
            <span v-if="settingStore.isDark">🌝 切换主题</span>
            <span v-else>☀️ 切换主题</span>
          </button>
          <button style="margin-left: 1rem;">⚙️ 设置</button>
        </div>
      </header>
      <div class="bottom">
        <main>

        </main>
        <div class="stats-panel">
          <div class="vertical-text">
            总字数：<span id="wordCount">12</span>
          </div>
          <div class="vertical-text">
            今日码字：<span id="todaySWords">123456789</span>
          </div>
          <div class="vertical-text">
            七日均字：<span id="todaySWords">04564</span>
          </div>
          <div class="vertical-text">
            当月：<span id="todaySWords">123456789</span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- 书籍右键菜单 -->
  <ContextMenu ref="bookContextMenuRef" />

  <!-- 新建弹出层 -->
  <EditBookPopup ref="createBookPopupRef" @status:save="addBook" />

  <!-- 修改书籍弹出层 -->
  <EditBookPopup ref="updateBookPopupRef" @status:save="updateBook" />
</template>

<style scoped>
.left-container {
  height: 100%;
  width: 100%;
  display: flex;
  border-top: 1px solid var(--border-color);
}

.sidebar {
  display: flex;
  flex-direction: column;
  width: 18rem;
  height: 100%;
  background-color: var(--background-secondary);
  border-right: 1px solid var(--border-color);
}

.logo {
  height: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: .5rem;
  color: var(--primary);
  font-size: 1.2rem;
  font-weight: 700;
  letter-spacing: .12rem;
  border-bottom: 1px solid var(--border-color);
}

.operations {
  display: flex;
  height: 2.2rem;
  align-items: center;
  padding: 0 .25rem;
  border-bottom: 1px solid var(--border-color);
}

.operations button {
  padding: .2rem .25rem;
  border-radius: .25rem;
  background-color: var(--background-tertiary);
  margin-right: .25rem;
  font-size: .8rem;
}

.operations button:last-child {
  margin-right: 0;
}

.bookshelf {
  flex: 1;
  height: 0;
  padding: .5rem 0;
}

.book-item {
  display: flex;
  align-items: start;
  cursor: pointer;
  border-radius: .25rem;
  padding: .5rem;
  margin: 0 .25rem .25rem .25rem;
}

.book-item.checked {
  background-color: var(--background-tertiary);
}

.book-item .cover {
  height: 8rem;
  width: 5rem;
  border-radius: .25rem;
  margin-right: .5rem;
  overflow: hidden;
}

.book-item .cover img {
  height: 100%;
  width: 100%;
}

.bookInfo {
  display: flex;
  flex-direction: column;
  flex: 1;
  width: 0;
}

.book-item>div>:nth-child(1) {
  color: var(--text-primary);
  margin-top: .25rem;
}

.book-item>div>:nth-child(2) {
  font-size: .8rem;
  margin-top: .6rem;
}

.book-item>div>:nth-child(3) {
  font-size: .8rem;
  margin-top: .6rem;
  line-height: 1.4rem;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  word-break: break-all;
}

.right-container {
  flex: 1;
}

.toolbar {
  display: flex;
  height: 2.5rem;
  border-bottom: 1px solid var(--border-color);
  justify-content: space-between;
  background-color: var(--background-secondary);
}

.breadcrumb {
  height: 100%;
  display: flex;
  align-items: center;
}

.breadcrumb span {
  display: block;
  margin-left: .5rem;
  font-size: .8rem;
}

.tools {
  display: flex;
  align-items: center;
  margin-right: .5rem;
}

.tools button {
  padding: .25rem;
}

.bottom {
  display: flex;
  flex: 1;
  height: 100%;
}

main {
  flex: 1;
}

.stats-panel {
  width: 2rem;
  padding-top: 1rem;
  border-left: 1px solid var(--border-color);
  background-color: var(--background-secondary);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow-y: hidden;
}

.vertical-text {
  writing-mode: vertical-rl;
  text-orientation: sideways;
  white-space: nowrap;
  display: inline-block;
  font-size: .8rem;
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 1rem;
  margin-bottom: 1rem;
  line-height: 2rem;
  user-select: text;
}

.vertical-text:first-child {
  padding-top: 1rem;
  border-top: 1px solid var(--border-color);
}
</style>
