<script setup lang="ts">
import { onMounted, ref } from 'vue'
import Popup from './Popup.vue'

const popupRef = ref<InstanceType<typeof Popup>>()

const paths = ['基础', 'AI接口', '提示词', '快捷键', '关于'] as const

const defPath = ref<typeof paths[number]>(paths[0])

onMounted(() => {
  popupRef.value?.show()
})

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
        <div class="base-setting" v-if="defPath === paths[0]">
          <div class="title">{{ paths[0] }}</div>
          <div class="content">
            <p v-for="value in 200">1212</p>
          </div>
        </div>

        <div class="ai-interface-setting" v-else-if="defPath === paths[1]">
          <div class="title">{{ paths[1] }}</div>
          <div class="content"></div>
        </div>

        <div class="prompt-setting" v-else-if="defPath === paths[2]">
          <div class="title">{{ paths[2] }}</div>
          <div class="content"></div>
        </div>

        <div class="shortcut-key-setting" v-else-if="defPath === paths[3]">
          <div class="title">{{ paths[3] }}</div>
          <div class="content"></div>
        </div>

        <div class="regarding-setting" v-else-if="defPath === paths[4]">
          <div class="title">{{ paths[4] }}</div>
          <div class="content"></div>
        </div>
      </div>
    </div>
  </Popup>
</template>

<style>
.setting {
  width: 720px;
  height: 500px;
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
  margin: .5rem .25rem;
}
</style>
