const { app, BrowserWindow, protocol, screen, Menu } = require('electron')
const path = require('path')
const fs = require('fs')
const { fileURLToPath } = require('url')

// 禁用硬件加速（可选，提高兼容性）
app.disableHardwareAcceleration()

let mainWindow

// 窗口状态配置文件路径
const windowStateFile = path.join(app.getPath('userData'), 'window-state.json')

// 读取窗口状态
function loadWindowState() {
  try {
    if (fs.existsSync(windowStateFile)) {
      const data = fs.readFileSync(windowStateFile, 'utf8')
      return JSON.parse(data)
    }
  } catch (err) {
    console.error('Failed to load window state:', err)
  }
  return null
}

// 保存窗口状态
function saveWindowState() {
  if (!mainWindow) return

  try {
    const bounds = mainWindow.getBounds()
    const state = {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      isMaximized: mainWindow.isMaximized()
    }
    fs.writeFileSync(windowStateFile, JSON.stringify(state, null, 2))
  } catch (err) {
    console.error('Failed to save window state:', err)
  }
}

// 检查窗口是否在屏幕内
function isWindowInBounds(bounds) {
  const displays = screen.getAllDisplays()

  // 检查窗口中心点是否在任何一个显示器内
  const centerX = bounds.x + bounds.width / 2
  const centerY = bounds.y + bounds.height / 2

  for (const display of displays) {
    const { x, y, width, height } = display.bounds
    if (
      centerX >= x &&
      centerX < x + width &&
      centerY >= y &&
      centerY < y + height
    ) {
      return true
    }
  }

  return false
}

function createWindow() {
  // 隐藏菜单栏
  Menu.setApplicationMenu(null)

  // 读取上次的窗口状态
  const savedState = loadWindowState()
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize

  // 默认窗口配置
  let windowConfig = {
    width: 1400,
    height: 900,
    minWidth: 1128,
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
  }

  // 如果有保存的窗口状态，使用它（但需要验证）
  if (savedState) {
    const bounds = {
      x: savedState.x,
      y: savedState.y,
      width: savedState.width,
      height: savedState.height
    }

    // 检查窗口是否在屏幕内
    if (isWindowInBounds(bounds)) {
      windowConfig.x = savedState.x
      windowConfig.y = savedState.y
      windowConfig.width = savedState.width
      windowConfig.height = savedState.height
    } else {
      // 窗口在屏幕外，居中显示
      console.log('Window was outside screen bounds, centering...')
      windowConfig.center = true
    }
  } else {
    // 首次打开，居中显示
    windowConfig.center = true
  }

  mainWindow = new BrowserWindow(windowConfig)

  // 如果之前是最大化状态，恢复最大化
  if (savedState && savedState.isMaximized) {
    mainWindow.maximize()
  }

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

  // 保存窗口状态
  mainWindow.on('close', () => {
    saveWindowState()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // 窗口移动或调整大小时保存状态（节流处理）
  let saveTimeout
  const debounceSave = () => {
    if (saveTimeout) clearTimeout(saveTimeout)
    saveTimeout = setTimeout(() => {
      saveWindowState()
    }, 500)
  }

  mainWindow.on('resize', debounceSave)
  mainWindow.on('move', debounceSave)
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
