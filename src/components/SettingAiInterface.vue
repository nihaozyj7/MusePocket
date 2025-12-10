<script setup lang="ts">
import { openaiFetch, type OpenAiParams } from '@/apis'
import { getDefaultModel } from '@/defaultObjects'
import { $tips } from '@/plugins/notyf'
import { useModelsStore } from '@/stores/ModelsStore'
import { ref } from 'vue'

const props = defineProps<{ title: string }>()

const modelStore = useModelsStore()

const newModel = ref(getDefaultModel())

function addModel() {
  if (!newModel.value.model) {
    return alert('请输入模型名称')
  } else if (!newModel.value.baseUrl) {
    return alert('请输入请求地址')
  } else if (!newModel.value.apiKey) {
    return alert('请输入密钥')
  }

  modelStore.add(newModel.value)
  newModel.value = getDefaultModel()
}

function testApi(model: OpenAiParams) {
  $tips.success('正在检测模型是否能够工作...', 3000)

  openaiFetch(model).then(res => {
    if (res) {
      $tips.success('模型可以正常工作')
    } else {
      $tips.error('模型无法正常工作')
    }
  })
}

function copy(text: string) {
  navigator.clipboard.writeText(text)
  $tips.success('已复制', 1000)
}

</script>

<template>
  <div class="base-setting">
    <div class="title">{{ props.title }}</div>
    <div class="content">
      <header>
        <div>
          <div style="display: flex;">
            <label class="sitem" for="">
              <span>模型名称</span>
              <input type="text" placeholder="模型名称" v-model="newModel.model" />
            </label>
            <label class="sitem" for="" style="margin-left: 1rem;">
              <span>备注</span>
              <input type="text" placeholder="备注 & 描述信息" style="width: 21.89rem;" v-model="newModel.note" />
            </label>
          </div>
          <div>
            <label class="sitem" for="">
              <span>请求地址</span>
              <input type="text" placeholder="示例：https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions" style="flex: 1;" v-model="newModel.baseUrl" />
            </label>
          </div>
          <div>
            <label class="sitem" for="">
              <span style="width: 3.1rem;">密钥</span>
              <input type="text" placeholder="密钥 ApiKey" style="flex: 1;" v-model="newModel.apiKey" />
            </label>
          </div>
        </div>
        <div class="from-box">
          <button @click="addModel">添加新模型</button>
        </div>
      </header>
      <div class="modes-list">
        <div class="item" v-for="model in modelStore.v">
          <p style="cursor: pointer;" title="请求地址，点击复制" @click="copy(model.baseUrl)">{{ model.baseUrl }}</p>
          <div class="title">
            <span style="cursor: pointer;" title="模型名称，点击复制" @click="copy(model.model)">{{ model.model }}</span>
            <p>{{ model.note }}</p>
            <button class="test" title="检测模型是否能够工作" @click="testApi(model)">💓</button>
            <button class="delete" title="删除模型" @click="modelStore.remove(model)">🗑️</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.content {
  display: flex;
  flex-direction: column;
}

.modes-list {
  flex: 1;
  height: 0;
  overflow-y: auto
}

.modes-list, header {
  margin: 0 .5rem .5rem .5rem;
  display: flex;
  flex-direction: column;
}

.item {
  padding: .5rem;
  background-color: var(--background-secondary);
  margin-bottom: .5rem;
  border-radius: .25rem;
}

.item p {
  font-size: .8rem;
}

.item .title {
  padding: 0 !important;
  display: flex;
  margin-top: .5rem;
  border-bottom: none;
  position: relative;
  align-items: center;
}

.item .title p {
  flex: 1;
  width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-right: 4rem;
  color: var(--text-tertiary);
}

.item .title span {
  margin-right: .5rem;
  color: var(--info);
}

.item .delete {
  position: absolute;
  right: 0;
  top: 0;
}

.item .test {
  position: absolute;
  right: 2rem;
  top: 0;
}

.sitem {
  display: flex;
  align-items: center;
  height: 2.5rem;
}

.sitem input {
  width: 10rem;
  border: 1px solid var(--border-color);
  padding: .5rem;
  border-radius: .25rem;
  margin-left: .5rem;
}

.from-box {
  display: flex;
  width: 100%;
  position: relative;
}

.from-box button {
  flex: 1;
  width: 0;
  background-color: var(--background-tertiary);
  line-height: 1.8rem;
  border-radius: .25rem;
  color: var(--text-primary);
  margin-top: .25rem;
}

.from-box span {
  position: absolute;
  font-size: .8rem;
  right: 1rem;
  top: .5rem;
}
</style>
