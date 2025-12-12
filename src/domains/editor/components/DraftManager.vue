<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { draftdb } from '@shared/db'
import type { Draft } from '@shared/types'
import { uid } from '@shared/utils'
import { $tips, $confirm } from '@app/plugins'

interface Props {
  bookId: string
}

const props = defineProps<Props>()

/** 草稿列表 */
const drafts = ref<Draft[]>([])
/** 当前选中的草稿 */
const currentDraft = ref<Draft | null>(null)
/** 是否显示编辑器 */
const showEditor = ref(false)
/** 编辑器内容 */
const editorContent = ref('')
/** 是否正在保存 */
const isSaving = ref(false)

onMounted(() => {
  loadDrafts()
})

/** 监听书籍ID变化 */
watch(() => props.bookId, () => {
  loadDrafts()
  showEditor.value = false
  currentDraft.value = null
})

/** 加载草稿列表 */
async function loadDrafts() {
  drafts.value = await draftdb.getBookDrafts(props.bookId)
}

/** 创建新草稿 */
function createDraft() {
  const now = Date.now()
  currentDraft.value = {
    id: uid(),
    bookId: props.bookId,
    title: `草稿 ${new Date().toLocaleString()}`,
    content: '',
    isAutoSave: false,
    createdTime: now,
    modifiedTime: now,
    deletedTime: 0
  }
  editorContent.value = ''
  showEditor.value = true
}

/** 打开草稿 */
function openDraft(draft: Draft) {
  currentDraft.value = { ...draft }
  editorContent.value = draft.content
  showEditor.value = true
}

/** 保存草稿 */
async function saveDraft() {
  if (!currentDraft.value) return

  isSaving.value = true
  currentDraft.value.content = editorContent.value
  currentDraft.value.modifiedTime = Date.now()

  const isNew = !drafts.value.find(d => d.id === currentDraft.value!.id)

  const result = isNew
    ? await draftdb.createDraft(currentDraft.value)
    : await draftdb.updateDraft(currentDraft.value)

  if (result.success) {
    $tips.success('草稿保存成功')
    await loadDrafts()
  } else {
    $tips.error(`保存失败: ${result.message}`)
  }

  isSaving.value = false
}

/** 删除草稿 */
async function deleteDraft(draft: Draft) {
  const confirmed = await $confirm(`确定要删除草稿"${draft.title}"吗？`, '删除草稿')
  if (!confirmed) return

  const result = await draftdb.deleteDraft(draft.id)
  if (result.success) {
    $tips.success('草稿已删除')
    await loadDrafts()

    if (currentDraft.value?.id === draft.id) {
      showEditor.value = false
      currentDraft.value = null
    }
  } else {
    $tips.error(`删除失败: ${result.message}`)
  }
}

/** 关闭编辑器 */
function closeEditor() {
  showEditor.value = false
  currentDraft.value = null
}
</script>

<template>
  <div class="draft-manager">
    <div class="header">
      <h3>📝 草稿箱</h3>
      <button @click="createDraft" class="btn-create">+ 新建草稿</button>
    </div>

    <div v-if="!showEditor" class="draft-list">
      <div v-if="drafts.length === 0" class="empty-state">
        暂无草稿，点击上方按钮创建
      </div>
      <div v-for="draft in drafts" :key="draft.id" class="draft-item" @click="openDraft(draft)">
        <div class="draft-info">
          <div class="draft-title">{{ draft.title }}</div>
          <div class="draft-time">{{ new Date(draft.modifiedTime).toLocaleString() }}</div>
        </div>
        <button @click.stop="deleteDraft(draft)" class="btn-delete">🗑️</button>
      </div>
    </div>

    <div v-else class="editor-container">
      <div class="editor-header">
        <input v-model="currentDraft!.title" class="draft-title-input" placeholder="草稿标题" />
        <div class="editor-actions">
          <button @click="saveDraft" :disabled="isSaving" class="btn-save">
            {{ isSaving ? '保存中...' : '💾 保存' }}
          </button>
          <button @click="closeEditor" class="btn-close">✖️ 关闭</button>
        </div>
      </div>

      <div class="markdown-editor">
        <textarea v-model="editorContent" placeholder="开始编写你的草稿..." class="draft-textarea"></textarea>
      </div>
    </div>
  </div>
</template>

<style scoped>
.draft-manager {
  display: flex;
  flex: 1;
  width: 0;
  flex-direction: column;
  height: 100%;
  background-color: var(--background-secondary);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  border-bottom: 1px solid var(--border-color);
  background-color: var(--background-secondary);
}

.header h3 {
  margin: 0;
  color: var(--text-primary);
}

.btn-create {
  padding: 0.25rem 0.5rem;
  background-color: var(--primary);
  color: white;
  border: 1px solid var(--primary);
  border-radius: 0.25rem;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.2s;
}

.btn-create:hover {
  background-color: var(--primary-dark);
}

.draft-list {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
}

.empty-state {
  text-align: center;
  padding: 2rem;
  color: var(--text-tertiary);
}

.draft-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  margin-bottom: 0.5rem;
  background-color: var(--background-secondary);
  border-radius: 0.25rem;
  border: 1px solid var(--border-color);
  cursor: pointer;
  transition: all 0.2s;
}

.draft-item:hover {
  background-color: var(--background-tertiary);
  border-color: var(--primary);
}

.draft-info {
  flex: 1;
}

.draft-title {
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 0.25rem;
}

.draft-time {
  font-size: 0.75rem;
  color: var(--text-tertiary);
}

.btn-delete {
  padding: 0.25rem 0.5rem;
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  opacity: 0.6;
}

.btn-delete:hover {
  opacity: 1;
}

.editor-container {
  display: flex;
  flex-direction: column;
  flex: 1;
  height: 0;
}

.editor-header {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.5rem;
  border-bottom: 1px solid var(--border-color);
  background-color: var(--background-secondary);
}

.draft-title-input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid var(--border-color);
  border-radius: 0.25rem;
  background-color: var(--background-secondary);
  color: var(--text-primary);
  font-size: 1rem;
}

.editor-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-save,
.btn-close {
  padding: 0.25rem 0.5rem;
  border: 1px solid var(--border-color);
  border-radius: 0.25rem;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.2s;
}

.btn-save {
  background-color: var(--primary);
  color: white;
  border-color: var(--primary);
}

.btn-save:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-close {
  background-color: var(--background-tertiary);
  color: var(--text-primary);
}

.markdown-editor {
  flex: 1;
  overflow: hidden;
  padding: 0.5rem;
  display: flex;
  flex-direction: column;
}

.draft-textarea {
  flex: 1;
  width: 100%;
  padding: 0.5rem;
  border: 1px solid var(--border-color);
  border-radius: 0.25rem;
  background-color: var(--background-secondary);
  color: var(--text-primary);
  font-size: 0.95rem;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  line-height: 1.6;
  resize: none;
  outline: none;
}

.draft-textarea:focus {
  border-color: var(--primary);
}
</style>
