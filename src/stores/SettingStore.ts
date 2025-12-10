import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ShortcutKeys } from '@/types'


export const useSettingStore = defineStore('setting', {
  persist: true,

  state: () => ({
    /** 当前主题 */
    theme: 'dark',
    /** 文章编辑器宽度模式 */
    editorWidthMode: ref<'auto' | 'fixed'>('auto'),
    /** 行高 */
    lineHeight: 2.5,
    /** 启用段间距 */
    enableParagraphSpacing: true,
    /** 编辑区右侧工具栏展开的抽屉宽度 */
    drawerWidth: 500,
    /** 当前侧边栏中正在显示的工具标题 */
    rutilsTitle: null as string | null,
    /** 快捷键配置 */
    shortcutKeys: {
      save: 'Ctrl+S',
      format: 'Ctrl+Shift+F',
      find: 'Ctrl+F',
      replace: 'Ctrl+H'
    } as ShortcutKeys
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
    },

    /** 更新快捷键配置 */
    updateShortcutKey(key: keyof ShortcutKeys, value: string) {
      this.shortcutKeys[key] = value
    },

    /** 重置快捷键为默认值 */
    resetShortcutKeys() {
      this.shortcutKeys = {
        save: 'Ctrl+S',
        format: 'Ctrl+Shift+F',
        find: 'Ctrl+F',
        replace: 'Ctrl+H'
      }
    }
  }
})
