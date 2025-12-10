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
            <label class="sitem" for="I0L9K">
              <span>基准尺寸，影响全局文字和UI</span>
              <input id="I0L9K" type="number">
              <span>px</span>
            </label>
            <label class="sitem" for="F0U3Y">
              <span>编辑区文字尺寸，该值为基准尺寸的倍数</span>
              <input id="F0U3Y" type="number">
              <span>rem</span>
            </label>
            <label class="sitem" for="B7T3O">
              <span>自动保存间隔为</span>
              <input type="number" id="B7T3O">
              <span>秒，默认3秒</span>
            </label>
            <label class="sitem" for="Q3F8Z">
              <span>字体行高，默认为2.5倍字体高度，调整行高为：</span>
              <input type="number" id="Q3F8Z">
              <span>倍字体高度</span>
            </label>
            <label class="sitem" for="P7W5H">
              <input id="P7W5H" type="checkbox">
              <span>段间距，开启后，段落之间会有一个不可编辑的当前行高的空白行</span>
            </label>
            <div class="sitem">
              <span>突出文章中实体的样式</span>
              <label class="sitem" for="K1O1L">
                <input id="K1O1L" type="checkbox">
                <span>下划线</span>
                <input type="color">
              </label>
              <label class="sitem" for="I3I9S">
                <input id="I3I9S" type="checkbox">
                <span>背景色</span>
                <input type="color">
              </label>
              <label class="sitem" for="Q3L3C">
                <input id="Q3L3C" type="checkbox">
                <span>文字色</span>
                <input type="color">
              </label>
            </div>
            <label class="sitem" for="U5K7L">
              <input id="U5K7L" type="checkbox">
              <span>复制粘贴时使用纯文本，开启后，复制文章中的实体节点，粘贴后将变更为普通文本</span>
            </label>
            <label class="sitem" for="L7V1A">
              <input id="L7V1A" type="checkbox">
              <span>控制插入实体时，是否插入普通文本，不勾选时插入的是实体节点，实体内容将同步更新文章中的节点</span>
            </label>
            <div class="sitem" for="L7V1A">
              <span>配置背景，</span>
              <label class="sitem" for="R8X7T">
                <input id="R8X7T" type="checkbox">
                <span>编辑区启用网格线</span>
                <select>
                  <option value="">虚线</option>
                  <option value="">实线</option>
                </select>
              </label>
              <label class="sitem" for="K1T8A">
                <input id="K1T8A" type="checkbox">
                <span>编辑界面启用图片背景</span>
                <button class="selete-image-button">🖼️ 选择图片</button>
              </label>
            </div>
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
