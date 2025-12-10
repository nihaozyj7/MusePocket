import { $tips } from '@/plugins/notyf'
import { defineStore } from 'pinia'
import type { Preset } from '@/types'

export const usePresetsStore = defineStore('presetsStore', {
  persist: true,

  state: () => ({
    v: [] as Preset[]
  }),

  actions: {
    equal(v1: Preset, v2: Preset) {
      return v1.id === v2.id
    },

    add(v: Preset) {
      if (this.v.find(item => this.equal(item, v))) return $tips.error('已存在')
      this.v.push(v)
    },

    update(v: Preset) {
      const index = this.v.findIndex(item => this.equal(item, v))
      if (index !== -1) {
        this.v[index] = v
      } else {
        $tips.error('不存在')
      }
    },

    remove(v: Preset) {
      if (this.v.find(item => this.equal(item, v))) {
        this.v = this.v.filter(item => !this.equal(item, v))
      } else {
        $tips.error('不存在')
      }
    }
  }
})
