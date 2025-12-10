<script setup lang="ts">
import { onMounted, ref } from 'vue'
import Popup from './Popup.vue'
import SettingBase from './SettingBase.vue'
import SettingAiInterface from './SettingAiInterface.vue'
import SettingPrompt from './SettingPrompt.vue'
import SettingPreset from './SettingPreset.vue'
import SettingTextSnippet from './SettingTextSnippet.vue'
import SettingShortcutKey from './SettingShortcutKey.vue'
import SettingRegarding from './SettingRegarding.vue'


const popupRef = ref<InstanceType<typeof Popup>>()

const paths = ['基础', 'AI接口', '提示词', '文本预设', '配置预设', '快捷键', '关于'] as const

const defPath = ref<typeof paths[number]>(paths[2])

defineExpose({
  show: () => popupRef.value.show()
})
</script>

<template>
  <Popup title="⚙️ 软件配置" ref="popupRef" mask-closable>
    <div class="setting">
      <div class="setting-titles">
        <div v-for="title in paths" :key="title" class="setting-title" @click="defPath = title" :class="{ selected: defPath === title }">
          {{ title }}
        </div>
      </div>
      <div class="setting-content">
        <SettingBase :title="paths[0]" v-if="defPath === paths[0]" />

        <SettingAiInterface :title="paths[1]" v-else-if="defPath === paths[1]" />

        <SettingPrompt :title="paths[2]" v-else-if="defPath === paths[2]" />

        <SettingTextSnippet :title="paths[3]" v-else-if="defPath === paths[3]" />

        <SettingPreset :title="paths[4]" v-else-if="defPath === paths[4]" />

        <SettingShortcutKey :title="paths[5]" v-else-if="defPath === paths[5]" />

        <SettingRegarding :title="paths[6]" v-else-if="defPath === paths[6]" />
      </div>
    </div>
  </Popup>
</template>

<style>
.setting {
  width: 47.5rem;
  height: 31.25rem;
  display: flex;
}

.setting .selected {
  background-color: var(--background-tertiary);
  color: var(--primary)
}

.setting-titles {
  display: flex;
  flex-direction: column;
  width: 6rem;
  background-color: var(--background-secondary);
  margin: .25rem;
}

.setting-titles>div {
  padding: .5rem 1rem;
  cursor: pointer;
  font-size: .8rem;
  text-align: right;
}

.setting-titles>div:hover {
  background-color: var(--background-tertiary);
}

.setting-content {
  flex: 1;
  width: 0;
  margin: .25rem .25rem .25rem 0;
}

.setting-content>div {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.setting-content .title {
  width: 100%;
  padding: .5rem;
  font-size: .8rem;
  border-bottom: 1px solid var(--border-color);
}

.setting-content .content {
  flex: 1;
  height: 0;
  overflow-y: auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
}

/* 通用输入框样式 */
input[type="text"],
input[type="number"],
select,
textarea {
  padding: 0.5rem;
  border: 1px solid var(--border-color);
  border-radius: 0.25rem;
  background-color: var(--background-secondary);
  color: var(--text-primary);
  font-size: 0.85rem;
  transition: border-color 0.2s, box-shadow 0.2s;
}

input[type="text"]:focus,
input[type="number"]:focus,
select:focus,
textarea:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 2px rgba(var(--primary-rgb), 0.1);
}

input[type="text"]:disabled,
input[type="number"]:disabled,
select:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

input[type="number"] {
  width: 5rem;
}

textarea {
  resize: vertical;
  min-height: 6rem;
}

/* 通用按钮样式 */
button {
  padding: 0.5rem 1rem;
  border: 1px solid var(--border-color);
  border-radius: 0.25rem;
  background-color: var(--background-tertiary);
  color: var(--text-primary);
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

button:hover:not(:disabled) {
  background-color: var(--primary);
  color: white;
  border-color: var(--primary);
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Checkbox 样式 */
input[type="checkbox"] {
  width: 1rem;
  height: 1rem;
  cursor: pointer;
}

input[type="color"] {
  width: 3rem;
  height: 2rem;
  border: 1px solid var(--border-color);
  border-radius: 0.25rem;
  cursor: pointer;
  background-color: var(--background-secondary);
}

input[type="color"]:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
