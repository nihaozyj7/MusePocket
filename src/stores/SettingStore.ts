import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ShortcutKeys, BaseSettings } from '@/types'


export const useSettingStore = defineStore('setting', {
  persist: true,

  state: () => ({
    /** 当前主题 */
    theme: 'dark',
    /** 文章编辑器宽度模式 */
    editorWidthMode: ref<'auto' | 'fixed'>('auto'),
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
    } as ShortcutKeys,
    /** 基础设置 */
    baseSettings: {
      baseFontSize: 16,
      editorFontSize: 1,
      autoSaveInterval: 3,
      lineHeight: 2.5,
      enableParagraphSpacing: true,
      entityStyle: {
        underline: true,
        underlineColor: '#2997ff',
        background: false,
        backgroundColor: '#2997ff20',
        textColor: false,
        color: '#2997ff'
      },
      usePlainTextPaste: false,
      insertEntityAsPlainText: false,
      enableGridLines: false,
      gridLineStyle: 'dashed' as const,
      enableBackgroundImage: false,
      backgroundImage: ''
    } as BaseSettings
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
      this.applyBaseSettings()
    },

    /** 应用基础设置 */
    applyBaseSettings() {
      // 应用基准字体大小
      document.documentElement.style.fontSize = `${this.baseSettings.baseFontSize}px`

      // 应用实体样式
      this.applyEntityStyle()

      // 应用网格线
      this.applyGridLines()

      // 应用背景图片
      this.applyBackgroundImage()
    },

    /** 更新基准字体大小 */
    updateBaseFontSize(size: number) {
      this.baseSettings.baseFontSize = Math.max(12, Math.min(24, size))
      document.documentElement.style.fontSize = `${this.baseSettings.baseFontSize}px`
    },

    /** 更新编辑区字体大小 */
    updateEditorFontSize(size: number) {
      this.baseSettings.editorFontSize = Math.max(0.5, Math.min(3, size))
      const editor = document.querySelector('.tu-container .edit .body') as HTMLElement
      if (editor) {
        editor.style.fontSize = `${this.baseSettings.editorFontSize}rem`
      }
    },

    /** 更新自动保存间隔 */
    updateAutoSaveInterval(interval: number) {
      this.baseSettings.autoSaveInterval = Math.max(1, Math.min(60, interval))
    },

    /** 更新行高 */
    updateLineHeight(height: number) {
      this.baseSettings.lineHeight = Math.max(1, Math.min(5, height))
      const editor = document.querySelector('.tu-container .edit .body') as HTMLElement
      if (editor) {
        editor.style.lineHeight = `${this.baseSettings.lineHeight}`
      }
    },

    /** 切换段间距 */
    toggleParagraphSpacing(enabled: boolean) {
      this.baseSettings.enableParagraphSpacing = enabled
    },

    /** 应用实体样式 */
    applyEntityStyle() {
      const style = this.baseSettings.entityStyle
      let styleContent = '[data-entity-id] {'

      if (style.underline) {
        styleContent += `text-decoration: underline; text-decoration-color: ${style.underlineColor};`
      } else {
        styleContent += 'text-decoration: none;'
      }

      if (style.background) {
        styleContent += `background-color: ${style.backgroundColor};`
      }

      if (style.textColor) {
        styleContent += `color: ${style.color} !important;`
      }

      styleContent += '}'

      // 移除旧样式
      const oldStyle = document.getElementById('entity-style')
      if (oldStyle) oldStyle.remove()

      // 添加新样式
      const styleEl = document.createElement('style')
      styleEl.id = 'entity-style'
      styleEl.textContent = styleContent
      document.head.appendChild(styleEl)
    },

    /** 更新实体样式 */
    updateEntityStyle(key: keyof typeof this.baseSettings.entityStyle, value: any) {
      (this.baseSettings.entityStyle as any)[key] = value
      this.applyEntityStyle()
    },

    /** 应用网格线 */
    applyGridLines() {
      const editor = document.querySelector('.tu-container') as HTMLElement
      if (!editor) return

      if (this.baseSettings.enableGridLines) {
        const lineStyle = this.baseSettings.gridLineStyle === 'dashed' ? '1px dashed' : '1px solid'
        const color = 'var(--border-color)'
        editor.style.backgroundImage = `
          linear-gradient(${lineStyle} ${color}, transparent 1px),
          linear-gradient(90deg, ${lineStyle} ${color}, transparent 1px)
        `
        editor.style.backgroundSize = '20px 20px'
      } else {
        editor.style.backgroundImage = 'none'
      }
    },

    /** 切换网格线 */
    toggleGridLines(enabled: boolean) {
      this.baseSettings.enableGridLines = enabled
      this.applyGridLines()
    },

    /** 更新网格线样式 */
    updateGridLineStyle(style: 'dashed' | 'solid') {
      this.baseSettings.gridLineStyle = style
      this.applyGridLines()
    },

    /** 应用背景图片 */
    applyBackgroundImage() {
      const editor = document.querySelector('.tu-container') as HTMLElement
      if (!editor) return

      if (this.baseSettings.enableBackgroundImage && this.baseSettings.backgroundImage) {
        editor.style.backgroundImage = `url(${this.baseSettings.backgroundImage})`
        editor.style.backgroundSize = 'cover'
        editor.style.backgroundPosition = 'center'
        editor.style.backgroundRepeat = 'no-repeat'
      } else if (!this.baseSettings.enableGridLines) {
        editor.style.backgroundImage = 'none'
      }
    },

    /** 切换背景图片 */
    toggleBackgroundImage(enabled: boolean) {
      this.baseSettings.enableBackgroundImage = enabled
      this.applyBackgroundImage()
    },

    /** 设置背景图片 */
    setBackgroundImage(imageData: string) {
      this.baseSettings.backgroundImage = imageData
      this.applyBackgroundImage()
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

    /** 重置基础设置为默认值 */
    resetBaseSettings() {
      this.baseSettings = {
        baseFontSize: 16,
        editorFontSize: 1,
        autoSaveInterval: 3,
        lineHeight: 2.5,
        enableParagraphSpacing: true,
        entityStyle: {
          underline: true,
          underlineColor: '#2997ff',
          background: false,
          backgroundColor: '#2997ff20',
          textColor: false,
          color: '#2997ff'
        },
        usePlainTextPaste: false,
        insertEntityAsPlainText: false,
        enableGridLines: false,
        gridLineStyle: 'dashed',
        enableBackgroundImage: false,
        backgroundImage: ''
      }
      this.applyBaseSettings()
    }
  }
})
