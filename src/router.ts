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

router.beforeEach((to, from, next) => {
  // 如果用户在编辑页面退出页面，下次访问页面时直接跳转到编辑页面
  if (localStorage.getItem('path') === '/edit' && localStorage.getItem('bookId')) {
    next('/Edit')
  } else {
    next()
  }
})

export default router
