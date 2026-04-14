/**
 * 图书馆域 - AI 提示词常量
 * 统一管理实体提取和合并相关的 AI 提示词
 */

/** 实体合并提示词预设 */
export const ENTITY_MERGE_PROMPTS = [
  {
    id: 'merge-duplicates',
    title: '🔄 合并重复项',
    prompt: `你是一个实体合并专家。分析以下实体，找出重复和相似项，返回合并建议。

说明:
- id: 实体ID
- t: 标题/名称
- ty: 类型
- d: 描述
- a: 属性数组

任务:
1. 识别完全重复的实体(标题相同)
2. 识别相似实体(描述相似度>70%)
3. 对可合并实体,选择最完整的作为主实体
4. 合并属性时去重,保留所有有价值信息

返回JSON格式:
{
  "merges": [
    {
      "keepId": "保留的实体ID",
      "mergeIds": ["要合并的ID1", "要合并的ID2"],
      "reason": "合并原因"
    }
  ],
  "updates": [
    {
      "id": "实体ID",
      "title": "更新后的标题",
      "description": "补充完善的描述",
      "attrs": [更新后的属性],
      "reason": "更新原因"
    }
  ]
}`
  },
  {
    id: 'optimize-descriptions',
    title: '✨ 优化描述',
    prompt: `你是一个实体优化专家。分析以下实体，主要关注描述的完善和优化。

任务：
1. 识别描述为空或过于简略的实体
2. 根据实体名称和类型，提供合理的补充描述
3. 保持原有信息，只补充和优化

返回JSON格式（只返回需要更新的）：
{
  "merges": [],
  "updates": [
    {
      "id": "实体ID",
      "description": "优化后的描述",
      "reason": "优化原因"
    }
  ]
}`
  },
  {
    id: 'smart-categorize',
    title: '📂 智能分类',
    prompt: `你是一个实体分类专家。分析以下实体，优化其类型分类。

任务：
1. 识别类型命名不规范的实体
2. 识别可以合并的相似类型（如"人物"和"角色"）
3. 提供更合理的类型名称

返回JSON格式：
{
  "merges": [],
  "updates": [
    {
      "id": "实体ID",
      "type": "优化后的类型",
      "reason": "修改原因"
    }
  ]
}`
  }
] as const
