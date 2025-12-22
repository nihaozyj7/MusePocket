<script setup lang="ts">
import type { MergeGroup, UpdateSuggestion } from '../composables/useEntityMerge'

defineProps<{
  mergeSuggestions: MergeGroup[]
  updateSuggestions: UpdateSuggestion[]
  isMerging: boolean
}>()

const emit = defineEmits<{
  toggleMerge: [mergeId: string]
  toggleUpdate: [updateId: string]
  toggleAllMerges: []
  toggleAllUpdates: []
  executeMerge: []
  cancelMerge: []
}>()
</script>

<template>
<div class="merge-suggestions-list">
  <div class="merge-suggestions">
    <!-- 合并建议 -->
    <div class="suggestions-header">
      <h4>📋 合并建议 ({{mergeSuggestions.filter(m => m.selected).length}}/{{ mergeSuggestions.length }})</h4>
      <button @click="emit('toggleAllMerges')" class="btn-small">
        {{mergeSuggestions.every(m => m.selected) ? '反选' : '全选'}}
      </button>
    </div>

    <div v-for="merge in mergeSuggestions" :key="merge.id" class="merge-item" :class="{ selected: merge.selected }">
      <div class="merge-header">
        <input type="checkbox" :checked="merge.selected" @change="emit('toggleMerge', merge.id)" />
        <span class="merge-title">合并组: {{ merge.keep.title }}</span>
      </div>
      <div class="merge-content">
        <div class="entity-keep">
          <span class="label">📌 保留:</span>
          <span class="entity-name">{{ merge.keep.title }}</span>
          <span class="entity-type">{{ merge.keep.type }}</span>
        </div>
        <div class="entity-merge">
          <span class="label">🔗 合并:</span>
          <span v-for="(entity, idx) in merge.merge" :key="entity.id" class="entity-name">
            {{ entity.title }}<span v-if="idx < merge.merge.length - 1">, </span>
          </span>
        </div>
        <div class="merge-reason">
          <span class="label">💡 原因:</span>
          <span>{{ merge.reason }}</span>
        </div>
      </div>
    </div>

    <!-- 更新建议 -->
    <div v-if="updateSuggestions.length > 0" class="suggestions-header" style="margin-top: 1.5rem;">
      <h4>✨ 更新建议 ({{updateSuggestions.filter(u => u.selected).length}}/{{ updateSuggestions.length }})</h4>
      <button @click="emit('toggleAllUpdates')" class="btn-small">
        {{updateSuggestions.every(u => u.selected) ? '反选' : '全选'}}
      </button>
    </div>

    <div v-for="update in updateSuggestions" :key="update.id" class="update-item" :class="{ selected: update.selected }">
      <div class="merge-header">
        <input type="checkbox" :checked="update.selected" @change="emit('toggleUpdate', update.id)" />
        <span class="merge-title">更新: {{ update.entity.title }}</span>
      </div>
      <div class="merge-content">
        <div class="update-changes">
          <div v-if="update.updates.title && update.updates.title !== update.entity.title" class="change-item">
            <span class="label">标题:</span>
            <span class="old-value">{{ update.entity.title }}</span>
            <span class="arrow">→</span>
            <span class="new-value">{{ update.updates.title }}</span>
          </div>
          <div v-if="update.updates.description && update.updates.description !== update.entity.description" class="change-item">
            <span class="label">描述:</span>
            <span class="old-value">{{ update.entity.description || '无' }}</span>
            <span class="arrow">→</span>
            <span class="new-value">{{ update.updates.description }}</span>
          </div>
        </div>
        <div class="merge-reason">
          <span class="label">💡 原因:</span>
          <span>{{ update.reason }}</span>
        </div>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="merge-actions">
      <button @click="emit('executeMerge')" :disabled="isMerging" class="btn-execute">
        {{ isMerging ? '执行中...' : '✅ 执行选中操作' }}
      </button>
      <button @click="emit('cancelMerge')" class="btn-cancel">❌ 取消</button>
    </div>
  </div>
</div>
</template>

<style scoped>
.merge-suggestions-list {
  margin-bottom: 1rem;
}
.merge-suggestions {
  border: 1px solid var(--border-color);
  border-radius: 0.25rem;
  padding: 0.75rem;
  background-color: var(--background-secondary);
}
.suggestions-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}
.suggestions-header h4 {
  margin: 0;
  color: var(--text-primary);
  font-size: 0.875rem;
}
.merge-item,
.update-item {
  border: 1px solid var(--border-color);
  border-radius: 0.25rem;
  padding: 0.6rem;
  margin-bottom: 0.6rem;
  background-color: var(--background-primary);
  transition: all 0.2s;
}
.merge-item:hover,
.update-item:hover {
  border-color: var(--primary);
}
.merge-item.selected,
.update-item.selected {
  background-color: var(--background-tertiary);
  border-color: var(--primary);
}
.merge-header {
  display: flex;
  align-items: center;
  gap: .5rem;
  margin-bottom: 0.6rem;
}
.merge-header input[type="checkbox"] {
  width: 0.9rem;
  height: 0.9rem;
  cursor: pointer;
}
.merge-title {
  font-weight: bold;
  color: var(--text-primary);
  font-size: 0.85rem;
}
.merge-content {
  padding-left: 1.25rem;
}
.entity-keep,
.entity-merge,
.merge-reason,
.change-item {
  margin-bottom: 0.4rem;
  font-size: 0.8rem;
  line-height: 1.5;
}
.label {
  color: var(--text-secondary);
  margin-right: 0.4rem;
  font-weight: 500;
}
.entity-name {
  color: var(--text-primary);
  font-weight: 500;
}
.entity-type {
  color: var(--text-tertiary);
  font-size: 0.75rem;
  margin-left: 0.4rem;
  padding: 0.1rem 0.4rem;
  background-color: var(--background-tertiary);
  border-radius: 0.25rem;
}
.old-value {
  color: var(--text-tertiary);
  text-decoration: line-through;
}
.arrow {
  color: var(--primary);
  margin: 0 0.4rem;
}
.new-value {
  color: var(--primary);
  font-weight: 500;
}
.merge-actions {
  display: flex;
  gap: .5rem;
  margin-top: 1rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--border-color);
}
.btn-execute {
  flex: 1;
  padding: 0.5rem;
  background-color: var(--primary);
  color: white;
  border: none;
  border-radius: 0.25rem;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 500;
  transition: opacity 0.2s;
}
.btn-execute:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.btn-cancel {
  padding: 0.5rem 1rem;
  background-color: var(--background-tertiary);
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
  border-radius: 0.25rem;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.2s;
}
.btn-cancel:hover {
  background-color: var(--background-secondary);
}
</style>
