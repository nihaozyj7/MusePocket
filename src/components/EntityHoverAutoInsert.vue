<script setup lang="ts">
import { $tips } from '@/plugins/notyf'
import type { Entity } from '@/types'
import { ref } from 'vue'
import EntityHover from './EntityHover.vue'
import { useEntityStore } from '@/stores/EntitysStore'
import { useSettingStore } from '@/stores/SettingStore'
import { entries } from 'lodash-es'
import { pinyin } from 'pinyin-pro'

/** 匹配结果接口 */
interface MatchResult {
  entity: Entity
  /** 匹配权重 */
  weight: number
  /** 覆盖范围长度（从匹配到的最早字符到光标位置） */
  coverLength: number
}

const emit = defineEmits({
  /** 选中了一个实体或者实体将要关闭, 当无可行项造成关闭时会传递null */
  close: (entity: Entity | null, coverLength?: number) => true,
})

const hoverRef = ref<HTMLElement | null>(null)

/** 实体信息层 */
const entityInfoRef = ref<InstanceType<typeof EntityHover>>()

const entityStore = useEntityStore()
const settingStore = useSettingStore()

/** 匹配结果列表 */
const matchResults = ref<MatchResult[]>([])

const isVisible = ref(false)

const entity = ref<Entity | null>(null)

/** 当前 item 选中索引 */
const selectedIndex = ref(-1)

function copy(e: Event) {
  const target = e.target as HTMLElement
  const text = target.innerText.trim()
  text && navigator.clipboard.writeText(target.innerText.trim())
  $tips.success('已复制')
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'ArrowUp') {
    if (selectedIndex.value > 0) selectedIndex.value--
    else if (selectedIndex.value <= 0) selectedIndex.value = matchResults.value.length - 1
    e.preventDefault()
    scrollToSelectedItem()
  } else if (e.key === 'ArrowDown') {
    if (selectedIndex.value < matchResults.value.length - 1) selectedIndex.value++
    else if (selectedIndex.value >= matchResults.value.length - 1) selectedIndex.value = 0
    e.preventDefault()
    scrollToSelectedItem()
  } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
    matchResults.value = []
    hide()
  } else if (e.key === 'Tab' || e.key === 'Enter') {
    // 根据配置决定哪个键可以确认插入
    const confirmKey = settingStore.baseSettings.autoCompleteConfirmKey
    const isTabAllowed = confirmKey === 'tab' || confirmKey === 'both'
    const isEnterAllowed = confirmKey === 'enter' || confirmKey === 'both'

    const shouldConfirm = (e.key === 'Tab' && isTabAllowed) || (e.key === 'Enter' && isEnterAllowed)

    if (shouldConfirm && matchResults.value.length > 0 && selectedIndex.value >= 0) {
      const result = matchResults.value[selectedIndex.value]
      hide(result.entity, result.coverLength)
      e.preventDefault()
    }
  } else if (e.key === 'Escape') {
    // Esc 键取消
    hide()
    e.preventDefault()
  }
}

function show(x?: number, y?: number) {
  if (x === undefined || y === undefined) return

  // 只有当有匹配结果时才显示
  if (matchResults.value.length === 0) return

  isVisible.value = true
  move(x + 10, y)

  document.addEventListener('keydown', onKeydown)
  document.addEventListener('click', () => hide())
  selectedIndex.value = 0
}

function move(x: number, y: number) {
  hoverRef.value.style.left = `${x + 10}px`
  hoverRef.value.style.top = `${y}px`
}

/**
 * 正向顺序模糊匹配算法
 * @param windowText 窗口文本
 * @param key 实体key
 * @returns 匹配信息：{ matched: boolean, matchPositions: number[], coverLength: number, score: number }
 */
function forwardSequentialMatch(windowText: string, key: string): { matched: boolean, matchPositions: number[], coverLength: number, score: number } {
  if (!key) return { matched: true, matchPositions: [], coverLength: 0, score: 0 }
  if (!windowText) return { matched: false, matchPositions: [], coverLength: 0, score: 0 }

  const matchPos: number[] = []
  let searchIndex = 0
  const keyLower = key.toLowerCase()
  const textLower = windowText.toLowerCase()

  // 从前往后顺序查找 key 的每个字符
  for (let i = 0; i < keyLower.length; i++) {
    const c = keyLower[i]
    const pos = findNextChar(textLower, c, searchIndex)

    // 如果找不到该字符，停止匹配
    if (pos === -1) {
      break
    }

    matchPos.push(pos)
    searchIndex = pos + 1
  }

  // 只要匹配了至少一个字符就算成功
  const matched = matchPos.length > 0
  if (!matched) return { matched: false, matchPositions: [], coverLength: 0, score: 0 }

  // 覆盖区间：从第一个匹配位置到窗口末尾（光标位置）
  const coverStart = matchPos[0]
  const coverEnd = windowText.length
  const coverLength = coverEnd - coverStart

  // 计算权重（传入实际匹配的字符数）
  const score = calcScore(key, matchPos, coverLength, matchPos.length)

  return { matched, matchPositions: matchPos, coverLength, score }
}

/**
 * 在文本中查找下一个字符
 * @param text 文本
 * @param char 要查找的字符
 * @param startIndex 开始查找的索引
 * @returns 找到的位置，未找到返回 -1
 */
function findNextChar(text: string, char: string, startIndex: number): number {
  for (let i = startIndex; i < text.length; i++) {
    if (text[i] === char) {
      return i
    }
  }
  return -1
}

