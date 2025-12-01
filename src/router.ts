import { createRouter, createWebHistory } from 'vue-router'

// 导入组件
import Books from './views/BooksView.vue'
import Edit from './views/EditView.vue'

// 定义路由规则
const routes = [
  {
    path: '/',
    name: 'Books',
    component: Books
  },
  {
    path: '/Edit',
    name: 'Edit',
    component: Edit
  }
]

// 创建路由实例
const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
