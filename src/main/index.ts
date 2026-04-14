import { app, BrowserWindow, Menu, screen, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import * as fs from 'fs'

app.disableHardwareAcceleration()

const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', (_event, _commandLine, _workingDirectory) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore()
      }
      mainWindow.focus()
    }
  })
}

let mainWindow: BrowserWindow | null = null

const windowStateFile = join(app.getPath('userData'), 'window-state.json')

function loadWindowState(): { x?: number; y?: number; width?: number; height?: number; isMaximized?: boolean } | null {
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

function saveWindowState(): void {
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

function isWindowInBounds(bounds: { x?: number; y?: number; width?: number; height?: number }): boolean {
  const displays = screen.getAllDisplays()

  const centerX = (bounds.x ?? 0) + (bounds.width ?? 0) / 2
  const centerY = (bounds.y ?? 0) + (bounds.height ?? 0) / 2

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

function createWindow(): void {
  Menu.setApplicationMenu(null)

  const savedState = loadWindowState()

  let windowConfig: Electron.BrowserWindowConstructorOptions = {
    title: '写作助手',
    width: 1400,
    height: 900,
    minWidth: 1128,
    minHeight: 700,
    backgroundColor: '#ffffff',
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      partition: 'persist:musepocket'
    }
  }

  if (savedState) {
    const bounds = {
      x: savedState.x,
      y: savedState.y,
      width: savedState.width,
      height: savedState.height
    }

    if (isWindowInBounds(bounds)) {
      windowConfig.x = savedState.x
      windowConfig.y = savedState.y
      windowConfig.width = savedState.width
      windowConfig.height = savedState.height
    } else {
      windowConfig.center = true
    }
  } else {
    windowConfig.center = true
  }

  mainWindow = new BrowserWindow(windowConfig)

  if (savedState?.isMaximized) {
    mainWindow.maximize()
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('close', () => {
    saveWindowState()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  let saveTimeout: NodeJS.Timeout | null = null
  const debounceSave = (): void => {
    if (saveTimeout) clearTimeout(saveTimeout)
    saveTimeout = setTimeout(() => {
      saveWindowState()
    }, 500)
  }

  mainWindow.on('resize', debounceSave)
  mainWindow.on('move', debounceSave)
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.musepocket.app')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  ipcMain.on('ping', () => console.log('pong'))

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

app.on('web-contents-created', (_event, contents) => {
  contents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl)
    if (parsedUrl.protocol !== 'file:' && !parsedUrl.protocol.startsWith('http')) {
      event.preventDefault()
    }
  })
})
