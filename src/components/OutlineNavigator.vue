<script setup lang="ts">
import { ref, watch } from 'vue'
import type { OutlineItem } from '@/types'
import { uid } from '@/utils'

interface Props {
  /** 文章ID */
  articleId: string
}

const props = defineProps<Props>()

/** 大纲列表 */
const outline = ref<OutlineItem[]>([])
/** 当前正在编辑的大纲项 */
const editingItem = ref<OutlineItem | null>(null)
/** 新增大纲项的输入框 */
const newItemText = ref('')
/** 新增大纲项的级别 */
const newItemLevel = ref(1)

/** 监听文章ID变化,清空大纲 */
watch(() => props.articleId, () => {
  // 可以从本地存储加载该文章的大纲
  loadOutline()
})

/** 加载大纲(可以扩展为从数据库加载) */
function loadOutline() {
  const saved = localStorage.getItem(`outline_${props.articleId}`)
  if (saved) {
    outline.value = JSON.parse(saved)
  } else {
    outline.value = []
  }
}

/** 保存大纲到本地存储 */
function saveOutline() {
  localStorage.setItem(`outline_${props.articleId}`, JSON.stringify(outline.value))
}

/** 添加大纲项 */
function addOutlineItem() {
  if (!newItemText.value.trim()) return

  const newItem: OutlineItem = {
    text: newItemText.value.trim(),
    level: newItemLevel.value,
    position: outline.value.length,
    children: []
  }

  outline.value.push(newItem)
  newItemText.value = ''
  saveOutline()
}

/** 删除大纲项 */
function deleteItem(index: number) {
  outline.value.splice(index, 1)
  // 更新position
  outline.value.forEach((item, idx) => {
    item.position = idx
  })
  saveOutline()
}

/** 开始编辑大纲项 */
function startEdit(item: OutlineItem) {
  editingItem.value = { ...item }
}

/** 保存编辑 */
function saveEdit(index: number) {
  if (editingItem.value) {
    outline.value[index] = { ...editingItem.value }
    editingItem.value = null
    saveOutline()
  }
}

/** 取消编辑 */
function cancelEdit() {
  editingItem.value = null
}

/** 上移 */
function moveUp(index: number) {
  if (index > 0) {
    const temp = outline.value[index]
    outline.value[index] = outline.value[index - 1]
    outline.value[index - 1] = temp
    // 更新position
    outline.value.forEach((item, idx) => {
      item.position = idx
    })
    saveOutline()
  }
}

/** 下移 */
function moveDown(index: number) {
  if (index < outline.value.length - 1) {
    const temp = outline.value[index]
    outline.value[index] = outline.value[index + 1]
    outline.value[index + 1] = temp
    // 更新position
    outline.value.forEach((item, idx) => {
      item.position = idx
    })
    saveOutline()
  }
}

/** 升级(减小level) */
function promoteLevel(index: number) {
  if (outline.value[index].level > 1) {
    outline.value[index].level--
    saveOutline()
  }
}

/** 降级(增大level) */
function demoteLevel(index: number) {
  if (outline.value[index].level < 6) {
    outline.value[index].level++
    saveOutline()
  }
}

/** 插入到编辑器 */
function insertToEditor(item: OutlineItem) {
  const markdown = '#'.repeat(item.level) + ' ' + item.text
  emit('insert', markdown)
}

/** 插入全部大纲到编辑器 */
function insertAllToEditor() {
  const markdown = outline.value.map(item => {
    return '#'.repeat(item.level) + ' ' + item.text
  }).join('\n\n')
  emit('insert', markdown)
}

/** 获取缩进样式 */
function getIndentStyle(level: number) {
  return {
    paddingLeft: `${(level - 1) * 1}rem`
  }
}

const emit = defineEmits<{
  insert: [markdown: string]
}>()

// 初始加载
loadOutline()
</script>

