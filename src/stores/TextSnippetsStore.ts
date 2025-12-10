import { $tips } from '@/plugins/notyf'
import { defineStore } from 'pinia'
import type { TextSnippet } from '@/types'

export const useTextSnippetsStore = defineStore('textSnippetsStore', {
  persist: true,

  state: () => ({
    v: [] as TextSnippet[]
  }),

  actions: {
    equal(v1: TextSnippet, v2: TextSnippet) {
      return v1.id === v2.id
    },

    add(v: TextSnippet) {
      if (this.v.find(item => this.equal(item, v))) return $tips.error('已存在')
      this.v.push(v)
    },

    update(v: TextSnippet) {
      const index = this.v.findIndex(item => this.equal(item, v))
      if (index !== -1) {
        this.v[index] = v
      } else {
        $tips.error('不存在')
      }
    },

    remove(v: TextSnippet) {
      if (this.v.find(item => this.equal(item, v))) {
        this.v = this.v.filter(item => !this.equal(item, v))
      } else {
        $tips.error('不存在')
      }
    }
  }
})
