import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

interface AiChatParams {
  baseUrl: string
  model: string
  messages: { role: string; content: string }[]
  stream?: boolean
  apiKey?: string
}

interface AiConfig {
  baseUrl: string
  apiKey: string
  model: string
}

const api = {
  ai: {
    getConfig: (): Promise<{ baseUrl: string; model: string } | null> =>
      ipcRenderer.invoke('ai:get-config'),
    saveConfig: (config: AiConfig): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('ai:save-config', config),
    chat: (params: AiChatParams): Promise<unknown> =>
      // eslint-disable-line @typescript-eslint/no-explicit-any
      ipcRenderer.invoke('ai:chat', params)
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
