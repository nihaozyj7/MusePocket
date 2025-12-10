import { $tips } from '@/plugins/notyf'
import { type OpenAiParams } from './../apis/index'
import { defineStore } from 'pinia'

export const useModelsStore = defineStore('modelsStore', {
  persist: true,

  state: () => ({
    v: [] as OpenAiParams[]
  }),

  actions: {
    equal(v1: OpenAiParams, v2: OpenAiParams) {
      return v1.model === v2.model && v1.apiKey === v2.apiKey && v1.baseUrl === v2.baseUrl
    },

    add(v: OpenAiParams) {
      if (this.v.find(item => this.equal(item, v))) return $tips.error('已存在')
      this.v.push(v)
    },

    remove(v: OpenAiParams) {
      if (this.v.find(item => this.equal(item, v))) {
        this.v = this.v.filter(item => !this.equal(item, v))
      } else {
        $tips.error('不存在')
      }
    }
  }
})
