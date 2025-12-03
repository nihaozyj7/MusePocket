<script setup lang="ts">
import { articledb, bookdb } from '@/db.ts'
import router from '@/router.ts'
import { useSelectedArticleStore } from '@/stores/SelectedArticleStore.ts'
import { useSelectedBookStore } from '@/stores/SelectedBookStore.ts'
import type { Article, Book } from '@/types.ts'
import { getNewChapterName, uid } from '@/utils.ts'
import { onMounted, ref } from 'vue'

/** 文章列表 */
const articles = ref<Article[]>([])
/** 当前文章 */
const selectedArticleStore = useSelectedArticleStore()
/** 当前书籍 */
const selectedBookStore = useSelectedBookStore()

onMounted(() => {
  loadArticles()
})

function creatreArticle() {
  const newArticle = {
    bookId: selectedBookStore.selectedBook!.id,
    id: uid(),
    title: getNewChapterName(selectedBookStore.selectedBook!.id),
    content: '',
    createdTime: Date.now(),
    modifiedTime: Date.now(),
    deletedTime: 0
  }
  articledb.createArticle(newArticle).then(res => {
    if (res.success) {
      articles.value.push(newArticle)
    } else {
      console.error(`创建文章失败, ${res.message}`)
    }
  })
}

function loadArticles() {
  articledb.getBookArticles(selectedBookStore.selectedBook.id).then(res => {
    articles.value = res
    console.log(res)
  }).catch(err => {
    console.error(`获取文章列表失败, ${err.message}`)
  })
}

</script>

<template>
  <div class="left-container">
    <div class="sidebar">
      <!-- 搜索栏 -->
      <div class="search">搜索章节</div>
      <!-- 操作按钮 -->
      <div class="operations">
        <!-- 回到主页 -->
        <button class="button-m" title="回到主页" @click="() => router.back()">🔙 返回</button>
        <!-- 占位符 -->
        <div style="flex: 1;"></div>
        <!-- 自定义 -->
        <button class="button-m" title="自定义">🛠️ 自定义</button>
        <!-- 回收站 -->
        <button class="button-m" title="回收站">🗑 回收站</button>
        <!-- 新建书籍 -->
        <button class="button-m" title="创建新文章" @click="creatreArticle">✏️ 新文章</button>
      </div>
      <div class="articleshelf">
        <div class="scroll-container">
          <div class="article-item" v-for="article in articles" :data-article-id="article.id" :key="article.id">
            <span>📜</span>
            <h4>{{ article.title }}</h4>
            <div class="count">310</div>
          </div>
        </div>
      </div>
    </div>
    <div class="right-container">
      <header class="toolbar">
        <!-- 面包屑 -->
        <div class="breadcrumb">
          <span style="font-size: 1.2rem; display: block; margin-top: -.3rem;">📖</span>
          <button style="padding: .5rem .1rem .5rem .5rem;" title="书籍信息">斗破苍穹</button>
        </div>
        <!-- 工具按钮 -->
        <div class="tools">
          <button title="设置段落间距和字体等">🔤 段落和字体</button>
          <button title="设置背景">🎨 背景</button>
          <button title="对当前文章进行排版">✨ 一键排版</button>
          <button title="插入">📋 插入预设</button>
          <button title="查找与替换">🔍 查找替换</button>
          <div class="button-group">
            <button title="回退(Ctrl+Z)">↩️</button>
            <button title="重做(Ctrl+Y)">↪️</button>
          </div>
          <button title="章节的历史操作记录">🕒 历史</button>
          <button title="导出备份文件和从备份文件导入">💾 导入导出</button>
          <button title="软件设置">⚙️ 配置</button>
        </div>
      </header>
      <div class="bottom">
        <main>
          <div class="tu-container">
            <!-- 文字编辑区 -->
            <div class="edit"></div>
            <!-- 侧边内容区 -->
            <div class="side"></div>
          </div>
          <!-- 状态栏 -->
          <div class="statusbar"></div>
        </main>
        <div class="utils-panel vertical-text">
          <button title="" class="selected">✍️ 取名工具</button>
          <button title="">✅ 校对</button>
          <button title="">📁 实体管理</button>
          <button title="">📝 草稿</button>
          <button title="">📋 大纲</button>
          <button title="">⌨️ 快捷键</button>
        </div>
      </div>
    </div>
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

.search {
  height: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: start;
  border-bottom: 1px solid var(--border-color);
  padding-left: .5rem;
  color: var(--text-tertiary);
  font-size: .9rem;
  cursor: text;
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

.tools>button {
  margin-left: .5rem;
  background-color: var(--background-tertiary);
  padding: .25rem;
  border-radius: .25rem;
}

.button-group {
  display: flex;
  align-items: center;
  margin-left: .5rem;
  background-color: var(--background-tertiary);
  padding: .19rem .25rem;
  border-radius: .25rem;
}

.button-group button {
  font-size: 1rem;
}

.bottom {
  display: flex;
  flex: 1;
  height: 100%;
}

main {
  flex: 1;
}

.utils-panel {
  width: 2.5rem;
  padding-top: .5rem;
  border-left: 1px solid var(--border-color);
  background-color: var(--background-secondary);
  overflow-y: hidden;
}

.vertical-text {
  writing-mode: vertical-rl;
  text-orientation: sideways;
  white-space: nowrap;
  display: inline-block;
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 1rem;
  margin-bottom: 1rem;
  user-select: text;
}

.utils-panel button {
  background-color: var(--background-tertiary);
  padding: .19rem .25rem;
  border-radius: .25rem;
  margin-bottom: .5rem;
  margin-right: .35rem;
}


.utils-panel button.selected {
  background-color: var(--primary-dark);
  color: var(--text-primary);
}

.articleshelf {
  flex: 1;
  height: 0;
  padding: .25rem 0;
}

.article-item {
  display: flex;
  padding: .5rem;
}

.article-item .count {
  font-size: .6rem;
  color: var(--text-tertiary);
  display: block;
  margin-top: .25rem;
}

.article-item.selected {
  background-color: var(--background-tertiary);
}

.article-item.selected h4 {
  color: var(--primary);
}

.article-item span {
  width: 2rem;
}

.article-item h4 {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: .8rem;
  cursor: pointer;
  flex: 1;
}
</style>
