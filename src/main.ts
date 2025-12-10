import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import './style.css'
import './variables.css'
import 'notyf/notyf.min.css'
import App from './App.vue'
import router from './router'
import { useSettingStore } from './stores/SettingStore'
import { preventDuplicateTab } from './utils'
import { initConfirmDialog } from './plugins/confirm'

preventDuplicateTab(() => {
  document.body.innerHTML = '<div style="width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; text-align: center; font-size: 24px;"> <p>请勿重复打开！该应用暂不支持多开，有数据丢失的风险<br /> 应用将在 <span id="time" style="color: red;">5</span> 秒后将关闭</p> </div>'
  let time = 5
  setInterval(() => {
    document.getElementById('time')!.textContent = String(--time)
  }, 1000)
  setTimeout(() => {
    window.close()
    throw new Error('Duplicate tab blocked')
  }, 5000)
})

const app = createApp(App)
const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

app.use(router)
app.use(pinia)

useSettingStore().init()

// 初始化确认对话框
initConfirmDialog()

app.mount('#app')
