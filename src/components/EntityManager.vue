<script setup lang="ts">
import { entitydb } from '@/db'
import { getDefaultEntity, getDefaultEntityAttr } from '@/defaultObjects'
import { $tips } from '@/plugins/notyf'
import { useSelectedBookStore } from '@/stores/SelectedBookStore'
import type { Entity, EntityAttr } from '@/types'
import { onMounted, ref } from 'vue'

const titles = ['查看', '导入导出', 'AI提取', '新建'] as const

const selectedTitle = ref<typeof titles[number]>('查看')

/** 实体列表 */
const entities = ref<Entity[]>([])
/** 当前所处书籍 */
const selectedBook = useSelectedBookStore()
/** 新建实体的载体 */
const newEntity = ref(getDefaultEntity(selectedBook.selectedBook.id))


onMounted(() => {

})

function handleHeaderButtonClick(e: MouseEvent) {
  selectedTitle.value = (e.target as HTMLElement).innerText as typeof titles[number]
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
  entitydb.createEntity(newEntity.value).then(res => {
    if (res.success) {
      $tips.success(`创建成功`)
    } else {
      $tips.error(`创建失败, ${res.message}`)
      console.log(res.message)
    }
  })
  newEntity.value = getDefaultEntity(selectedBook.selectedBook.id)
}

</script>

<template>
  <div class="container">
    <header>
      <h4>实体管理</h4>
      <div class="buttons">
        <button @click="handleHeaderButtonClick" :class="{ selected: selectedTitle === title }" v-for="title in titles">{{ title }}</button>
      </div>
    </header>

    <!-- 实体列表 -->
    <div class="list" v-if="selectedTitle === titles[0]">

    </div>
    <!-- 导入导出 -->
    <div class="import-export" v-else-if="selectedTitle === titles[1]">

    </div>
    <!-- AI提取 -->
    <div class="ai-extract" v-else-if="selectedTitle === titles[2]">

    </div>
    <!-- 新建实体 -->
    <div class="new" v-else-if="selectedTitle === titles[3]">
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
            <span>人物</span>
            <span>物品</span>
            <span>事件</span>
            <span>地点</span>
            <span>其他</span>
          </div>
        </div>
        <div class="form-group">
          <label for="entity-description">描述</label>
          <textarea id="entity-description" v-model="newEntity.description" placeholder="输入对该实体的介绍或者描述"></textarea>
        </div>
        <div class="separator">自定义属性</div>
        <div class="form-group">
          <button @click="addEntityAttr">添 加 属 性</button>
        </div>
        <div class="attrs">
          <div class="form-group" v-for="attr in newEntity?.attrs">
            <div class="line-group">
              <input type="text" v-model="attr.title" placeholder="属性名称"></input>
              <input type="number" v-model="attr.sortIndex" placeholder="索引，越小越靠前"></input>
            </div>
            <textarea class="value" v-model="attr.value"></textarea>
          </div>
        </div>
      </div>
      <div class="form-group">
        <button @click="saveEntity" class="save-button">保 存 实 体</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  flex: 1;
  width: 0;
}

.container>div {
  flex: 1;
  height: 0;
}

header {
  background-color: var(--background-secondary);
  width: 100%;
  height: 4.5rem;
  padding-top: .5rem;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

header>h4 {
  padding: 0 .5rem 0 .5rem;
}

.buttons {
  display: flex;
  justify-content: space-between;
  background-color: var(--background-tertiary);
  height: 2.2rem;
}

.buttons button {
  flex: 1;
  margin: 0;
  padding: 0;
  border-right: 1px solid var(--border-color);
}

.selected {
  border-bottom: 1px solid var(--primary);
  color: var(--primary);
}

.new {
  display: flex;
  flex-direction: column;
}

.form {
  flex: 1;
  height: 0;
  display: flex;
  overflow-y: auto;
  flex-direction: column;
  border: 1px solid var(--border-color);
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
}

.types span {
  padding: .25rem .5rem;
  border-radius: .25rem;
  background-color: var(--background-tertiary);
  font-size: .8rem;
  margin: .25rem;
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
  margin: .5rem 1rem .5rem 1rem;
  border-radius: .25rem;
}

.line-group {
  display: flex;
}

.line-group input:nth-child(1) {
  flex: 1;
}

.line-group input:nth-child(2) {
  width: 5rem;
}

.save-button {
  background-color: var(--primary-dark) !important;
}
</style>