<template>
  <div class="outline-navigator">
    <div class="header">
      <h3>📋 大纲</h3>
    </div>

    <!-- 添加新大纲项 -->
    <div class="add-section">
      <div class="input-group">
        <select v-model="newItemLevel" class="level-select">
          <option :value="1">H1</option>
          <option :value="2">H2</option>
          <option :value="3">H3</option>
          <option :value="4">H4</option>
          <option :value="5">H5</option>
          <option :value="6">H6</option>
        </select>
        <input v-model="newItemText" @keyup.enter="addOutlineItem" placeholder="输入标题后按 Enter" class="title-input" />
        <button @click="addOutlineItem" class="btn-add">➕</button>
      </div>
    </div>

    <div v-if="outline.length === 0" class="empty-state">
      暂无大纲，开始添加你的标题
    </div>

    <div v-else class="outline-list">
      <div v-for="(item, index) in outline" :key="index" class="outline-item" :style="getIndentStyle(item.level)">
        <template v-if="editingItem && editingItem.position === item.position">
          <div class="edit-mode">
            <select v-model="editingItem.level" class="level-select-small">
              <option :value="1">H1</option>
              <option :value="2">H2</option>
              <option :value="3">H3</option>
              <option :value="4">H4</option>
              <option :value="5">H5</option>
              <option :value="6">H6</option>
            </select>
            <input v-model="editingItem.text" @keyup.enter="saveEdit(index)" @keyup.esc="cancelEdit" class="edit-input" />
            <button @click="saveEdit(index)" class="btn-icon">✔️</button>
            <button @click="cancelEdit" class="btn-icon">❌</button>
          </div>
        </template>

        <template v-else>
          <div class="view-mode">
            <span class="level-indicator">{{ 'H' + item.level }}</span>
            <span class="item-text" @dblclick="startEdit(item)">{{ item.text }}</span>

            <div class="item-actions">
              <button @click="insertToEditor(item)" class="btn-icon" title="插入到编辑器">📝</button>
              <button @click="moveUp(index)" :disabled="index === 0" class="btn-icon" title="上移">⬆️</button>
              <button @click="moveDown(index)" :disabled="index === outline.length - 1" class="btn-icon" title="下移">⬇️</button>
              <button @click="promoteLevel(index)" :disabled="item.level === 1" class="btn-icon" title="升级">⬅️</button>
              <button @click="demoteLevel(index)" :disabled="item.level === 6" class="btn-icon" title="降级">➡️</button>
              <button @click="deleteItem(index)" class="btn-icon btn-delete" title="删除">🗑️</button>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- 底部操作栏 -->
    <div v-if="outline.length > 0" class="footer">
      <button @click="insertAllToEditor" class="btn-insert-all">
        📝 插入全部大纲到编辑器
      </button>
    </div>
  </div>
</template>

<style scoped>
.outline-navigator {
  display: flex;
  flex: 1;
  width: 0;
  flex-direction: column;
  height: 100%;
  background-color: var(--background-primary);
}

.header {
  padding: 1rem;
  border-bottom: 1px solid var(--border-color);
}

.header h3 {
  margin: 0;
  color: var(--text-primary);
}

.add-section {
  padding: 1rem;
  border-bottom: 1px solid var(--border-color);
  background-color: var(--background-secondary);
}

.input-group {
  display: flex;
  gap: 0.5rem;
}

.level-select {
  padding: 0.5rem;
  border: 1px solid var(--border-color);
  border-radius: 0.25rem;
  background-color: var(--background-primary);
  color: var(--text-primary);
  font-size: 0.85rem;
  cursor: pointer;
}

.level-select-small {
  padding: 0.25rem 0.5rem;
  border: 1px solid var(--border-color);
  border-radius: 0.25rem;
  background-color: var(--background-primary);
  color: var(--text-primary);
  font-size: 0.75rem;
}

.title-input {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid var(--border-color);
  border-radius: 0.25rem;
  background-color: var(--background-primary);
  color: var(--text-primary);
  font-size: 0.9rem;
}

.btn-add {
  padding: 0.5rem 1rem;
  background-color: var(--primary);
  color: white;
  border: none;
  border-radius: 0.25rem;
  cursor: pointer;
  font-size: 0.9rem;
}

.btn-add:hover {
  background-color: var(--primary-dark);
}

.empty-state {
  text-align: center;
  padding: 2rem;
  color: var(--text-tertiary);
}

.outline-list {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem 0;
}

.outline-item {
  padding: 0.5rem 1rem;
  border-bottom: 1px solid var(--border-color);
}

.view-mode {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.edit-mode {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.edit-input {
  flex: 1;
  padding: 0.25rem 0.5rem;
  border: 1px solid var(--primary);
  border-radius: 0.25rem;
  background-color: var(--background-primary);
  color: var(--text-primary);
  font-size: 0.85rem;
}

.level-indicator {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 2rem;
  height: 1.5rem;
  padding: 0 0.5rem;
  font-size: 0.7rem;
  font-weight: bold;
  color: var(--primary);
  background-color: var(--background-secondary);
  border-radius: 0.25rem;
}

.item-text {
  flex: 1;
  color: var(--text-primary);
  font-size: 0.9rem;
  cursor: text;
}

.item-actions {
  display: flex;
  gap: 0.25rem;
  opacity: 0.6;
  transition: opacity 0.2s;
}

.outline-item:hover .item-actions {
  opacity: 1;
}

.btn-icon {
  padding: 0.25rem 0.5rem;
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 0.85rem;
  border-radius: 0.25rem;
  transition: background-color 0.2s;
}

.btn-icon:hover {
  background-color: var(--background-tertiary);
}

.btn-icon:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.btn-delete:hover {
  background-color: #ff4444;
}

.footer {
  padding: 1rem;
  border-top: 1px solid var(--border-color);
  background-color: var(--background-secondary);
}

.btn-insert-all {
  width: 100%;
  padding: 0.75rem;
  background-color: var(--primary);
  color: white;
  border: none;
  border-radius: 0.25rem;
  cursor: pointer;
  font-size: 0.9rem;
}

.btn-insert-all:hover {
  background-color: var(--primary-dark);
}

/* 滚动条样式 */
.outline-list::-webkit-scrollbar {
  width: 6px;
}

.outline-list::-webkit-scrollbar-track {
  background: var(--background-secondary);
}

.outline-list::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 3px;
}

.outline-list::-webkit-scrollbar-thumb:hover {
  background: var(--text-tertiary);
}
</style>
