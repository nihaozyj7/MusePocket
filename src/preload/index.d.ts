import { ElectronAPI } from '@electron-toolkit/preload'

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

interface AiApi {
  getConfig: () => Promise<{ baseUrl: string; model: string } | null>
  saveConfig: (config: AiConfig) => Promise<{ success: boolean }>
  chat: (params: AiChatParams) => Promise<unknown> // eslint-disable-line @typescript-eslint/no-explicit-any
}

interface CustomApi {
  ai: AiApi
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: CustomApi
  }
}
