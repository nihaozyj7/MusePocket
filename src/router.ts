import { createRouter, createWebHistory } from 'vue-router'

// 导入组件
import Books from './views/BooksView.vue'
import Edit from './views/EditView.vue'
import { useSelectedBookStore } from './stores/SelectedBookStore'

// 定义路由规则
const routes = [
  {
    path: '/',
    name: 'Books',
    component: Books
  },
  {
    path: '/edit',
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
  if (to.path === '/' && from.path === '/edit') {
    useSelectedBookStore().$reset()
  }

  if (useSelectedBookStore().v) {
    return to.path === '/edit' ? next() : next('/edit')
  } else if (to.path === '/edit') {
    next('/')
  }

  next()
})

export default router
