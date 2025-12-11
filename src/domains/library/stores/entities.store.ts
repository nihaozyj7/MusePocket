import { entitydb } from '@shared/db'
import { $tips } from '@app/plugins'
import type { Article, Entity } from '@shared/types'
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
