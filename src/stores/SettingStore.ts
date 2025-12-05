import { set } from 'lodash-es'
import { defineStore } from 'pinia'
import { ref } from 'vue'


export const useSettingStore = defineStore('setting', {
  persist: true,

  state: () => ({
    /** 当前主题 */
    theme: 'dark',
    /** 文章编辑器宽度模式 */
    editorWidthMode: ref<'auto' | 'fixed'>('auto'),
  }),

  getters: {
    /** 是否为深色主题 */
    isDark: state => state.theme === 'dark',
    /** 宽度模式的文字描述 */
    editorWidthModeText: state => state.editorWidthMode === 'auto' ? '自动' : '固定',
    /** 是否为自动宽度模式 */
    isAutoWidthMode: state => state.editorWidthMode === 'auto',
  },

  actions: {
    init() {
      this.setDark()
    },

    setEditorWidthMode(isAuto?: boolean) {
      if (isAuto !== undefined) {
        this.editorWidthMode = isAuto ? 'auto' : 'fixed'
      }

      if (this.editorWidthMode === 'auto') {
        document.querySelector('main .tu-container')?.classList.remove('narrow-margin')
      } else {
        document.querySelector('main .tu-container')?.classList.add('narrow-margin')
      }
    },

    setDark(dark?: boolean) {
      if (dark !== undefined) {
        this.theme = dark ? 'dark' : 'light'
      }
      if (this.isDark) {
        document.documentElement.setAttribute('data-theme', 'dark')
      } else {
        document.documentElement.removeAttribute('data-theme')
      }
    }
  }
})
