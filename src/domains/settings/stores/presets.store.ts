import { $tips } from '@app/plugins'
import { defineStore } from 'pinia'
import type { SettingsPreset } from '@shared/types'

export const useSettingsPresetsStore = defineStore('settingsPresetsStore', {
  persist: true,

  state: () => ({
    v: [] as SettingsPreset[]
  }),

  actions: {
    equal(v1: SettingsPreset, v2: SettingsPreset) {
      return v1.id === v2.id
    },

    add(v: SettingsPreset) {
      if (this.v.find(item => this.equal(item, v))) return $tips.error('已存在')
      this.v.push(v)
    },

    update(v: SettingsPreset) {
      const index = this.v.findIndex(item => this.equal(item, v))
      if (index !== -1) {
        this.v[index] = v
      } else {
        $tips.error('不存在')
      }
    },

    remove(v: SettingsPreset) {
      if (this.v.find(item => this.equal(item, v))) {
        this.v = this.v.filter(item => !this.equal(item, v))
      } else {
        $tips.error('不存在')
      }
    }
  }
})
