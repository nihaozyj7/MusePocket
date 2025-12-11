import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ShortcutKeys, BaseSettings } from '@/types'
import { StyleManager, getImageBase64ByID } from '@/utils'
import { getDefaultBaseSettings } from '@/defaultObjects'

/** AI工具配置 */
interface AiToolConfig {
  modelId?: string  // 模型的唯一标识（baseUrl + model）
  systemPrompt?: string
  userPrompt?: string
  selectedPromptId?: string
  includeExistingEntities?: boolean
}

/** AI工具持久化配置 */
interface AiToolsSettings {
  aiSuggestion?: AiToolConfig
  proofread?: AiToolConfig
  entityExtract?: AiToolConfig
}

// 全局样式管理器实例
let styleManager: StyleManager | null = null

const getStyleManager = () => {
  if (!styleManager) {
    styleManager = new StyleManager()
  }
  return styleManager
}


export const useSettingStore = defineStore('setting', {
  persist: true,

  state: () => ({
    /** 当前主题 */
    theme: 'dark',
    /** 文章编辑器宽度模式 */
    editorWidthMode: ref<'auto' | 'fixed'>('auto'),
    /** 编辑区右侧工具栏展开的抽屉宽度 */
    drawerWidth: 400,
    /** 当前侧边栏中正在显示的工具标题 */
    rutilsTitle: null as string | null,
    /** 快捷键配置 */
    shortcutKeys: {
      save: 'Ctrl+S',
      format: 'Ctrl+Shift+F',
      find: 'Ctrl+F',
      replace: 'Ctrl+H',
      search: 'Ctrl+P'
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
      enableGridLines: true,
      gridLineStyle: 'dashed' as const,
      enableBackgroundImage: false,
      backgroundImageId: '',
      autoCompleteDelay: 0,
      autoCompleteConfirmKey: 'both' as const
    } as BaseSettings,
    /** AI工具配置 */
    aiToolsSettings: {
      aiSuggestion: {},
      proofread: {},
      entityExtract: {}
    } as AiToolsSettings
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
      // 兼容性处理：如果旧配置没有 autoCompleteConfirmKey 字段，设置默认值
      if (!this.baseSettings.autoCompleteConfirmKey) {
        this.baseSettings.autoCompleteConfirmKey = 'both'
      }

      this.setDark()
      this.applyBaseSettings()
    },

    /** 应用基础设置 */
    applyBaseSettings() {
      // 应用基准字体大小
      document.documentElement.style.fontSize = `${this.baseSettings.baseFontSize}px`

      // 初始化样式管理器并应用行高和段间距
      const manager = getStyleManager()
      manager.add('.body>p', { minHeight: this.baseSettings.lineHeight + 'rem' })

      if (this.baseSettings.enableParagraphSpacing) {
        manager.add('.body>p', {
          'margin-bottom': this.baseSettings.lineHeight + 'rem'
        })
      }

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

    /** 更新自动完成延迟 */
    updateAutoCompleteDelay(delay: number) {
      this.baseSettings.autoCompleteDelay = Math.max(0, Math.min(2000, delay))
    },

    /** 更新行高 */
    updateLineHeight(height: number) {
      this.baseSettings.lineHeight = Math.max(1, Math.min(5, height))
      const editor = document.querySelector('.tu-container .edit .body') as HTMLElement
      if (editor) {
        editor.style.lineHeight = `${this.baseSettings.lineHeight}`
      }

      // 更新 minHeight
      const manager = getStyleManager()
      manager.add('.body>p', { minHeight: this.baseSettings.lineHeight + 'rem' })

      // 如果开启了段间距，也要同步更新 margin-bottom
      if (this.baseSettings.enableParagraphSpacing) {
        manager.add('.body>p', {
          'margin-bottom': this.baseSettings.lineHeight + 'rem'
        })
      }
    },

    /** 切换段间距 */
    toggleParagraphSpacing(enabled: boolean) {
      this.baseSettings.enableParagraphSpacing = enabled
      const manager = getStyleManager()

      if (enabled) {
        // 开启段间距：添加 margin-bottom
        manager.add('.body>p', {
          'margin-bottom': this.baseSettings.lineHeight + 'rem'
        })
      } else {
        // 关闭段间距：移除 margin-bottom 属性
        manager.removeProperty('.body>p', 'margin-bottom')
      }
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
      // 网格线由 Editor 组件的 canvas 绘制，这里不需要应用样式
      // Editor 会直接读取 settingStore.baseSettings 来绘制
    },

    /** 切换网格线 */
    toggleGridLines(enabled: boolean) {
      this.baseSettings.enableGridLines = enabled
      // 网格线由 Editor 组件负责绘制
    },

    /** 更新网格线样式 */
    updateGridLineStyle(style: 'dashed' | 'solid') {
      this.baseSettings.gridLineStyle = style
      // 网格线由 Editor 组件负责绘制
    },

    /** 应用背景图片 */
    async applyBackgroundImage() {
      // 直接应用到 body 元素，这样所有视图都能共享背景图片，避免路由切换时闪烁
      const body = document.body
      const root = document.documentElement

      if (this.baseSettings.enableBackgroundImage && this.baseSettings.backgroundImageId) {
        // 启用背景图片时，从数据库读取图片
        try {
          const imageUrl = await getImageBase64ByID(this.baseSettings.backgroundImageId)
          if (imageUrl && imageUrl !== '/cover/default.png') {
            body.style.backgroundImage = `url(${imageUrl})`
            body.style.backgroundSize = 'cover'
            body.style.backgroundPosition = 'center'
            body.style.backgroundRepeat = 'no-repeat'
            body.style.backgroundAttachment = 'fixed'

            // 使用半透明背景色变量（已在 variables.css 中定义）
            root.style.setProperty('--background-primary', this.isDark ? 'rgba(30, 30, 30, 0.9)' : 'rgba(184, 186, 189, 0.9)')
            root.style.setProperty('--background-secondary', this.isDark ? 'rgba(37, 37, 38, 0.7)' : 'rgba(189, 189, 189, 0.7)')
            root.style.setProperty('--background-tertiary', this.isDark ? 'rgba(51, 51, 51, 0.8)' : 'rgba(196, 206, 215, 0.8)')
          } else {
            // 图片不存在，清除背景
            body.style.backgroundImage = 'none'
            root.style.setProperty('--background-primary', this.isDark ? 'rgb(30, 30, 30)' : 'rgb(184, 186, 189)')
            root.style.setProperty('--background-secondary', this.isDark ? 'rgb(37, 37, 38)' : 'rgb(189, 189, 189, 0.7)')
            root.style.setProperty('--background-tertiary', this.isDark ? 'rgb(51, 51, 51)' : 'rgb(196, 206, 215)')
          }
        } catch (err) {
          console.error('加载背景图片失败:', err)
          body.style.backgroundImage = 'none'
          root.style.setProperty('--background-primary', this.isDark ? 'rgb(30, 30, 30)' : 'rgb(248, 249, 250)')
          root.style.setProperty('--background-secondary', this.isDark ? 'rgb(37, 37, 38)' : 'rgb(233, 236, 239)')
          root.style.setProperty('--background-tertiary', this.isDark ? 'rgb(51, 51, 51)' : 'rgb(222, 226, 230)')
        }
      } else {
        // 未启用背景图片时，使用不透明背景色，避免阴影效果
        body.style.backgroundImage = 'none'

        // 使用不透明背景色
        root.style.setProperty('--background-primary', this.isDark ? 'rgb(30, 30, 30)' : 'rgb(248, 249, 250)')
        root.style.setProperty('--background-secondary', this.isDark ? 'rgb(37, 37, 38)' : 'rgb(233, 236, 239)')
        root.style.setProperty('--background-tertiary', this.isDark ? 'rgb(51, 51, 51)' : 'rgb(222, 226, 230)')
      }
    },

    /** 切换背景图片 */
    toggleBackgroundImage(enabled: boolean) {
      this.baseSettings.enableBackgroundImage = enabled
      this.applyBackgroundImage()
    },

    /** 设置背景图片 */
    setBackgroundImage(imageId: string) {
      this.baseSettings.backgroundImageId = imageId
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
      // 切换主题后重新应用背景色
      this.applyBackgroundImage()
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
        replace: 'Ctrl+H',
        search: 'Ctrl+P'
      }
    },

    /** 重置基础设置为默认值 */
    resetBaseSettings() {
      this.baseSettings = getDefaultBaseSettings()
      this.applyBaseSettings()
    },

    /** 保存AI工具配置 */
    saveAiToolConfig(toolName: keyof AiToolsSettings, config: AiToolConfig) {
      this.aiToolsSettings[toolName] = { ...config }
    },

    /** 获取AI工具配置 */
    getAiToolConfig(toolName: keyof AiToolsSettings): AiToolConfig {
      return this.aiToolsSettings[toolName] || {}
    },

    /** 清空AI工具配置 */
    clearAiToolConfig(toolName: keyof AiToolsSettings) {
      this.aiToolsSettings[toolName] = {}
    }
  }
})
