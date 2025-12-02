<script setup lang="ts">
import { bookdb } from '@/db.ts'
import router from '@/router.ts'
import { useSelectedBookStore } from '@/stores/SelectedBookStore.ts'
import { useThemeStore } from '@/stores/ThemeStore.ts'
import type { Book } from '@/types.ts'
import { setBookMenuPosition, uid } from '@/utils.ts'
import { onMounted, ref } from 'vue'

/** 当前是否在主页，只有主页和书籍详情页两种状态 */
const onHome = ref(true)
/** 主题状态管理器 */
const themeStore = useThemeStore()
/** 所有书籍 */
const books = ref<Book[]>([])
/** 当前用户选中的书籍 */
const selectedBookStore = useSelectedBookStore()
/** 书籍右键菜单Ref */
const bookContextMenuRef = ref<HTMLElement | null>(null)

/** 鼠标移出收起菜单的定时器 */
let timer: number | null = null
/** 右键菜单选中的书籍 */
let selectedBook: Book | null = null

/** 书籍的右键菜单功能 */
const bookContextMenuHanders = {
  open() {
    selectedBookStore.selectedBook = selectedBook
    router.push('/Edit')
  },
  delete() {
    console.log('右键菜单删除', selectedBook)
  },
  edit() {
    console.log('右键菜单编辑', selectedBook)
  },
  exportTxt() {
    console.log('右键菜单导出TXT', selectedBook)
  },
  exportBackup() {
    console.log('右键菜单导出备份', selectedBook)
  }
}

onMounted(async () => {
  loadBooks()
})

function handleBookDoubleClick(book: Book) {
  selectedBookStore.selectedBook = book
  router.push('/Edit')
}

function handleMouseOut() {
  clearTimeout(timer!)
  timer = setTimeout(hideBookContextMenu, 1000)
}

function handleMouseEnter() {
  clearTimeout(timer!)
}

async function handleBookItemContentMenuItenClick(e: MouseEvent) {
  hideBookContextMenu()
  const type = (e?.target as HTMLElement).dataset.type
  type && bookContextMenuHanders[type]()
}

function hideBookContextMenu() {
  bookContextMenuRef.value!.style.display = 'none'
  bookContextMenuRef.value?.removeEventListener('click', handleBookItemContentMenuItenClick)
}

function handleBookItemContextMenu(e: MouseEvent, book: Book) {
  e.preventDefault()

  selectedBook = book
  setBookMenuPosition(e, bookContextMenuRef)
  bookContextMenuRef.value?.addEventListener('click', handleBookItemContentMenuItenClick)
}


function handleClickBookItem(book: Book) {
  onHome.value = false
  selectedBookStore.selectedBook = book
}

function goHome() {
  onHome.value = true
  selectedBookStore.selectedBook = null
}

function addBook() {
  const book = {
    id: uid(),
    title: '新书',
    author: '作者',
    description: '这是一本新书，请开始你的阅读之旅！',
    coverID: 'cover-1',
    createdTime: Date.now(),
    modifiedTime: Date.now(),
    deletedTime: 0
  }
  bookdb.createBook(book).then(res => {
    if (res.success) {
      books.value.push(book)
    } else {
      console.error(`创建书籍失败, ${res.message}`)
    }
  })
}

async function loadBooks() {
  const res = await bookdb.getAllBooks()
  if (res && typeof res === 'object' && Array.isArray(res)) {
    books.value = res
  } else {
    console.error('获取书籍列表失败')
  }
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
        <!-- 新建书籍 -->
        <button class="button-m" title="创建新书籍" @click="addBook">✏️ 新书</button>
      </div>
      <div class="bookshelf">
        <div class="scroll-container">
          <!-- 单个书籍项（示例） -->
          <div class="book-item" :class="{ 'checked': selectedBookStore.isSelectedBook(book) }" v-for="book in books" :key="book.id" @contextmenu="handleBookItemContextMenu($event, book)" @click="handleClickBookItem(book)" @dblclick="handleBookDoubleClick(book)">
            <!-- 封面占位 -->
            <div class="cover">

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
          <button @click="themeStore.toggleTheme">
            <span v-if="themeStore.isDark">🌝 切换主题</span>
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
  <div class="book-context-menu" ref="bookContextMenuRef" @mouseleave="handleMouseOut" @mouseenter="handleMouseEnter">
    <div class="menu-item" data-type="open">📂 打开</div>
    <div class="menu-item" data-type="delete">🗑️ 删除</div>
    <div class="menu-item" data-type="edit">✏️ 编辑</div>
    <div class="menu-item" data-type="exportTxt">📄 导出为TXT</div>
    <div class="menu-item" data-type="exportBackup">💾 导出备份</div>
  </div>
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
  color: var(--text-secondary);
  font-size: 1.2rem;
  font-weight: 700;
  letter-spacing: .12rem;
  border-bottom: 1px solid var(--border-color);
  text-rendering: optimizeLegibility;
  -webkit-text-stroke: 1px var(--primary);
  -webkit-text-fill-color: transparent;
}

/* .search input {
  width: 100%;
  background-color: transparent;
} */

.operations {
  display: flex;
  height: 2.2rem;
  align-items: center;
  padding: 0 .25rem;
  border-bottom: 1px solid var(--border-color);
}

.operations button {
  padding: 0 .61rem;
  border-radius: .25rem;
  background-color: var(--background-tertiary);
  margin-right: .25rem;
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

.cover {
  height: 8rem;
  width: 5rem;
  border-radius: .25rem;
  margin-right: .5rem;
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

.book-context-menu {
  display: none;
  position: absolute;
  top: 10px;
  left: 1000px;
  border-radius: .25rem;
  background-color: var(--background-secondary);
  border: 1px solid var(--border-color);
}

.book-context-menu .menu-item {
  line-height: 1.6rem;
  padding: .25rem .5rem;
  width: 100%;
  cursor: pointer;
  font-size: .8rem;
}

.book-context-menu .menu-item:hover {
  background-color: var(--background-tertiary);
}
</style>
