import { $tips } from '@/plugins/notyf'
import { defineStore } from 'pinia'

export type Prompt = { id: string, title: string, prompt: string }

export const usePromptsStore = defineStore('promptsStore', {
  persist: true,

  state: () => ({
    v: [] as Prompt[]
  }),

  actions: {
    equal(v1: Prompt, v2: Prompt) {
      return v1.title === v2.title && v1.prompt === v2.prompt
    },

    add(v: Prompt) {
      if (this.v.find(item => this.equal(item, v))) return $tips.error('已存在')
      this.v.push(v)
    },

    remove(v: Prompt) {
      if (this.v.find(item => this.equal(item, v))) {
        this.v = this.v.filter(item => !this.equal(item, v))
      } else {
        $tips.error('不存在')
      }
    }
  }
})
