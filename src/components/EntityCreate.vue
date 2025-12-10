<script setup lang="ts">
import { entitydb } from '@/db'
import { getDefaultEntity, getDefaultEntityAttr } from '@/defaultObjects'
import { event_emit } from '@/eventManager'
import { $tips } from '@/plugins/notyf'
import { useEntityTypesStore } from '@/stores/EntityTypesStore'
import { useSelectedBookStore } from '@/stores/SelectedBookStore'
import type { Entity } from '@/types'
import { trimAndReduceNewlines } from '@/utils'
import { onMounted, ref } from 'vue'

const emit = defineEmits(['submit'])

const props = defineProps({
  /**
   * 组件类型，分为创建模式和修改模式，默认为创建模式
   * 处于修改模式时，需要传入一个实体对象，用于修改
   */
  isUpdateMode: {
    type: Boolean,
    default: false
  },
  /** 实体对象，当 isCreateMode === false 时，需要传入否则无法工作*/
  entity: {
    type: Object,
    default: null
  }
})

/** 当前所处书籍 */
const selectedBook = useSelectedBookStore()
/** 新建实体的载体 */
const newEntity = ref(getDefaultEntity(selectedBook.v.id))
/** 实体类型整合列表 */
const entityTypes = useEntityTypesStore()

onMounted(() => {
  // 修改模式时，需要传入一个实体对象
  if (props.isUpdateMode && props.entity === null) {
    throw new Error('实体创建模式下，必须传入一个实体对象')
  }
})

if (props.isUpdateMode) {
  newEntity.value = JSON.parse(JSON.stringify(props.entity)) as Entity
}

function handleTypesClick(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (target.tagName !== 'SPAN') return
  newEntity.value.type = target.innerText
}

function addEntityAttr(e: MouseEvent) {
  if (newEntity.value.attrs === undefined) newEntity.value.attrs = []
  newEntity.value.attrs.push(getDefaultEntityAttr())
}

function saveEntity() {
  if (!newEntity.value.title.trim()) {
    return $tips.error('请填写实体名称')
  } else if (!newEntity.value.type.trim()) {
    return $tips.error('请选择实体类型')
  }

  if (newEntity.value.attrs?.some(attr => !attr.title.trim() || !attr.value.trim())) {
    return $tips.error('自定义属性值和名称必须填写')
  }


  if (newEntity.value.attrs) newEntity.value.attrs = newEntity.value.attrs.map(attr => {
    attr.value = trimAndReduceNewlines(attr.value)
    attr.title = attr.title.trim()
    return attr
  })

  newEntity.value.title = newEntity.value.title.trim()
  newEntity.value.description = trimAndReduceNewlines(newEntity.value.description)

  if (props.isUpdateMode) {
    return emit('submit', { ...newEntity.value })
  }

  entitydb.createEntity(newEntity.value).then(res => {
    if (res.success) {
      $tips.success(`创建成功`)
      event_emit('entity-create-success', newEntity.value)
      entityTypes.add(newEntity.value.type)
      newEntity.value = getDefaultEntity(selectedBook.v.id)
    } else {
      $tips.error(`创建失败, ${res.message}`)
    }
  })
}

function deleteEntityAttr(index: number) {
  newEntity.value.attrs.splice(index, 1)
}
</script>

