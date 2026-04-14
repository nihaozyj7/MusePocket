<script setup lang="ts">
import { ref } from 'vue'
import type { Entity } from '@shared/types'
import { Popup } from '@shared/components'
import { $confirm } from '@app/plugins'

const popupRef = ref<InstanceType<typeof Popup> | null>(null)
const entity = ref<Entity | null>(null)

/** 定义转换为纯文本的事件 */
const emit = defineEmits<{
  convertToText: [entityId: string, title: string, convertAll: boolean]
}>()

/** 保存点击的元素，用于只转换当前这一个 */
let clickedElement: HTMLElement | null = null

/** 复制文本到剪贴板 */
function copy(text: string) {
  if (text) {
    navigator.clipboard.writeText(text)
  }
}

/** 转换为普通文本 */
async function convertToPlainText() {
  if (!entity.value) return

  const confirmed = await $confirm(
    '确认转换',
    `确定要将实体“${entity.value.title}”转换为普通文本吗？\n转换后将失去实体的关联功能。`
  )

  if (confirmed) {
    emit('convertToText', entity.value.id, entity.value.title, true)
    popupRef.value?.close()
  }
}

/** 只转换当前点击的这一个实体 */
async function convertCurrentToPlainText() {
  if (!entity.value) return

  const confirmed = await $confirm(
    '确认转换',
    `确定要将当前这个实体转换为普通文本吗？\n转换后将失去实体的关联功能。`
  )

  if (confirmed) {
    emit('convertToText', entity.value.id, entity.value.title, false)
    popupRef.value?.close()
  }
}

/** 转换所有相同的实体为普通文本 */
async function convertAllToPlainText() {
  if (!entity.value) return

  const confirmed = await $confirm(
    '确认转换',
    `确定要将当前文章中所有“${entity.value.title}”实体转换为普通文本吗？\n此操作将影响文章中所有该实体的引用。`
  )

  if (confirmed) {
    emit('convertToText', entity.value.id, entity.value.title, true)
    popupRef.value?.close()
  }
}

defineExpose({
  show(ent: Entity, element?: HTMLElement) {
    entity.value = ent
    clickedElement = element || null
    popupRef.value?.show()
  },
  hide() {
    popupRef.value?.close()
    clickedElement = null
  }
})
</script>

<template>
<Popup ref="popupRef" title="📋 实体详情" mask mask-closable>
  <div class="entity-click-popup" v-if="entity">
    <!-- 图片 -->
    <div class="image-section" v-if="entity.imgID && entity.imgID.length > 5">
      <img :src="entity.imgID" :alt="entity.title" />
    </div>

    <!-- 基本信息 -->
    <div class="info-section">
      <div class="header" style="display: flex; justify-content: space-between;">
        <h4 @click="copy(entity.title)" title="点击复制">{{ entity.title }}</h4>
        <span class="type-tag">{{ entity.type }}</span>
      </div>

      <!-- 描述 -->
      <div class="description" v-if="entity.description">
        <p @click="copy(entity.description)" title="点击复制">{{ entity.description }}</p>
      </div>

      <!-- 自定义属性 -->
      <div class="attributes" v-if="entity.attrs && entity.attrs.length > 0">
        <ul>
          <li v-for="attribute in entity.attrs" :key="attribute.title">
            <span class="attr-title">{{ attribute.title }}</span>
            <span class="attr-value" @click="copy(attribute.value)" title="点击复制">{{ attribute.value }}</span>
          </li>
        </ul>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="actions">
      <button class="btn-convert" @click="convertCurrentToPlainText">
        🔤 转换当前为文本
      </button>
      <button class="btn-convert-all" @click="convertAllToPlainText">
        🔤 转换全部为文本
      </button>
    </div>
  </div>
</Popup>
</template>

<style scoped>
.entity-click-popup {
  width: 25rem;
  max-height: 30rem;
  display: flex;
  flex-direction: column;
  gap: .5rem;
}
.image-section {
  width: 100%;
  max-height: 12rem;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
  border-radius: 0.25rem;
  border: 1px solid var(--border-color);
}
.image-section img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: 0.25rem;
}
.info-section {
  display: flex;
  flex-direction: column;
  gap: .5rem;
  flex: 1;
  overflow-y: auto;
}
.type-tag {
  padding: 0.2rem 0.5rem;
  background-color: var(--background-tertiary);
  color: var(--danger);
  border-radius: 0.25rem;
  font-size: 0.8rem;
  white-space: nowrap;
}
.description p {
  margin: 0;
  padding: 0.5rem;
  background-color: var(--background-secondary);
  border-radius: 0.25rem;
  line-height: 1.6;
  font-size: 0.85rem;
  color: var(--text-secondary);
  cursor: pointer;
  word-break: break-word;
}
.description p:hover {
  background-color: var(--background-tertiary);
}
.attributes ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: .5rem;
}
.attributes li {
  display: flex;
  gap: .5rem;
  padding: 0.5rem;
  background-color: var(--background-secondary);
  border-radius: 0.25rem;
  font-size: 0.85rem;
}
.attr-title {
  font-weight: 600;
  color: var(--text-primary);
  min-width: 5rem;
  flex-shrink: 0;
}
.attr-title::after {
  content: ':';
  margin-left: 0.25rem;
}
.attr-value {
  flex: 1;
  color: var(--text-secondary);
  cursor: pointer;
  word-break: break-word;
}
.attr-value:hover {
  color: var(--primary);
}
.actions {
  display: flex;
  justify-content: flex-end;
  gap: .5rem;
  padding-top: 0.5rem;
}
.btn-convert,
.btn-convert-all {
  border: none;
  border-radius: 0.25rem;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}
.btn-convert {
  background-color: var(--background-tertiary);
  color: white;
}
.btn-convert-all {
  background-color: var(--background-tertiary);
  color: white;
}
.btn-convert:active,
.btn-convert-all:active {
  transform: translateY(0);
}
</style>
