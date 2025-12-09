import { entitydb } from '@/db'
import { $tips } from '@/plugins/notyf'
import type { Article, Entity } from '@/types'
import { defineStore } from 'pinia'

export const useEntityStore = defineStore('entityStore ', {
  state: () => ({
    v: [] as Entity[]
  }),

  actions: {
    load(bookId: string) {
      entitydb.getBookEntities(bookId).then(res => {
        this.v = res
      }).catch(err => {
        $tips.error(err.message)
        console.error(err)
      })
    }
  }
})
