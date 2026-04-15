<script setup lang="ts">
import { openaiFetch, type OpenAiParams } from '@core/api'
import { getDefaultModel } from '@shared/constants/defaults'
import { $tips } from '@app/plugins'
import { useModelsStore } from '@domains/settings/stores/models.store'
import { ref, onMounted } from 'vue'

const props = defineProps<{ title: string }>()

const modelStore = useModelsStore()

const newModel = ref(getDefaultModel())
const isFormExpanded = ref(false)
const globalApiKey = ref('')
const isGlobalKeySaved = ref(false)

onMounted(async () => {
  if (window.api?.ai) {
    const config = await window.api.ai.getConfig()
    if (config?.baseUrl) {
      globalApiKey.value = '******（已设置）'
      isGlobalKeySaved.value = true
    }
  }
})

async function saveGlobalApiKey(): Promise<void> {
  if (!newModel.value.baseUrl || !newModel.value.model) {
    return
  }
  if (!globalApiKey.value || globalApiKey.value === '******（已设置）') {
    return
  }

  try {
    await window.api.ai.saveConfig({
      baseUrl: newModel.value.baseUrl,
      model: newModel.value.model,
      apiKey: globalApiKey.value
    })
    $tips.success('API Key 已安全保存到主进程')
    globalApiKey.value = '******（已设置）'
    isGlobalKeySaved.value = true
  } catch (err) {
    $tips.error('保存失败')
    console.error(err)
  }
}

function addModel(): void {
  if (!newModel.value.model) {
    return
  } else if (!newModel.value.baseUrl) {
    return
  }

  if (!newModel.value.apiKey) {
    if (!isGlobalKeySaved.value) {
      return
    }
  }

  modelStore.add(newModel.value)
  newModel.value = getDefaultModel()
}

function testApi(model: OpenAiParams): void {
  $tips.success('正在检测模型是否能够工作...', 3000)

  openaiFetch(model).then((res) => {
    if (res) {
      $tips.success('模型可以正常工作')
    } else {
      $tips.error('模型无法正常工作')
    }
  })
}

function copy(text: string): void {
  navigator.clipboard.writeText(text)
  $tips.success('已复制', 1000)
}
</script>

<template>
  <div class="base-setting">
    <div class="title">{{ props.title }}</div>
    <div class="content">
      <!-- 全局 API Key 安全设置 -->
      <div class="form-section">
        <div class="form-header">
          <span class="form-title">🔐 全局 API Key（安全存储）</span>
        </div>
        <div class="form-body">
          <div class="security-notice">API Key 将安全存储在主进程中，不会暴露在前端代码中</div>
          <div class="form-item">
            <label>
              <span class="label-text">全局 API Key</span>
              <input
                type="password"
                placeholder="输入 API Key，保存后将安全存储"
                v-model="globalApiKey"
              />
            </label>
          </div>
          <div class="form-actions">
            <button class="save-key-btn" @click="saveGlobalApiKey">保存到主进程</button>
          </div>
        </div>
      </div>

      <!-- 折叠表单区域 -->
      <div class="form-section" :class="{ collapsed: !isFormExpanded }">
        <div class="form-header" @click="isFormExpanded = !isFormExpanded">
          <span class="form-title">{{ isFormExpanded ? '📝 添加新模型' : '➕ 添加新模型' }}</span>
          <span class="toggle-icon">{{ isFormExpanded ? '▼' : '▶' }}</span>
        </div>
        <div class="form-body" v-show="isFormExpanded">
          <div class="form-row">
            <div class="form-item">
              <label>
                <span class="label-text">模型名称</span>
                <input type="text" placeholder="模型名称" v-model="newModel.model" />
              </label>
            </div>
            <div class="form-item" style="flex: 2">
              <label>
                <span class="label-text">备注</span>
                <input type="text" placeholder="备注 & 描述信息" v-model="newModel.note" />
              </label>
            </div>
          </div>
          <div class="form-item">
            <label>
              <span class="label-text">请求地址</span>
              <input
                type="text"
                placeholder="示例：https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions"
                v-model="newModel.baseUrl"
              />
            </label>
          </div>
          <div class="form-item">
            <label>
              <span class="label-text">密钥</span>
              <input type="text" placeholder="留空则使用全局 API Key" v-model="newModel.apiKey" />
            </label>
          </div>
          <div class="form-actions">
            <button class="add-btn" @click="addModel">添加新模型</button>
          </div>
        </div>
      </div>

      <div class="models-list">
        <div class="model-item" v-for="(model, index) in modelStore.v" :key="index">
          <div class="model-url" title="请求地址，点击复制" @click="copy(model.baseUrl)">
            {{ model.baseUrl }}
          </div>
          <div class="model-info">
            <span class="model-name" title="模型名称，点击复制" @click="copy(model.model)">{{
              model.model
            }}</span>
            <span class="model-note">{{ model.note }}</span>
            <span v-if="!model.apiKey" class="uses-global-key" title="使用全局 API Key">🔐</span>
            <div class="model-actions">
              <button class="test-btn" title="检测模型是否能够工作" @click="testApi(model)">
                💓
              </button>
              <button class="delete-btn" title="删除模型" @click="modelStore.remove(model)">
                🗑️
              </button>
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
  background-color: var(--background-secondary);
  border-radius: 0.5rem;
  margin-bottom: 1rem;
  border: 1px solid var(--border-color);
  overflow: hidden;
  transition: all 0.3s ease;
}
.form-section.collapsed {
  background-color: transparent;
}
.form-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  cursor: pointer;
  user-select: none;
  transition: background-color 0.2s;
}
.form-header:hover {
  background-color: var(--background-tertiary);
}
.form-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-primary);
}
.toggle-icon {
  color: var(--text-secondary);
  font-size: 0.8rem;
  transition: transform 0.3s ease;
}
.form-body {
  padding: 0 1rem 1rem 1rem;
  animation: slideDown 0.3s ease;
}
@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.security-notice {
  font-size: 0.8rem;
  color: var(--primary);
  background-color: var(--background-tertiary);
  padding: 0.5rem 0.75rem;
  border-radius: 0.25rem;
  margin-bottom: 1rem;
}
.form-row {
  display: flex;
  gap: 0.5rem;
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
.save-key-btn {
  width: 100%;
  background-color: var(--primary);
  color: white;
}
.save-key-btn:hover {
  opacity: 0.9;
}
.uses-global-key {
  font-size: 0.9rem;
}
.models-list {
  flex: 1;
  height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
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
  gap: 0.5rem;
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
</style>
