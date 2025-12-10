<script setup lang="ts">
const props = defineProps<{ title: string }>()
</script>

<template>
  <div class="base-setting">
    <div class="title">{{ props.title }}</div>
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
</template>

<style scoped></style>
