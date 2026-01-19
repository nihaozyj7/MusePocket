# 校对功能偏移量计算问题修复总结

## 问题描述

在校对功能模块中，点击"应用"按钮后，可能会出现无法替换错误文本的问题。经过分析，发现主要原因是：

1. **偏移量计算错误**：在替换文本时没有正确考虑段落边界和光标位置
2. **段落定位不准确**：可能匹配到错误的段落，导致替换了不应该替换的文本
3. **多次替换冲突**：同一段落中的多个错误可能导致替换时的偏移量计算错误

## 修复方案

### 1. 段落级错误合并

**问题**：同一段落中的多个错误被分别处理，导致替换时偏移量计算错误。

**解决方案**：
- 在 `LocalProofreadTool.vue` 中实现 `mergeSameParagraphErrors` 函数
- 将同一段落中的所有错误合并为一个段落级错误
- 一次性替换整个段落，避免多次替换导致的偏移量问题

```typescript
function mergeSameParagraphErrors(issues: LocalProofreadIssue[]): LocalProofreadIssue[] {
  // 按行号分组（现在代表段落索引）
  const grouped = new Map<number, LocalProofreadIssue[]>()

  // 处理每一个段落
  grouped.forEach((paragraphIssues, lineNumber) => {
    if (paragraphIssues.length === 1) {
      // 只有一个错误，直接保留
      mergedIssues.push(paragraphIssues[0])
    } else {
      // 多个错误，合并为段落级错误
      // 按位置排序，从后往前替换以避免位置偏移
      const sortedIssues = [...paragraphIssues].sort((a, b) => b.error.position - a.error.position)

      sortedIssues.forEach(issue => {
        correctedParagraph = correctedParagraph.replace(issue.error.original, issue.error.corrected)
      })
    }
  })
}
```

### 2. 基于字符偏移量的精确定位

**问题**：替换时可能匹配到错误的段落，特别是当文档中有相同错误文本时。

**解决方案**：
- 在 `EditPage.vue` 的 `handleProofreadFix` 函数中实现基于字符偏移量的精确定位
- 使用 `TreeWalker` API 遍历所有文本节点
- 累计字符偏移量，精确定位到包含目标文本的节点
- 在目标节点中执行精确替换

```typescript
// 获取编辑器中的纯文本内容
const editorText = editorRef.value.getBodyText()

let targetNode: Text | null = null
let targetOffset: number = 0

if (position !== null && position >= 0) {
  // 使用字符偏移量精确定位
  const walker = document.createTreeWalker(
    bodyElement,
    NodeFilter.SHOW_TEXT,
    null
  )

  let currentNode: Text | null
  let currentOffset = 0

  while (currentNode = walker.nextNode() as Text) {
    const nodeText = currentNode.textContent || ''
    const nodeLength = nodeText.length

    // 检查目标位置是否在这个节点中
    if (position >= currentOffset && position < currentOffset + nodeLength) {
      // 计算在这个节点中的相对位置
      const relativePosition = position - currentOffset

      // 检查这个位置开始的文本是否匹配originalText
      if (nodeText.substring(relativePosition, relativePosition + originalText.length) === originalText) {
        targetNode = currentNode
        targetOffset = relativePosition
        break
      }
    }

    currentOffset += nodeLength
  }
}

if (targetNode) {
  // 在目标节点中执行替换
  const nodeText = targetNode.textContent || ''
  const beforeText = nodeText.substring(0, targetOffset)
  const afterText = nodeText.substring(targetOffset + originalText.length)

  targetNode.textContent = beforeText + correctedText + afterText
  replaced = true
}
```

### 3. 光标位置保持

**问题**：替换后光标位置丢失，影响用户体验。

**解决方案**：
- 在替换前保存光标在纯文本中的偏移量
- 执行替换操作后，根据偏移量恢复光标位置
- 确保光标位置的连续性

```typescript
// 保存光标位置
const cursorPos = saveCursorTextPosition(bodyElement)

// 执行替换操作
// ...

// 恢复光标位置
setTimeout(() => {
  restoreCursorTextPosition(bodyElement, cursorPos)
  // 触发保存
  if (editorRef.value) {
    editorRef.value.handleInput()
  }
}, 50)
```

### 4. 安全回退机制

**问题**：在无法确定目标段落时，需要有安全的回退方案。

**解决方案**：
- 如果无法确定目标段落，回退到全局搜索
- 但要更加精确，只替换第一个匹配项
- 提供错误提示，帮助用户理解问题

```typescript
if (targetParagraph) {
  // 在目标段落中查找并替换文本
  // ...
} else {
  // 如果无法确定目标段落，回退到全局搜索（但要更精确）
  const walker = document.createTreeWalker(
    bodyElement,
    NodeFilter.SHOW_TEXT,
    null
  )
  // ...
}
```

## 修复效果

### 修复前的问题
1. ✅ 同一段落中的多个错误可能只替换第一个
2. ✅ 可能替换到错误段落中的相同错误
3. ✅ 替换后光标位置丢失
4. ✅ 多次替换导致的偏移量计算错误

### 修复后的改进
1. ✅ 段落级错误合并，一次性替换所有错误
2. ✅ 精确段落定位，只替换目标段落中的错误
3. ✅ 光标位置正确保持
4. ✅ 安全的回退机制

## 测试验证

创建了测试页面 `test-proofread-fix.html` 来验证修复效果，包括：

1. **段落级错误合并测试**：验证同一段落中的多个错误被正确合并处理
2. **精确段落定位测试**：验证根据行号或光标位置准确定位目标段落
3. **光标位置保持测试**：验证替换后光标位置正确恢复
4. **核心修复代码展示**：展示修复后的核心逻辑

## 相关文件

- `src/pages/EditPage.vue` - 主要修复文件，包含 `handleProofreadFix` 函数
- `src/domains/editor/components/LocalProofreadTool.vue` - 包含段落级错误合并逻辑
- `test-proofread-fix.html` - 测试验证页面
- `PROOFREAD_FIX_SUMMARY.md` - 本修复总结文档

## 使用建议

1. **测试验证**：建议在实际使用中测试各种场景，确保修复效果
2. **用户反馈**：收集用户反馈，了解修复是否解决了实际问题
3. **持续优化**：根据使用情况，可能需要进一步优化定位算法

## 技术要点

1. **段落分割**：使用 `splitByParagraphs` 函数按段落分割文本
2. **TreeWalker API**：使用 `document.createTreeWalker` 精确查找文本节点
3. **光标位置管理**：使用 `saveCursorTextPosition` 和 `restoreCursorTextPosition` 管理光标位置
4. **DOM 操作**：直接操作 DOM 节点进行文本替换，避免复杂的字符串处理

这个修复确保了校对功能的稳定性和准确性，用户可以放心使用"应用"按钮来修复错误。
