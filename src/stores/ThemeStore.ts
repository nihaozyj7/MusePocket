import { defineStore } from 'pinia'

function setTheme(isDark: boolean) {
  if (isDark) {
    document.documentElement.setAttribute('data-theme', 'dark')
  } else {
    document.documentElement.removeAttribute('data-theme')
  }
}

export const useThemeStore = defineStore('theme', {
  persist: {
    afterHydrate: ctx => {
      setTheme(ctx.store.$state.theme === 'dark')
    }
  },

  state: () => ({
    theme: 'dark'
  }),

  getters: {
    isDark: state => state.theme === 'dark'
  },

  actions: {
    toggleTheme() {
      this.theme = this.theme === 'dark' ? 'light' : 'dark'
      setTheme(this.isDark)
    }
  }
})