/**
 * 计算匹配权重
 * @param key 匹配的key
 * @param matchPos 匹配位置数组
 * @param coverLength 覆盖长度
 * @param matchedCount 实际匹配的字符数
 * @returns 权重分数（越高越好）
 */
function calcScore(key: string, matchPos: number[], coverLength: number, matchedCount: number): number {
  let score = 0

  // 匹配字符数越多，分越高（最重要的指标）
  score += matchedCount * 10

  // 完整匹配额外加分
  if (matchedCount === key.length) {
    score += 50
  }

  // 连续度（越连续越好）
  for (let i = 1; i < matchPos.length; i++) {
    const distance = matchPos[i] - matchPos[i - 1]
    if (distance === 1) {
      score += 5  // 完全连续
    } else if (distance <= 3) {
      score += 2  // 较连续
    } else {
      score -= distance * 0.5  // 距离越大惩罚越大
    }
  }

  // 覆盖区间越短越好（覆盖越精确）
  score -= coverLength * 0.3

  // 匹配完整度（匹配字符数 / key总长度）
  const completeness = matchedCount / key.length
  score += completeness * 20

  return score
}

/**
 * 为实体生成匹配 key
 * @param entity 实体
 * @returns 匹配 key 数组
 */
function getEntityKeys(entity: Entity): string[] {
  const keys: string[] = []
  const hasChinese = /[\u4e00-\u9fa5]/.test(entity.title)

  // 添加实体全文
  keys.push(entity.title)

  // 如果是中文实体，添加拼音首字母
  if (hasChinese) {
    try {
      const pinyinFirst = pinyin(entity.title, { pattern: 'first', toneType: 'none' })
        .toLowerCase()
        .replace(/\s+/g, '') // 移除所有空格
      keys.push(pinyinFirst)
    } catch (err) {
      console.error('拼音转换错误:', err)
    }
  }

  return keys
}

/**
 * 更新匹配结果（基于光标位置的正向顺序模糊匹配）
 * @param textBeforeCursor 光标前的文本
 */
function update(textBeforeCursor: string) {
  if (!textBeforeCursor || !entityStore.v || entityStore.v.length === 0) {
    matchResults.value = []
    return
  }

  // 窗口文本（取最后 50 个字符）
  const windowSize = 50
  const windowStart = Math.max(0, textBeforeCursor.length - windowSize)
  const windowText = textBeforeCursor.substring(windowStart)

  const results: MatchResult[] = []

  // 对每个实体进行匹配
  for (const entity of entityStore.v) {
    const keys = getEntityKeys(entity)
    let bestMatch: { matched: boolean, matchPositions: number[], coverLength: number, score: number } | null = null

    // 尝试匹配每个 key
    for (const key of keys) {
      const matchInfo = forwardSequentialMatch(windowText, key)

      if (matchInfo.matched && (!bestMatch || matchInfo.score > bestMatch.score)) {
        bestMatch = matchInfo
      }
    }

    // 如果有匹配，添加到结果中
    if (bestMatch && bestMatch.matched) {
      results.push({
        entity,
        weight: bestMatch.score,
        coverLength: bestMatch.coverLength
      })
    }
  }

  // 按权重排序（权重高的在前）
  results.sort((a, b) => b.weight - a.weight)

  matchResults.value = results

  // 重置选中索引
  if (results.length > 0) {
    selectedIndex.value = 0
  }
}

/**
 * 将选中的项滚动到可见区域
 */
function scrollToSelectedItem() {
  if (!hoverRef.value || selectedIndex.value < 0) return

  // 使用 nextTick 确保 DOM 已更新
  setTimeout(() => {
    const selectedItem = hoverRef.value?.querySelector('.item.selected') as HTMLElement
    if (selectedItem) {
      selectedItem.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth'
      })
    }
  }, 0)
}

function hide(ent?: Entity, coverLength?: number) {
  isVisible.value = false
  entity.value = null
  selectedIndex.value = -1
  matchResults.value = []
  emit('close', ent || null, coverLength)
  document.removeEventListener('keydown', onKeydown)
}

defineExpose({ show, move, update, hide })

</script>

<template>
  <!-- 展示实体信息 -->
  <div class="entity-box" ref="hoverRef" v-show="isVisible">
    <div class="item" :class="{ selected: selectedIndex === index }" @click="hide(result.entity, result.coverLength)" v-for="result, index in matchResults" :key="result.entity.id">
      <span>{{ result.entity.type }}</span>
      <h5>{{ result.entity.title }}</h5>
    </div>
    <!-- 用户输入时的实体信息悬浮窗 -->
    <EntityHover ref="entityInfoRef" />
  </div>
</template>

<style scoped>
.entity-box {
  position: absolute;
  background-color: var(--background-secondary);
  border-radius: .25rem;
  font-size: .8rem;
  max-width: 200px;
  max-height: 300px;
  border: 1px solid var(--border-color);
  z-index: 2;
  display: flex;
  flex-direction: column;
  left: 0;
  top: 0;
  overflow-y: auto;
}

.item {
  padding: .5rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
  display: flex;
  flex-shrink: 0;
}

.item span {
  color: var(--text-secondary);
  background-color: var();
  color: var(--danger);
  width: 0.8rem;
  overflow: hidden;
  margin-right: .5rem;
}

.item h4 {
  flex: 1;
  width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.selected {
  background-color: var(--background-tertiary);
}

.item:hover {
  background-color: var(--background-tertiary);
}
</style>
