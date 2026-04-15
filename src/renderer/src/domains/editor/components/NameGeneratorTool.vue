<script setup lang="ts">
  import { ref, computed, onMounted, watch } from 'vue'
  import { useModelsStore } from '@domains/settings/stores/models.store'
  import { usePromptsStore } from '@domains/settings/stores/prompts.store'
  import { useSettingStore } from '@domains/settings/stores/settings.store'
  import { openaiFetch, type OpenAiParams } from '@core/api'
  import { $tips } from '@app/plugins'
  import { NAME_GENERATOR_REQUIREMENTS } from '../constants/ai-prompts'

  const modelsStore = useModelsStore()
  const promptsStore = usePromptsStore()
  const settingStore = useSettingStore()
  const selectedModel = ref<OpenAiParams | null>(null)
  /** 取名类型 */
  const nameType = ref<string>('人名')
  /** 取名风格 */
  const nameStyle = ref<string>('现代')
  /** 额外要求 */
  const additionalRequirements = ref<string>('')
  /** 数量 */
  const nameCount = ref<number>(10)
  /** 性别（仅人名） */
  const gender = ref<string>('不限')
  /** 是否正在生成 */
  const isGenerating = ref(false)
  /** 生成的名字列表 */
  const generatedNames = ref<string[]>([])
  /** 生成进度 */
  const progress = ref('')

  /** 取名类型选项 */
  const nameTypes = [
    '人名', '地名', '组织机构名', '物品名称', '技能名称', '称号', '书名', '其他'
  ]

  /** 风格选项 */
  const nameStyles = [
    '现代', '古风', '玄幻', '科幻', '西方奇幻', '日式', '诗意', '霸气', '温婉', '神秘'
  ]

  /** 性别选项 */
  const genderOptions = ['不限', '男', '女', '中性']

  /** 模型选项 */
  const modelOptions = computed(() => modelsStore.v)

  /** 提示词选项 */
  const promptOptions = computed(() => promptsStore.v)

  /** 合并后的额外要求选项（内置 + 自定义） */
  const allRequirementOptions = computed(() => {
    return [
      ...NAME_GENERATOR_REQUIREMENTS.map(r => ({ ...r, isBuiltin: true })),
      ...promptOptions.value.map(p => ({
        id: p.id,
        title: p.title,
        content: p.prompt,
        isBuiltin: false
      }))
    ]
  })

  /** 是否可以开始生成 */
  const canGenerate = computed(() => {
    return selectedModel.value && nameType.value && nameCount.value > 0
  })

  onMounted(() => {
    // 尝试从持久化配置中恢复
    const savedConfig = settingStore.getAiToolConfig('nameGenerator')

    if (savedConfig.modelId) {
      // 根据 modelId 查找对应的模型
      const model = modelOptions.value.find(m =>
        `${m.baseUrl}_${m.model}` === savedConfig.modelId
      )
      if (model) {
        selectedModel.value = model
      } else {
        // 模型被删除，使用默认第一个模型
        if (modelOptions.value.length > 0) {
          selectedModel.value = modelOptions.value[0]
        }
      }
    } else {
      // 默认选择第一个模型
      if (modelOptions.value.length > 0) {
        selectedModel.value = modelOptions.value[0]
      }
    }
  })

  // 监听选中的模型变化，保存到持久化配置
  watch(selectedModel, (newModel) => {
    if (newModel) {
      const modelId = `${newModel.baseUrl}_${newModel.model}`
      settingStore.saveAiToolConfig('nameGenerator', { modelId })
    }
  })

  /** 选择额外要求 */
  function selectRequirement(reqId: string) {
    const req = allRequirementOptions.value.find(r => r.id === reqId)
    if (req) {
      additionalRequirements.value = req.content
      $tips.success(`已填入「${req.title}」`)
    }
  }

  /** 生成取名提示词 */
  function generatePrompt(): string {
    let prompt = `请为我生成 ${nameCount.value} 个${nameStyle.value}风格的${nameType.value}`

    if (nameType.value === '人名' && gender.value !== '不限') {
      prompt += `，性别：${gender.value}`
    }

    if (additionalRequirements.value.trim()) {
      prompt += `\n\n额外要求：${additionalRequirements.value}`
    }

    prompt += '\n\n要求：'
    prompt += '\n1. 直接输出名字列表，每行一个名字'
    prompt += '\n2. 不要添加序号、解释或其他说明'
    prompt += '\n3. 名字要符合所选风格和类型'
    prompt += '\n4. 名字要有创意且易于记忆'

    return prompt
  }

  /** 开始生成名字 */
  async function generateNames() {
    if (!canGenerate.value) {
      $tips.error('请先配置必要信息')
      return
    }

    try {
      isGenerating.value = true
      generatedNames.value = []
      progress.value = '正在生成名字...'

      const prompt = generatePrompt()

      const response = await openaiFetch({
        ...selectedModel.value,
        messages: [
          {
            role: 'system',
            content: '你是一个专业的命名专家，擅长根据不同风格和类型创造有创意的名字。'
          },
          { role: 'user', content: prompt }
        ],
        stream: false
      })

      if (!response || !response.choices || !response.choices[0]) {
        throw new Error('AI 返回格式错误')
      }

      const aiContent = response.choices[0].message?.content || ''

      // 解析返回的名字列表
      progress.value = '正在解析结果...'
      const names = aiContent
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.match(/^[\d\-\.\、]+/)) // 过滤空行和序号
        .map(line => line.replace(/^[\d\-\.\、\s]+/, '')) // 移除可能的序号
        .filter(line => line.length > 0 && line.length < 50) // 过滤异常长度

      if (names.length === 0) {
        throw new Error('未能从 AI 返回中解析出有效名字')
      }

      generatedNames.value = names
      progress.value = `成功生成 ${names.length} 个名字`
      $tips.success(`已生成 ${names.length} 个名字`)

    } catch (err: any) {
      progress.value = `错误: ${err.message}`
      $tips.error(`生成失败: ${err.message}`)
      console.error(err)
    } finally {
      isGenerating.value = false
    }
  }

  /** 复制名字到剪贴板 */
  function copyName(name: string) {
    navigator.clipboard.writeText(name)
    $tips.success('已复制', 1000)
  }

  /** 复制所有名字 */
  function copyAllNames() {
    const allNames = generatedNames.value.join('\n')
    navigator.clipboard.writeText(allNames)
    $tips.success('已复制所有名字', 1000)
  }

  /** 清空结果 */
  function clearResults() {
    generatedNames.value = []
    progress.value = ''
  }
