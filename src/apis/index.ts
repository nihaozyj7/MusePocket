import { $tips } from '@/plugins/notyf'

/** openai 所需要的参数 */
export interface OpenAiParams {
  /** 备注 */
  note: string
  /** 请求地址，如：https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions */
  baseUrl: string
  /** api key */
  apiKey: string
  /** 模型名称 */
  model: string
  /** 消息 */
  messages?: {
    role: 'user' | 'assistant' | 'system',
    content: string
  }[]
  /** 使用流 */
  stream?: boolean
}


export async function openaiFetch(params: OpenAiParams) {
  const {
    baseUrl,
    apiKey,
    model,
    messages = [{ role: 'user', content: '你好' }],
    stream = false
  } = params

  try {
    const res = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages,
        stream
      })
    })
    return await res.json()
  } catch (error) {
    console.error(error)
  }
}
