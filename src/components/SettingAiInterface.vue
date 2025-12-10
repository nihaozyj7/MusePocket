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
      <div class="form-section">
        <div class="form-row">
          <div class="form-item">
            <label>
              <span class="label-text">模型名称</span>
              <input type="text" placeholder="模型名称" v-model="newModel.model" />
            </label>
          </div>
          <div class="form-item" style="flex: 2;">
            <label>
              <span class="label-text">备注</span>
              <input type="text" placeholder="备注 & 描述信息" v-model="newModel.note" />
            </label>
          </div>
        </div>
        <div class="form-item">
          <label>
            <span class="label-text">请求地址</span>
            <input type="text" placeholder="示例：https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions" v-model="newModel.baseUrl" />
          </label>
        </div>
        <div class="form-item">
          <label>
            <span class="label-text">密钥</span>
            <input type="text" placeholder="密钥 ApiKey" v-model="newModel.apiKey" />
          </label>
        </div>
        <div class="form-actions">
          <button class="add-btn" @click="addModel">添加新模型</button>
        </div>
      </div>

      <div class="models-list">
        <div class="model-item" v-for="model in modelStore.v" :key="model.id">
          <div class="model-url" title="请求地址，点击复制" @click="copy(model.baseUrl)">{{ model.baseUrl }}</div>
          <div class="model-info">
            <span class="model-name" title="模型名称，点击复制" @click="copy(model.model)">{{ model.model }}</span>
            <span class="model-note">{{ model.note }}</span>
            <div class="model-actions">
              <button class="test-btn" title="检测模型是否能够工作" @click="testApi(model)">💓</button>
              <button class="delete-btn" title="删除模型" @click="modelStore.remove(model)">🗑️</button>
            </div>
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

.form-section {
  padding: 1rem;
  background-color: var(--background-secondary);
  border-radius: 0.5rem;
  margin-bottom: 1rem;
  border: 1px solid var(--border-color);
}

.form-row {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
}

.form-item {
  flex: 1;
  margin-bottom: 1rem;
}

.form-item:last-child {
  margin-bottom: 0;
}

.form-item label {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.label-text {
  color: var(--text-secondary);
  font-size: 0.85rem;
  font-weight: 500;
}

.form-item input {
  width: 100%;
}

.form-actions {
  margin-top: 1rem;
}

.add-btn {
  width: 100%;
}

.models-list {
  flex: 1;
  height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.model-item {
  padding: 1rem;
  background-color: var(--background-secondary);
  border-radius: 0.5rem;
  border: 1px solid var(--border-color);
  transition: all 0.2s;
}

.model-item:hover {
  border-color: var(--primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.model-url {
  font-size: 0.85rem;
  color: var(--text-secondary);
  cursor: pointer;
  margin-bottom: 0.75rem;
  padding: 0.5rem;
  background-color: var(--background-tertiary);
  border-radius: 0.25rem;
  word-break: break-all;
}

.model-url:hover {
  color: var(--primary);
  background-color: var(--background-primary);
}

.model-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  position: relative;
}

.model-name {
  font-weight: 600;
  color: var(--primary);
  cursor: pointer;
  font-size: 0.9rem;
}

.model-name:hover {
  text-decoration: underline;
}

.model-note {
  flex: 1;
  color: var(--text-tertiary);
  font-size: 0.85rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.model-actions {
  display: flex;
  gap: 0.5rem;
}

.model-actions button {
  padding: 0.25rem 0.5rem;
}

.test-btn:hover {
  background-color: var(--success) !important;
  border-color: var(--success) !important;
}

.delete-btn:hover {
  background-color: var(--danger) !important;
  border-color: var(--danger) !important;
}
</style>
