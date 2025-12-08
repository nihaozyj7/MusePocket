import type { Article } from '@/types'
import { defineStore } from 'pinia'

export const useSelectedArticleStore = defineStore('selectedArticle', {
  persist: true,

  state: () => ({
    v: null as Article | null
  }),

  actions: {
    isSelectedBook(article: Article) {
      return this.$state.v && article.id === this.$state.v.id
    }
  }
})
