import { defineConfig, presetAttributify, presetIcons, presetTypography, presetUno, transformerDirectives, transformerVariantGroup } from 'unocss'

export default defineConfig({
  presets: [
    presetUno(),
    presetAttributify(),
    presetIcons(),
    presetTypography(),
  ],
  transformers: [
    transformerDirectives(),
    transformerVariantGroup(),
  ],
  preflights: [
    {
      getCSS: () => `
        * {
          padding: 0;
          margin: 0;
          border: none;
          outline: none;
          text-decoration: none;
          box-sizing: border-box;
          font-size: 100%;
          color: var(--text-secondary);
        }
        
        html {
          font-size: 16px;
        }
        
        html, body, #app {
          height: 100%;
          width: 100%;
          overflow: hidden;
          color: var(--text-primary);
          background-color: var(--background-primary);
          font-family: 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', '微软雅黑', 'Helvetica Neue', Helvetica, Arial, sans-serif;
          user-select: none;
        }
        
        ::-webkit-scrollbar {
          width: .3rem;
        }
        
        ::-webkit-scrollbar-thumb {
          background-color: var(--background-secondary);
          border-radius: .25rem;
          cursor: grab;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background-color: var(--primary-dark);
        }
        
        input, textarea {
          background-color: transparent;
        }
        
        textarea {
          resize: none;
        }
        
        .hide {
          display: none !important;
        }
        
        button {
          transition: all 0.2s ease-in-out;
          cursor: pointer;
          background-color: var(--background-tertiary);
          color: var(--text-primary);
          font-size: 0.8rem;
          padding: 0.25rem 0.5rem;
          border: 1px solid var(--border-color);
          border-radius: 0.25rem;
        }
        
        button:hover:not(:disabled) {
          opacity: .6;
        }
        
        button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .flex {
          display: flex;
          align-items: center;
        }
        
        .scroll-container {
          width: 100%;
          height: 100%;
          overflow: auto;
        }
        
        .margin-left {
          margin-left: 1rem;
        }
        
        .margin-right {
          margin-right: 1rem;
        }
        
        .popup {
          position: absolute;
          color: var(--text-primary);
          background-color: var(--background-primary);
          border-radius: 0.25rem;
          display: inline-block;
          border: 1px solid var(--border-color);
          padding: 0.5rem;
          box-shadow: var(--shadow-md);
        }
        
        [data-entity-id] {
          cursor: pointer;
          user-select: text;
          text-decoration: underline;
        }
        
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        
        input[type="number"] {
          appearance: textfield;
          -moz-appearance: textfield;
        }
        
        .notyf__ripple {
          background-color: transparent !important;
        }
        
        .notyf__wrapper {
          padding: .5rem !important;
        }
        
        .notyf__toast--success {
          background-color: var(--background-secondary);
          border: 1px solid var(--border-color);
          border-radius: .25rem;
        }
        
        .notyf__toast--success .notyf__message {
          color: var(--success);
        }
        
        .notyf__toast--error {
          background-color: var(--background-secondary);
          border: 1px solid var(--border-color);
          border-radius: .25rem;
        }
        
        .notyf__toast--error .notyf__message {
          color: var(--danger);
        }
        
        .notyf__message {
          font-size: .8rem !important;
        }
        
        .tu-container .edit .body>p {
          color: var(--text-primary);
        }
        
        .tu-container .edit .body>p::before {
          content: '';
        }
      `
    }
  ],
  shortcuts: {
    // 布局
    'flex-center': 'flex items-center justify-center',
    'flex-between': 'flex items-center justify-between',
    'flex-col': 'flex flex-col',
    'flex-1': 'flex-1',
    'w-full': 'w-full',
    'h-full': 'h-full',
    
    // 主题色
    'text-primary': 'color-[var(--text-primary)]',
    'text-secondary': 'color-[var(--text-secondary)]',
    'text-tertiary': 'color-[var(--text-tertiary)]',
    'bg-primary': 'bg-[var(--background-primary)]',
    'bg-secondary': 'bg-[var(--background-secondary)]',
    'bg-tertiary': 'bg-[var(--background-tertiary)]',
    'border-color': 'border-color-[var(--border-color)]',
    
    // 按钮
    'btn-base': 'px-2 py-1 text-sm rounded cursor-pointer transition-all duration-200 border border-[var(--border-color)] bg-[var(--background-tertiary)] text-[var(--text-primary)] hover:opacity-60 disabled:opacity-50 disabled:cursor-not-allowed',
    'btn-primary': 'btn-base bg-[var(--primary)] text-white border-none hover:opacity-90',
    'btn-secondary': 'btn-base hover:bg-[var(--background-secondary)]',
    'btn-danger': 'btn-base bg-[var(--danger)] text-white border-none hover:opacity-90',
    'btn-small': 'btn-base px-3 py-1',
    
    // 表单
    'input-base': 'w-full px-2 py-2 border border-[var(--border-color)] rounded bg-[var(--background-secondary)] text-[var(--text-primary)] text-sm focus:border-[var(--primary)] focus:outline-none transition-colors',
    'form-item': 'mb-4',
    
    // 组件
    'card-base': 'p-4 bg-[var(--background-secondary)] border border-[var(--border-color)] rounded-lg hover:border-[var(--primary)] hover:shadow-md transition-all',
    'empty-state': 'flex flex-col items-center justify-center p-12 text-center text-[var(--text-tertiary)]',
    'tabs-base': 'flex justify-between bg-[var(--background-tertiary)] h-9 rounded overflow-hidden m-2',
    'tab-button': 'flex-1 px-2 py-1 border-r border-[var(--border-color)] rounded-none bg-transparent text-[var(--text-secondary)] cursor-pointer transition-all hover:text-[var(--text-primary)] last:border-r-0',
    'tab-button-active': 'text-[var(--primary)] border-b-2 border-[var(--primary)]',
    'popup-base': 'absolute bg-[var(--background-primary)] rounded border border-[var(--border-color)] p-2 shadow-md',
    'scroll-container': 'w-full h-full overflow-auto',
    'actions': 'flex gap-2',
    'actions-center': 'flex gap-2 justify-center',
    'actions-end': 'flex gap-2 justify-end',
    'divider': 'h-px bg-[var(--border-color)] my-4',
    'description': 'text-[var(--text-secondary)] text-[0.85rem] leading-normal mb-3',
    'info-box': 'bg-[var(--background-secondary)] border-l-3 border-[var(--primary)] p-3 rounded my-4',
    'warning-box': 'p-3 bg-[rgba(255,193,7,0.1)] border border-[rgba(255,193,7,0.3)] rounded text-[var(--text-primary)] text-sm',
    'progress-base': 'p-2 bg-[var(--background-tertiary)] rounded text-sm text-[var(--text-secondary)] text-center',
    'checkbox-label': 'flex items-center gap-2 text-sm cursor-pointer select-none',
    'select-box': 'w-full px-2 py-2 border border-[var(--border-color)] rounded bg-[var(--background-tertiary)] text-[var(--text-primary)] text-sm cursor-pointer focus:border-[var(--primary)] focus:outline-none transition-colors',
    'textarea-box': 'w-full px-2 py-2 border border-[var(--border-color)] rounded bg-[var(--background-secondary)] text-[var(--text-primary)] text-sm resize-y min-h-[80px] focus:border-[var(--primary)] focus:outline-none transition-colors font-inherit',
    
    // common-components.css 迁移
    'form-item-label': 'block mb-2 text-[0.875rem] text-secondary font-medium',
    'form-item-input': 'w-full px-2 py-2 border border-color rounded bg-secondary text-primary text-[0.875rem] focus:border-primary focus:outline-none transition-colors',
    'btn-primary-lg': 'px-4 py-2 bg-primary text-white border-none rounded text-[0.875rem] font-medium cursor-pointer transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed',
    'btn-small-sm': 'px-[0.25rem] py-[0.75rem] text-[0.875rem] bg-tertiary text-primary border border-color rounded cursor-pointer transition-all hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed',
    'btn-secondary-lg': 'px-4 py-2 text-[0.875rem] bg-tertiary text-primary border border-color rounded cursor-pointer transition-all hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed',
    'btn-danger-lg': 'px-4 py-2 bg-danger text-white border-none rounded cursor-pointer transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed',
    'tabs': 'flex justify-between bg-tertiary h-[2.2rem] rounded overflow-hidden m-2',
    'tabs-btn': 'flex-1 px-2 py-1 border-r border-color rounded-none bg-transparent text-secondary cursor-pointer transition-all hover:text-primary last:border-r-0',
    'tabs-btn-active': 'text-primary border-b-2 border-primary',
    'empty-state-p': 'text-[0.875rem] m-1 leading-normal',
    'progress-error': 'bg-red-500/10 text-danger',
    'card': 'p-4 bg-secondary border border-color rounded-lg hover:border-primary hover:shadow-md transition-all',
    'warning': 'text-warning text-[0.85rem]',
    'actions-gap': 'flex gap-2',
    'select-box-focus': 'w-full px-2 py-2 border border-color rounded bg-tertiary text-primary text-sm cursor-pointer focus:border-primary focus:outline-none transition-colors',
    'textarea-box-focus': 'w-full px-2 py-2 border border-color rounded bg-secondary text-primary text-sm resize-y min-h-[80px] focus:border-primary focus:outline-none transition-colors font-inherit',
    'input-box-focus': 'w-full px-2 py-2 border border-color rounded bg-secondary text-primary text-sm transition-colors focus:border-primary focus:outline-none',
    'wfull': 'w-full',
    'issues-header': 'flex justify-between items-center p-2 m-2 rounded bg-tertiary',
    'header': 'mt-2 border-b border-color mb-2',
    'header-h3': 'm-0 m-2 mb-4',
    'card-hover': 'p-4 bg-secondary border border-color rounded-lg transition-all hover:border-primary hover:shadow-[0_2px_8px_rgba(0,0,0,0.1)]',
    'button-m': 'px-2 py-1 rounded bg-tertiary text-[0.85rem] border border-color cursor-pointer transition-all hover:opacity-60',
    'line-clamp-2': 'overflow-hidden text-ellipsis display--webkit-box webkit-line-clamp-2 webkit-box-orient-vertical',
  },
  rules: [
    ['border-l-3', { 'border-left-width': '3px' }],
  ],
  theme: {
    colors: {
      primary: 'var(--primary)',
      'primary-light': 'var(--primary-light)',
      'primary-dark': 'var(--primary-dark)',
      secondary: 'var(--secondary)',
      success: 'var(--success)',
      warning: 'var(--warning)',
      danger: 'var(--danger)',
      info: 'var(--info)',
    },
  },
})
