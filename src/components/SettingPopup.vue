<script setup lang="ts">
import { onMounted, ref } from 'vue'
import Popup from './Popup.vue'
import SettingBase from './SettingBase.vue'
import SettingAiInterface from './SettingAiInterface.vue'
import SettingPrompt from './SettingPrompt.vue'
import SettingPreset from './SettingPreset.vue'
import SettingShortcutKey from './SettingShortcutKey.vue'
import SettingRegarding from './SettingRegarding.vue'


const popupRef = ref<InstanceType<typeof Popup>>()

const paths = ['基础', 'AI接口', '提示词', '预设', '快捷键', '关于'] as const

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

        <SettingPreset :title="paths[3]" v-else-if="defPath === paths[3]" />

        <SettingShortcutKey :title="paths[4]" v-else-if="defPath === paths[4]" />

        <SettingRegarding :title="paths[5]" v-else-if="defPath === paths[5]" />
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
  margin: .5rem .5rem .25rem .5rem;
}

.sitem {
  display: flex;
  height: 3rem;
  align-items: center;
  font-size: .8rem;
}

label.sitem {
  cursor: pointer;
}

.sitem>[type="checkbox"] {
  margin-right: 1rem;
}

.sitem>input[type="number"] {
  width: 2.2rem;
  border: 1px solid var(--border-color);
  margin: 0 .5rem;
  padding: .25rem .5rem;
  border-radius: .25rem;
}

.sitem>.sitem {
  margin-left: .5rem;
}

.sitem>.sitem>[type="checkbox"] {
  margin-right: .25rem;
}

.selete-image-button {
  max-width: 260px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sitem>.sitem button {
  margin-left: .25rem;
  border-bottom: 1px solid var(--success);
  line-height: 1rem;
}

.sitem select {
  background-color: var(--background-primary);
  border: 1px solid var(--border-color);
  margin-left: .25rem;
  border-radius: .25rem;
}
</style>
