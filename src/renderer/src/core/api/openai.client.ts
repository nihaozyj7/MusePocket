/**
 * 清理 AI 返回内容中的思考块
 * 移除 <think>...</think> 标签及其包裹的内容
 * @param content AI 返回的原始内容
 * @returns 清理后的内容
 */
export function cleanThinkTags(content: string): string {
  if (!content) return content

  // 移除 <think>...</think> 标签及其内容（支持多行）
  return content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim()
}

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
    role: 'user' | 'assistant' | 'system'
    content: string
  }[]
  /** 使用流 */
  stream?: boolean
}

export interface OpenAiResponse {
  choices?: {
    message?: {
      content?: string
    }
    finish_reason?: string
  }[]
  error?: {
    message?: string
    type?: string
  }
}

export async function openaiFetch(params: OpenAiParams): Promise<OpenAiResponse | undefined> {
  const {
    baseUrl,
    apiKey,
    model,
    messages = [{ role: 'user', content: '你好' }],
    stream = false
  } = params

  try {
    if (window.api?.ai) {
      const result = await window.api.ai.chat({
        baseUrl,
        model,
        messages,
        stream,
        apiKey
      })
      return result
    }

    const res = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages,
        stream
      })
    })
    const data = await res.json()

    if (data?.choices?.[0]?.message?.content) {
      data.choices[0].message.content = cleanThinkTags(data.choices[0].message.content)
    }

    return data
  } catch (error) {
    console.error(error)
    return undefined
  }
}
