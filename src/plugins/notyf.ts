import { Notyf } from "notyf"

const tips = new Notyf({
  position: { x: 'center', y: 'top' }, // 右上角
  duration: 3000,
  types: [
    {
      type: 'info',
      background: 'var(--background-tertiary)',
    },
    {
      type: 'error',
      background: 'var(--background-tertiary)',
    },
  ],
})


export const $tips = {
  success(message: string, timeout = 1500) {
    tips.success({ message, duration: timeout })
  },
  error(message: string, timeout = 1500) {
    tips.error({ message, duration: timeout })
  }
}
