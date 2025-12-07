<script setup lang="ts">
import ContextMenu from '@/components/ContextMenu.vue'
import Editor from '@/components/Editor.vue'
import { articledb, bookdb } from '@/db.ts'
import { getDefaultArticle } from '@/defaultObjects'
import { $tips } from '@/plugins/notyf'
import router from '@/router.ts'
import { useSelectedArticleStore } from '@/stores/SelectedArticleStore.ts'
import { useSelectedBookStore } from '@/stores/SelectedBookStore.ts'
import { useSettingStore } from '@/stores/SettingStore.ts'
import type { Article, ArticleBody } from '@/types.ts'
import { countNonWhitespace, exportTxt, getCleanedEditorContent, trimAndReduceNewlines } from '@/utils.ts'
import { onMounted, ref } from 'vue'

/** 文章列表 */
const articles = ref<Article[]>([])
/** 当前文章 */
const selectedArticleStore = useSelectedArticleStore()
/** 当前书籍 */
const selectedBookStore = useSelectedBookStore()
/** 当前打开的文章的内容 */
const articleBody = ref<ArticleBody | null>(null)
/** 右键菜单 */
const articleContextMenuRef = ref<InstanceType<typeof ContextMenu> | null>(null)
/** 文本编辑器 */
const editorRef = ref<InstanceType<typeof Editor> | null>(null)
/** 配置项 */
const settingStore = useSettingStore()

onMounted(() => {
  loadArticles()

  settingStore.setEditorWidthMode()
})

const contextMenuHanders = {
  edit(id: string) {
    const article = articles.value.find(article => article.id === id)
    if (!article) return $tips.error('文章不存在')
    openArticle(article)
  },
  delete(id: string) {
    articledb.softDelete(id).then(res => {
      if (!res.success) return console.error(`删除文章失败, ${res.message}`)
      $tips.success('删除成功')

      let index = articles.value.findIndex(article => article.id === id) - 1
      articles.value = articles.value.filter(article => article.id !== id)
      if (selectedArticleStore.selectedArticle.id !== id) return

      if (articles.value.length === 0) {
        creatreArticle()
      } else {
        selectedArticleStore.selectedArticle = articles.value[Math.max(0, index)]
      }
    })
  },
  exportTxt(id: string) {
    const article = articles.value.find(article => article.id === id)
    articledb.getArticleBody(id).then(res => {
      exportTxt(article?.title || '未命名', res.content || '内容未找到')
    }).catch(err => {
      $tips.error(`导出文章失败, ${err.message}`)
    })
  },
  copy(id: string) {
    navigator.clipboard.writeText(trimAndReduceNewlines(editorRef.value.getBodyText()))
    $tips.success('已复制')
  },
}

function handleArticleContextmenu(e: MouseEvent) {
  e.preventDefault()

  const articleItem = (e.target as HTMLElement).closest<HTMLElement>('.article-item')
  if (!articleItem) return
  const aid = articleItem.dataset.articleId

  articleContextMenuRef.value.show(e, [
    { title: '✏️ 编辑', callback: () => contextMenuHanders.edit(aid) },
    { title: '🗑️ 删除', callback: () => contextMenuHanders.delete(aid) },
    { title: '📄 导出为TXT', callback: () => contextMenuHanders.exportTxt(aid) },
    { title: '📋 复制到剪贴板', callback: () => contextMenuHanders.copy(aid) },
  ])
}

function handleSaveArticleTitle(title: string) {
  articledb.updateArticle(selectedArticleStore.selectedArticle).then(res => {
    if (!res.success) $tips.error(`更新标题失败, ${res.message}`)
  })
}

function saveArticle(text: string, oldText?: string) {
  articleBody.value.content = getCleanedEditorContent(editorRef.value.getBody())
  selectedArticleStore.selectedArticle.modifiedTime = Date.now()
  selectedArticleStore.selectedArticle.wordCount = countNonWhitespace(text)
  selectedBookStore.selectedBook.modifiedTime = Date.now()

  Promise.all([
    articledb.updateArticle(selectedArticleStore.selectedArticle, articleBody.value),
    bookdb.updateBook(selectedBookStore.selectedBook)
  ]).then(results => {
    if (!results.every(result => result.success)) {
      $tips.error('数据储存出现错误' + results.map(result => result.message).join('\n'))
    }
  })

  bookdb.updateBook(selectedBookStore.selectedBook)
  editorRef.value.setSaveState('已保存')
}

