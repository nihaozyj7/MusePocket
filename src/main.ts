import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import './style.css'
import './variables.css'
import App from './App.vue'
import router from './router'
import { useSettingStore } from './stores/SettingStore'

const app = createApp(App)
const pinia = createPinia()

pinia.use(piniaPluginPersistedstate)

app.use(router)
app.use(pinia)

useSettingStore().init()

app.mount('#app')

