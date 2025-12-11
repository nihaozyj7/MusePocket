import { createRouter, createWebHashHistory } from 'vue-router'
import { useSelectedBookStore } from '@domains/library/stores/selected-book.store'

// 导入组件 (懒加载)
const Books = () => import('@pages/BooksPage.vue')
const Edit = () => import('@pages/EditPage.vue')

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
  history: createWebHashHistory(),
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
