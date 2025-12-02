import type { Book } from '@/types'
import { defineStore } from 'pinia'

export const useSelectedBookStore = defineStore('selectedBook', {
  persist: {
    afterHydrate: ctx => {

    }
  },

  state: () => ({
    selectedBook: null as Book | null
  }),

  actions: {
    isSelectedBook(book: Book) {
      return this.$state.selectedBook && book.id === this.$state.selectedBook.id
    }
  }
})
