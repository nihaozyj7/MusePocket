import { createApp } from 'vue'
import './reset.css'
import './style.css'
import './variables.css'
import 'virtual:uno.css'
import App from './App.vue'
import router from './router'

document.documentElement.setAttribute('data-theme', 'dark')

const app = createApp(App)

app.use(router)

app.mount('#app')
