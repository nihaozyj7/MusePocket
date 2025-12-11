const { app, BrowserWindow, protocol } = require('electron')
const path = require('path')
const { fileURLToPath } = require('url')

// 禁用硬件加速（可选，提高兼容性）
app.disableHardwareAcceleration()

let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    backgroundColor: '#ffffff',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      // 启用 IndexedDB
      enableRemoteModule: false,
      // 使用本地存储
      partition: 'persist:musepocket'
    },
    // icon: path.join(__dirname, '../public/icon.png'),  // 如果有图标文件，取消注释此行
    show: false
  })

  // 窗口准备好后再显示，避免白屏
  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  // 开发模式或生产模式
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    // 生产模式：使用 file:// 协议加载本地文件
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// 注册自定义协议（可选，如果需要更严格的隔离）
app.whenReady().then(() => {
  // 注册 file:// 协议的特权
  protocol.registerFileProtocol('file', (request, callback) => {
    const pathname = decodeURI(request.url.replace('file:///', ''))
    callback(pathname)
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// 禁止导航到外部链接
app.on('web-contents-created', (event, contents) => {
  contents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl)
    // 只允许 file:// 协议
    if (parsedUrl.protocol !== 'file:') {
      event.preventDefault()
    }
  })
})
