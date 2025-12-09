<script setup lang="ts">
import type { Entity } from '@/types'

const props = defineProps<{ entity: Entity }>()
</script>

<template>
  <div class="entity-detail">
    <div class="header">
      <h4>{{ props.entity.title }}</h4>
      <span class="type-tag">{{ props.entity.type }}</span>
    </div>
    <div class="description">
      <p>{{ props.entity.description }}</p>
    </div>
    <div class="attributes">
      <ul>
        <li v-for="attr, index in props.entity?.attrs" :key="index">
          <span class="attr-title">{{ attr.title }} :</span>
          <span class="attr-value">{{ attr.value }}</span>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
/* 主容器：设置尺寸范围与布局 */
.entity-detail {
  width: 420px;
  max-height: 50vw;
  min-height: 200px;

  /* 布局结构清晰 */
  display: flex;
  flex-direction: column;
  gap: .5rem;
  /* 控制各区块间距 */
  padding: 1rem;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow-y: auto;
  /* 可滚动内容 */
}

/* 头部区域：标题 + 类型标签 */
.header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 0.5rem;
}

.header h4 {
  margin: 0;
  font-size: 1.3em;
  line-height: 1.5;
}

.type-tag {
  font-size: 0.85em;
  background: var(--background-tertiary);
  color: var(--danger);
  padding: 0.25em 0.75em;
  border-radius: 4px;
  white-space: nowrap;
}

/* 描述区域 */
.description p {
  margin: 0;
  font-size: 0.95em;
  line-height: 1.6;
  font-size: .8rem;
  color: var(--text-tertiary)
}

.attributes {
  flex: 1;
  height: 0;
  overflow-y: auto;
}

/* 属性列表容器 */
.attributes ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.attributes li {
  display: flex;
  justify-content: space-between;
  border-bottom: 1px solid var(--border-color);
  /* 分隔线，可选 */
  gap: .5rem;
  padding: .25rem 0;
}

.attributes li:last-child {
  border-bottom: none;
}

.attr-title,
.attr-value {
  font-size: 0.95em;
  line-height: 1.5;
  word-break: break-word;
}

/* 自适应宽度，避免溢出 */
.attr-title {
  flex: 0 0 5rem;
  /* 固定宽度，可调 */
  text-align: right;
}

.attr-value {
  flex: 1;
  /* 占满剩余空间 */
  text-align: left;
}
</style>
