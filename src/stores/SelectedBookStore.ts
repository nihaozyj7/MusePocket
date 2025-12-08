import type { Book } from '@/types'
import { defineStore } from 'pinia'

export const useSelectedBookStore = defineStore('selectedBook', {
  persist: {
    afterHydrate: ctx => {

    }
  },

  state: () => ({
    v: null as Book | null
  }),

  actions: {
    isSelectedBook(book: Book) {
      return this.$state.v && book.id === this.$state.v.id
    }
  }
})
