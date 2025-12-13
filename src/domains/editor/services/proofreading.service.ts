/**
 * 纠错服务
 * 用于调用本地纠错API进行文本检查
 */

export interface ProofreadError {
  original: string
  corrected: string
  position: number
}

export interface ProofreadResult {
  original: string
  corrected: string
  errors: ProofreadError[]
  has_error: boolean
}

export interface ProofreadBatchResult {
  total: number
  results: Array<ProofreadResult & { index: number }>
}

export interface HealthStatus {
  healthy: boolean
  status: string
}

/**
 * 纠错服务类
 */
export class ProofreadingService {
  private baseUrl: string
  private isServiceReady: boolean = false

  constructor(baseUrl: string = 'http://localhost:3006') {
    this.baseUrl = baseUrl
  }

  /**
   * 设置基础URL
   */
  setBaseUrl(url: string) {
    this.baseUrl = url
    this.isServiceReady = false // 重置URL后需要重新检查健康状态
  }

  /**
   * 获取基础URL
   */
  getBaseUrl(): string {
    return this.baseUrl
  }

  /**
   * 测试接口连接
   */
  async testConnection(url?: string): Promise<{ success: boolean; message: string; error?: string }> {
    const testUrl = url || this.baseUrl
    try {
      const response = await fetch(`${testUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000) // 5秒超时
      })

      if (!response.ok) {
        return {
          success: false,
          message: '接口响应异常',
          error: `HTTP ${response.status}`
        }
      }

      const data = await response.json()
      if (data.healthy) {
        return { success: true, message: '接口连接成功' }
      } else {
        return { success: false, message: '服务未就绪', error: data.status }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误'
      return {
        success: false,
        message: '无法连接到服务',
        error: errorMessage
      }
    }
  }

  /**
   * 检查服务健康状态
   */
  async checkHealth(): Promise<HealthStatus> {
    try {
      const response = await fetch(`${this.baseUrl}/health`)
      if (!response.ok) {
        return { healthy: false, status: 'error' }
      }
      const data = await response.json()
      this.isServiceReady = data.healthy
      return data
    } catch (error) {
      console.error('Health check failed:', error)
      this.isServiceReady = false
      return { healthy: false, status: 'error' }
    }
  }

  /**
   * 单文本纠错
   */
  async correctText(text: string): Promise<ProofreadResult | null> {
    try {
      const response = await fetch(`${this.baseUrl}/correct`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8'
        },
        body: JSON.stringify({ text })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      return result
    } catch (error) {
      console.error('Proofread failed:', error)
      return null
    }
  }

  /**
   * 批量纠错
   */
  async correctBatch(texts: string[]): Promise<ProofreadBatchResult | null> {
    try {
      const response = await fetch(`${this.baseUrl}/correct/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8'
        },
        body: JSON.stringify({ texts })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      return result
    } catch (error) {
      console.error('Batch proofread failed:', error)
      return null
    }
  }

  /**
   * 获取服务是否就绪
   */
  getIsReady(): boolean {
    return this.isServiceReady
  }
}

// 导出单例
export const proofreadingService = new ProofreadingService()