<template>
  <div class="entity-create">
    <div class="form">
      <div class="separator">固有属性</div>
      <div class="form-group">
        <label for="entity-id">名称</label>
        <input type="text" id="entity-id" v-model="newEntity.title" placeholder="输入该实体的名称" autocomplete="off"></input>
      </div>
      <div class="form-group">
        <label for="entity-type">类型</label>
        <input type="text" id="entity-type" v-model="newEntity.type" placeholder="输入或在下方选取类型" autocomplete="off"></input>
        <div class="types" @click="handleTypesClick">
          <span v-for="type in entityTypes.array">{{ type[0] }}</span>
          <span v-if="entityTypes.array.every(type => type[0] !== '其他')">其他</span>
        </div>
      </div>
      <div class="form-group">
        <label for="entity-description">描述</label>
        <textarea id="entity-description" v-model="newEntity.description" placeholder="输入对该实体的介绍或者描述"></textarea>
      </div>
      <div class="separator">自定义属性</div>
      <div class="form-group">
        <button @click="addEntityAttr">添加属性</button>
      </div>
      <div class="attrs">
        <div class="form-group" v-for="attr, index in newEntity?.attrs">
          <div class="line-group">
            <input type="text" v-model="attr.title" placeholder="属性名称" title="属性的名称"></input>
            <input type="number" v-model="attr.sortIndex" title="排序索引，越小越靠前"></input>
            <button class="delete-button" @click="deleteEntityAttr(index)">❌</button>
          </div>
          <textarea class="value" v-model="attr.value" placeholder="输入属性的值"></textarea>
        </div>
      </div>
    </div>
    <div class="form-group">
      <button @click="saveEntity" class="save-button">{{ props.isUpdateMode ? "提交修改" : "保存实体" }}</button>
    </div>
  </div>
</template>

<style scoped>
.entity-create {
  display: flex;
  flex-direction: column;
}

.form {
  flex: 1;
  height: 0;
  display: flex;
  overflow-y: auto;
  flex-direction: column;
  /* border: 1px solid var(--border-color); */
}

.form-group {
  padding: .5rem;
  margin: .25rem .25rem 0 .25rem;
  display: flex;
  flex-direction: column;
}

.form-group label {
  margin-bottom: .25rem;
  font-size: .8rem;
  color: var(--text-tertiary);
}

.form-group label::after {
  content: ' :';
}

.line-group input, .form-group input {
  border-bottom: 1px solid var(--border-color);
  padding: .5rem 0;
  color: var(--text-primary);
}

.form-group textarea {
  border: 1px solid var(--border-color);
  height: 3.4rem;
  min-height: 3.4rem;
  padding: .5rem;
  resize: vertical;
  border-radius: .25rem;
  color: var(--text-primary);
}


.form-group .text-button {
  margin-left: auto;
  margin-top: .5rem;
  color: var(--primary-dark);
  border-bottom: 1px solid var(--primary-dark);
}

.form-group button {
  margin-left: auto;
  line-height: 2rem;
  border-radius: .25rem;
  width: 100%;
  background-color: var(--background-tertiary);
  color: var(--text-primary);

}

.types {
  display: flex;
  margin-top: .25rem;
  flex-wrap: wrap;
}

.types span {
  padding: .25rem .5rem;
  border-radius: .25rem;
  background-color: var(--background-tertiary);
  font-size: .8rem;
  margin: .25rem .25rem 0 0;
  cursor: pointer;
}

.types span:first-child {
  margin-left: 0;
}

.separator {
  height: 2rem;
  background-color: var(--background-secondary);
  line-height: 2rem;
  font-size: .8rem;
  padding-left: .5rem;
  color: var(--text-secondary);
}

.attrs textarea {
  height: 2.2rem;
  min-height: 2.2rem;
  resize: vertical;
  padding: .25rem 0;
  border: none;
  border-bottom: 1px solid var(--border-color);
  margin-top: .5rem;
}

.attrs label {
  margin-left: .25rem;
  margin-bottom: .25rem;
}

.attrs>div {
  background-color: var(--background-secondary);
  margin: .5rem 1rem 1rem 1rem;
  border-radius: .25rem;
}

.line-group {
  display: flex;
}

.line-group input:nth-child(1) {
  flex: 1;
  width: 0;
}

.line-group input:nth-child(2) {
  width: 5rem;
}

.line-group {
  position: relative;
}

.line-group .delete-button {
  position: absolute;
  width: auto;
  width: 2rem;
  height: 2rem;
  right: -1rem;
  line-height: 1rem;
  top: -1rem;
  border-radius: 50%;
  background-color: var(--background-secondary);
}

.save-button {
  background-color: var(--primary-dark) !important;
}
</style>