</script>

<template>
  <div class="name-generator-tool">
    <div class="content">
      <!-- 模型选择 -->
      <div class="section">
        <h3>🤖 选择AI模型</h3>
        <select v-model="selectedModel" class="select-box">
          <option :value="null" disabled>请选择模型</option>
          <option v-for="model in modelOptions" :key="model.model" :value="model">
            {{ model.note || model.model }}
          </option>
        </select>
      </div>

      <!-- 取名配置 -->
      <div class="section">
        <div class="form-group">
          <label>取名类型</label>
          <select v-model="nameType" class="select-box">
            <option v-for="type in nameTypes" :key="type" :value="type">
              {{ type }}
            </option>
          </select>
        </div>

        <div class="form-group">
          <label>风格</label>
          <select v-model="nameStyle" class="select-box">
            <option v-for="style in nameStyles" :key="style" :value="style">
              {{ style }}
            </option>
          </select>
        </div>

        <div class="form-group" v-if="nameType === '人名'">
          <label>性别</label>
          <select v-model="gender" class="select-box">
            <option v-for="g in genderOptions" :key="g" :value="g">
              {{ g }}
            </option>
          </select>
        </div>

        <div class="form-group">
          <label>生成数量</label>
          <input type="number" v-model.number="nameCount" min="1" max="50" class="input-box" />
        </div>

        <div class="form-group">
          <label>额外要求（可选）</label>
          <div class="requirement-selector">
            <select @change="selectRequirement(($event.target as HTMLSelectElement).value)" class="requirement-select">
              <option value="">快速选择常用要求（可选）</option>
              <optgroup label="内置要求">
                <option v-for="req in allRequirementOptions.filter(r => r.isBuiltin)" :key="req.id" :value="req.id">
                  {{ req.title }}
                </option>
              </optgroup>
              <optgroup label="自定义提示词" v-if="allRequirementOptions.filter(r => !r.isBuiltin).length > 0">
                <option v-for="req in allRequirementOptions.filter(r => !r.isBuiltin)" :key="req.id" :value="req.id">
                  {{ req.title }}
                </option>
              </optgroup>
            </select>
          </div>
          <textarea v-model="additionalRequirements" class="textarea-box" placeholder="例如：需要带有水的元素、寓意美好、两个字等..." rows="3"></textarea>
        </div>

        <button @click="generateNames" :disabled="!canGenerate || isGenerating" class="generate-btn">
          {{ isGenerating ? '⏳ 生成中...' : '✨ 开始生成' }}
        </button>
      </div>

      <!-- 进度信息 -->
      <div class="section" v-if="progress">
        <div class="progress-info" :class="{ error: progress.includes('错误') }">
          {{ progress }}
        </div>
      </div>

      <!-- 生成结果 -->
      <div class="section results-section" v-if="generatedNames.length > 0">
        <div class="results-header">
          <h3>📝 生成结果 ({{ generatedNames.length }})</h3>
          <div class="results-actions">
            <button @click="copyAllNames" class="action-btn">📋 复制全部</button>
            <button @click="clearResults" class="action-btn">🗑️ 清空</button>
          </div>
        </div>

        <div class="names-grid">
          <div v-for="(name, index) in generatedNames" :key="index" class="name-card" @click="copyName(name)" :title="'点击复制: ' + name">
            <span class="name-text">{{ name }}</span>
            <span class="copy-icon">📋</span>
          </div>
        </div>
      </div>

      <!-- 空状态提示 -->
      <div class="empty-state" v-if="generatedNames.length === 0 && !progress">
        <div class="empty-icon">✨</div>
        <div class="empty-text">配置参数后点击"开始生成"创建名字</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
  .name-generator-tool {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    background-color: var(--background-secondary);
  }
  .content {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: .5rem;
  }
  .section {
    background-color: var(--background-secondary);
    padding: 0.5rem;
    border-bottom: 1px solid var(--border-color);
  }
  .section h3 {
    margin: 0 0 0.6rem 0;
    font-size: 0.9rem;
    color: var(--text-primary);
    font-weight: 600;
  }
  .form-group {
    margin-bottom: 0.75rem;
  }
  .form-group:last-child {
    margin-bottom: 0;
  }
  .form-group label {
    display: block;
    margin-bottom: 0.35rem;
    color: var(--text-secondary);
    font-size: 0.8rem;
    font-weight: 500;
  }
  .requirement-selector {
    margin-bottom: 0.5rem;
  }
  .requirement-select {
    width: 100%;
    padding: 0.375rem 0.5rem;
    border: 1px solid var(--border-color);
    border-radius: 0.25rem;
    background-color: var(--background-tertiary);
    color: var(--text-tertiary);
    font-size: 0.8rem;
    cursor: pointer;
  }
  .requirement-select:focus {
    outline: none;
    border-color: var(--primary);
    color: var(--text-primary);
  }
  .generate-btn {
    width: 100%;
    padding: 0.6rem;
    margin-top: 0.75rem;
    background-color: var(--primary);
    color: white;
    border: none;
    border-radius: 0.25rem;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }
  .generate-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .progress-info {
    padding: 0.6rem;
    background-color: var(--background-tertiary);
    border-radius: 0.25rem;
    color: var(--text-primary);
    font-size: 0.85rem;
    text-align: center;
  }
  .progress-info.error {
    background-color: rgba(255, 59, 48, 0.1);
    color: var(--danger);
  }
  .results-section {
    flex: 1;
  }
  .results-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
  }
  .results-header h3 {
    margin: 0;
  }
  .results-actions {
    display: flex;
    gap: .5rem;
  }
  .action-btn {
    padding: 0.35rem 0.7rem;
    font-size: 0.8rem;
    background-color: var(--background-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 0.25rem;
    color: var(--text-primary);
    cursor: pointer;
    transition: all 0.2s;
  }
  .names-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: .5rem;
  }
  .name-card {
    padding: 0.6rem;
    background-color: var(--background-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 0.25rem;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: .5rem;
  }
  .name-card:hover {
    background-color: var(--background-primary);
    border-color: var(--primary);
    transform: translateY(-2px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
  .name-text {
    flex: 1;
    color: var(--text-primary);
    font-size: 0.875rem;
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .copy-icon {
    opacity: 0;
    font-size: 0.85rem;
    transition: opacity 0.2s;
  }
  .name-card:hover .copy-icon {
    opacity: 1;
  }
  .empty-text {
    font-size: 0.85rem;
    text-align: center;
  }
</style>
