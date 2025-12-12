import { diffLines, type Change } from 'diff'
import { historydb } from '@shared/db'
import { uid } from '@shared/utils'
import type { ArticleHistoryRecord } from '@shared/types'

/** Diff 操作类型 */
export interface DiffOperation {
  type: 'add' | 'remove' | 'equal'
  value: string
  lineNumber?: number
}

/**
 * 计算两个文本之间的 diff（基于行）
 * @param oldText 旧文本
 * @param newText 新文本
 * @returns Diff 操作数组
 */
export function computeDiff(oldText: string, newText: string): DiffOperation[] {
  const changes = diffLines(oldText, newText)
  const result: DiffOperation[] = []

  for (const change of changes) {
    if (change.added) {
      result.push({ type: 'add', value: change.value })
    } else if (change.removed) {
      result.push({ type: 'remove', value: change.value })
    } else {
      result.push({ type: 'equal', value: change.value })
    }
  }

  return result
}

/**
 * 应用 diff 操作到文本
 * @param text 原始文本
 * @param diffs Diff 操作数组
 * @returns 应用后的文本
 */
export function applyDiff(text: string, diffs: DiffOperation[]): string {
  let result = ''
  for (const diff of diffs) {
    if (diff.type === 'add' || diff.type === 'equal') {
      result += diff.value
    }
    // remove 类型的不添加到结果中
  }
  return result
}

/**
 * 反向 diff 操作（用于撤销）
 * @param diffs 原始 diff 操作
 * @returns 反向 diff 操作
 */
export function reverseDiff(diffs: DiffOperation[]): DiffOperation[] {
  return diffs.map(diff => {
    if (diff.type === 'add') {
      return { ...diff, type: 'remove' as const }
    } else if (diff.type === 'remove') {
      return { ...diff, type: 'add' as const }
    }
    return diff
  })
}

/**
 * 从数据库中重建指定版本的内容
 * @param articleId 文章 ID
 * @param targetIndex 目标版本索引（从最新开始计数，0 表示最新）
 * @returns 重建的内容
 */
export async function reconstructContentAtIndex(
  articleId: string,
  targetIndex: number
): Promise<string | null> {
  try {
    const histories = await historydb.getArticleHistories(articleId)
    console.log(`[重建内容] 文章ID: ${articleId}, 目标索引: ${targetIndex}, 总记录数: ${histories.length}`)

    if (histories.length === 0 || targetIndex >= histories.length) {
      console.error(`[重建内容] 索引超出范围`)
      return null
    }

    // 从栈顶（索引 0）开始
    const topHistory = histories[0]
    console.log(`[重建内容] 栈顶记录ID: ${topHistory.id}, 有快照: ${topHistory.fullContent !== null}, 快照长度: ${topHistory.fullContent?.length ?? 'null'}`)

    if (topHistory.fullContent === null) {
      console.error('栈顶快照丢失')
      return null
    }

    // 如果目标就是栈顶，直接返回
    if (targetIndex === 0) {
      console.log(`[重建内容] 目标就是栈顶，直接返回`)
      return topHistory.fullContent
    }

    // 从栈顶开始，反向应用 diff
    let content = topHistory.fullContent

    for (let i = 1; i <= targetIndex; i++) {
      const history = histories[i]
      if (!history.diffFromPrev) {
        console.warn(`[重建内容] 记录 ${i} 没有 diff`)
        continue
      }

      const diffs: DiffOperation[] = JSON.parse(history.diffFromPrev)
      const reversedDiffs = reverseDiff(diffs)
      content = applyDiff(content, reversedDiffs)
      console.log(`[重建内容] 应用第 ${i} 条 diff，当前内容长度: ${content.length}`)
    }

    console.log(`[重建内容] 完成，最终内容长度: ${content.length}`)
    return content
  } catch (err: any) {
    console.error('重建内容失败:', err)
    return null
  }
}

/**
 * 保存新版本（作为新的栈顶）
 * @param articleId 文章 ID
 * @param oldContent 旧内容（数据库中的当前内容）
 * @param newContent 新内容
 */
export async function saveNewVersion(
  articleId: string,
  oldContent: string,
  newContent: string
): Promise<void> {
  try {
    const now = Date.now()

    // 1. 生成 diff
    const diffs = computeDiff(oldContent, newContent)
    const diffJson = JSON.stringify(diffs)

    console.log(`[保存版本] 文章ID: ${articleId}, 旧内容长度: ${oldContent.length}, 新内容长度: ${newContent.length}`)

    // 2. 创建新的栈顶记录（先创建，确保总有快照）
    const newRecord: ArticleHistoryRecord = {
      id: uid(),
      articleId,
      diffFromPrev: diffJson,
      fullContent: newContent,
      createdTime: now,
      modifiedTime: now,
      deletedTime: 0,
    }

    await historydb.createHistory(newRecord)
    console.log(`[保存版本] 新记录已创建: ${newRecord.id}`)

    // 3. 清除旧栈顶的快照（在新记录创建后）
    const clearResult = await historydb.clearOldTopSnapshot(articleId)
    console.log(`[保存版本] 清除旧快照: ${clearResult.success}`)
  } catch (err: any) {
    console.error('保存版本失败:', err)
    throw err
  }
}
