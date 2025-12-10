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

const paths = [
  { name: '基础', icon: '⚙️' },
  { name: 'AI接口', icon: '🤖' },
  { name: '提示词', icon: '💬' },
  { name: '文本预设', icon: '📋' },
  { name: '配置预设', icon: '📦' },
  { name: '快捷键', icon: '⌨️' },
  { name: '关于', icon: 'ℹ️' }
] as const

const defPath = ref(paths[2].name)

defineExpose({
  show: () => popupRef.value.show()
})
</script>

<template>
  <Popup title="⚙️ 软件配置" ref="popupRef" mask-closable>
    <div class="setting">
      <div class="setting-titles">
        <div v-for="item in paths" :key="item.name" class="setting-title" @click="defPath = item.name" :class="{ selected: defPath === item.name }">
          <span class="title-icon">{{ item.icon }}</span>
          <span class="title-text">{{ item.name }}</span>
        </div>
      </div>
      <div class="setting-content">
        <SettingBase :title="paths[0].name" v-if="defPath === paths[0].name" />

        <SettingAiInterface :title="paths[1].name" v-else-if="defPath === paths[1].name" />

        <SettingPrompt :title="paths[2].name" v-else-if="defPath === paths[2].name" />

        <SettingTextSnippet :title="paths[3].name" v-else-if="defPath === paths[3].name" />

        <SettingPreset :title="paths[4].name" v-else-if="defPath === paths[4].name" />

        <SettingShortcutKey :title="paths[5].name" v-else-if="defPath === paths[5].name" />

        <SettingRegarding :title="paths[6].name" v-else-if="defPath === paths[6].name" />
      </div>
    </div>
  </Popup>
</template>

<style>
.setting {
  width: 70rem;
  height: 40rem;
  display: flex;
  overflow: hidden;
}

.setting .selected {
  background-color: var(--primary);
  color: white;
  font-weight: 500;
}

.setting .selected::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 60%;
  background-color: white;
  border-radius: 0 2px 2px 0;
}

.setting-titles {
  display: flex;
  flex-direction: column;
  width: 10rem;
  background-color: var(--background-primary);
  border-right: 1px solid var(--border-color);
  padding: 0.5rem 0;
}

.setting-titles>div {
  padding: 0.75rem 1rem;
  cursor: pointer;
  font-size: 0.85rem;
  text-align: left;
  margin: 0.125rem 0.5rem;
  border-radius: 0.25rem;
  transition: all 0.2s;
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.title-icon {
  font-size: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 1.2rem;
}

.title-text {
  flex: 1;
}

.setting-titles>div:hover {
  background-color: var(--background-secondary);
  transform: translateX(2px);
}

.setting-content {
  flex: 1;
  width: 0;
  background-color: var(--background-primary);
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