function handleArticleClick(e: MouseEvent) {
  const articleItem = e.target instanceof Element ? (e.target as Element).closest<HTMLElement>('.article-item') : null
  if (!articleItem) return
  const id = articleItem.dataset.articleId
  const article = articles.value.find(article => article.id === id)
  if (article) {
    saveArticle(editorRef.value.getBodyText())
    selectedArticleStore.selectedArticle = article
    openArticle(article)
  } else {
    selectedArticleStore.selectedArticle = null
  }
}

function isSelected(article: Article) {
  return selectedArticleStore.selectedArticle && selectedArticleStore.selectedArticle.id === article.id
}

function goHome() {
  selectedBookStore.selectedBook = null
  router.push({ path: '/', replace: true })
}

function openArticle(article: Article) {
  articledb.getArticleBody(article.id).then(res => {
    selectedArticleStore.selectedArticle = article
    articleBody.value = res
    editorRef.value.resetBody(res.content)
  }).catch(err => {
    $tips.error(`获取文章正文失败, ${err.message}`)
  })
}

function creatreArticle() {
  const newArticle = getDefaultArticle(selectedBookStore.selectedBook.id, articles.value)
  if (!newArticle) return $tips.error('获取默认文章失败')
  articledb.createArticle(newArticle).then(res => {
    if (res.success) {
      articles.value.push(newArticle)
      openArticle(articles.value[articles.value.length - 1])
    } else {
      $tips.error(`创建文章失败, ${res.message}`)
    }
  })
}

function loadArticles() {
  articledb.getBookArticles(selectedBookStore.selectedBook.id).then(res => {
    articles.value = res
    articles.value.sort((a, b) => a.createdTime - b.createdTime)
    // 如何存在历史打开的文章，则查找文章列表中是否存在该文章，如果存在则打开
    const article = selectedArticleStore.selectedArticle
      && articles.value.find(article => article.id === selectedArticleStore.selectedArticle.id)
    // 用户离开页面时存在打开的文章，则恢复
    if (article) openArticle(article)
    // 不存在打开的文章，则打开最后一章
    else if (res.length > 0) openArticle(articles.value[res.length - 1])
    // 不存在文章，创建新文章
    else creatreArticle()
  }).catch(err => {
    $tips.error(`获取文章列表失败, ${err.message}`)
  })
}

</script>

<template>
  <div class="container">
    <div class="sidebar">
      <!-- 搜索栏 -->
      <div class="search">搜索章节</div>
      <!-- 操作按钮 -->
      <div class="operations">
        <!-- 回到主页 -->
        <button class="button-m" title="回到主页" @click="goHome">🔙 返回</button>
        <!-- 占位符 -->
        <div style="flex: 1;"></div>
        <!-- 自定义 -->
        <button class="button-m" title="自定义">🛠️ 自定义</button>
        <!-- 回收站 -->
        <button class="button-m" title="回收站">🗑 回收站</button>
        <!-- 新建书籍 -->
        <button class="button-m" title="创建新文章" @click="creatreArticle">✏️ 新文章</button>
      </div>
      <div class="articleshelf" @click="handleArticleClick" @contextmenu="handleArticleContextmenu">
        <div class="scroll-container">
          <div class="article-item" :class="{ 'selected': isSelected(article) }" v-for="article in articles" :data-article-id="article.id" :key="article.id">
            <span>📜</span>
            <h4>{{ article.title }}</h4>
            <div class="count">{{ article.wordCount }}</div>
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
        <!-- 编辑器 -->
        <Editor :updateThrottleTime="1000" ref="editorRef" @update:article-title="handleSaveArticleTitle" @update:article-body="saveArticle" />
        <!-- 侧边工具栏 -->
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
  <!-- 右键菜单 -->
  <ContextMenu ref="articleContextMenuRef" />

  <!-- 悬浮提示 -->
  <div id="atomic-tooltip">
    1111
  </div>
</template>

<style scoped>
.container {
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
  display: flex;
  flex-direction: column;
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

.right-container .bottom {
  display: flex;
  flex: 1;
  height: 0;
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

.article-item:hover h4 {
  color: var(--primary-light);
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
