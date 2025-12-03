import type { Article } from '@/types'
import { defineStore } from 'pinia'

export const useSelectedArticleStore = defineStore('selectedArticle', {
  persist: {
    afterHydrate: ctx => { }
  },

  state: () => ({
    selectedArticle: null as Article | null
  }),

  actions: {
    isSelectedBook(article: Article) {
      return this.$state.selectedArticle && article.id === this.$state.selectedArticle.id
    }
  }
})
