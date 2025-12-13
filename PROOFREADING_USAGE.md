# 纠错功能使用说明

## 功能概述

编辑器现在集成了本地纠错功能,可以自动检测文本中的错别字并提供修正建议。纠错功能采用**按行处理**的方式,适合小模型的短文本纠错。

## 功能特性

1. **实时错误检测** - 在编辑文本时自动进行纠错检查(防抖2秒)
2. **按行纠错** - 将文本按行分割后逐行纠错,适配小模型
3. **结果展示** - 点击状态栏纠错状态弹出详细结果窗口
4. **批量操作** - 支持一键应用所有修改或单个应用
5. **状态显示** - 状态栏实时显示纠错服务状态和错误数量

## 使用步骤

### 1. 启动纠错服务

确保纠错API服务已启动并运行在 `http://localhost:3006`

检查服务是否就绪:
```powershell
Invoke-RestMethod http://localhost:3006/health
```

### 2. 编辑器状态

在编辑器底部状态栏,保存状态左侧会显示纠错状态:

- `✅ 已就绪` - 纠错服务正常,准备就绪
- `❌ 服务未就绪` - 纠错服务未启动或连接失败
- `⏳ 检查中...` - 正在进行纠错检查
- `✅ 无错误` - 检查完成,未发现错误
- `⚠️ X 个错误` - 检查完成,发现X个错误

### 3. 查看错误

当编辑器检测到错误时:

1. **状态栏显示** - 状态栏会显示错误数量(如 `⚠️ 3 个错误`)
2. **点击状态** - 点击纠错状态区域会弹出纠错结果窗口
3. **错误列表** - 窗口中显示所有错误的详细信息:
   - 错误所在行号
   - 错误位置
   - 错误文字和建议修正
4. **操作按钮** - 每个错误项提供:
   - `✓ 修改` - 应用该处修正
   - `× 忽略` - 忽略该错误
5. **批量修改** - 点击顶部`全部修改`可一次应用所有修正

示例窗口显示:
```
第 1 行  位置: 6
错误: 图书官 → 建议: 图书馆
[✓ 修改] [× 忽略]
```

### 4. 自动检查时机

纠错检查会在以下情况下自动触发:

- 文本输入时(防抖2秒后)
- 切换文章时

## API接口

纠错功能使用本地API服务,接口详情请参考API文档。

### 健康检查
```
GET http://localhost:3006/health
```

### 单文本纠错
```
POST http://localhost:3006/correct
Content-Type: application/json

{
  "text": "我今天去图书官看书"
}
```

## 技术实现

### 核心文件

- `src/domains/editor/services/proofreading.service.ts` - 纠错服务
- `src/domains/editor/components/Editor.vue` - 编辑器组件(包含纠错逻辑)
- `src/domains/editor/components/ProofreadResultPopup.vue` - 纠错结果弹窗

### 主要功能

1. **服务初始化** - `initProofreadingService()`
2. **文本纠错** - `proofreadText()` - 按行分割后逐行调用API
3. **显示结果** - `showProofreadResults()` - 弹出结果窗口
4. **应用修改** - `handleApplyFix()` - 应用单个修正
5. **批量修改** - `handleApplyAll()` - 批量应用修正

### 按行纠错逻辑

```javascript
// 将文本按行分割
const lines = text.split('\n').filter(line => line.trim())

// 逐行调用纠错API
for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim()
  const result = await proofreadingService.correctText(line)
  // 记录错误和行号
  if (result && result.has_error) {
    result.errors.forEach(error => {
      allIssues.push({
        lineNumber: i + 1,
        error: error
      })
    })
  }
}
```

## 注意事项

1. **按行纠错** - 系统将文本按行分割后逐行纠错,适合小模型处理短文本
2. 纠错功能依赖本地API服务,需确保服务正常运行
3. 纠错检查有2秒防抖延迟,避免频繁调用
4. 每行文本独立纠错,错误位置基于该行内的偏移量
5. 结果窗口会显示错误所在行号,方便定位

## 故障排除

### 显示"服务未就绪"

1. 检查纠错API服务是否启动
2. 确认服务运行在 `http://localhost:3006`
3. 检查网络连接

### 错误未被检测到

1. 等待2秒让防抖触发
2. 确认该行文本不超过模型处理能力
3. 检查API是否返回了错误数据
4. 查看浏览器控制台是否有错误信息

### 点击状态栏无反应

1. 确认有错误存在(状态显示 `⚠️ X 个错误`)
2. 只有存在错误时状态栏才可点击
3. 检查弹窗是否被其他元素遮挡
