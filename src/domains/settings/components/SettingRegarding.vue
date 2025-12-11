<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{ title: string }>()

const appInfo = {
  name: 'MusePocket',
  slogan: '你的创作灵感口袋',
  version: '1.0.0',
  description: 'MusePocket 是一款专为创作者打造的本地写作管理系统。将你的每一个灵感、每一段文字安全地收纳在这个专属的创作空间里。无需联网，数据完全属于你，让创作更自由、更纯粹。',
  author: '热爱游戏的猫猫',
  homepage: 'https://github.com/nihaozyj7/MusePocket',
  bilibili: 'https://space.bilibili.com/39942486',
  github: 'https://github.com/nihaozyj7',
  license: 'MIT'
}

const features = [
  { icon: '✨', title: '灵感捕捉', desc: '随时记录创作灵感，支持 Markdown 富文本编辑' },
  { icon: '📚', title: '书籍管理', desc: '多书籍项目管理，章节分级组织，结构清晰' },
  { icon: '🎭', title: '实体系统', desc: '自定义角色、地点等实体，构建完整的创作世界观' },
  { icon: '💾', title: '本地存储', desc: '数据完全本地化，无需联网，隐私安全有保障' },
  { icon: '⏱️', title: '版本历史', desc: '强大的撤销重做与历史版本回溯功能' },
  { icon: '🔍', title: '智能搜索', desc: '快速查找文章内容，支持跨书籍搜索' },
  { icon: '🎨', title: '主题定制', desc: '深色/浅色主题，自定义背景与配色方案' },
  { icon: '⚡', title: '快捷高效', desc: '丰富的快捷键支持，让写作行云流水' },
  { icon: '🗑️', title: '回收站', desc: '误删无忧，支持文章和书籍的软删除恢复' },
  { icon: '📤', title: '导入导出', desc: '支持多种格式导入导出，数据迁移无障碍' }
]

const techStack = [
  { name: 'Vue 3', desc: '渐进式 JavaScript 框架，组合式 API' },
  { name: 'TypeScript', desc: '类型安全的 JavaScript 超集' },
  { name: 'Vite', desc: '极速的下一代前端构建工具' },
  { name: 'Pinia', desc: 'Vue 3 官方推荐的状态管理库' },
  { name: 'IndexedDB', desc: '浏览器端 NoSQL 数据库，海量数据存储' },
  { name: 'Electron', desc: '跨平台桌面应用框架' }
]

const highlights = [
  { label: '完全免费', value: '永久免费使用' },
  { label: '开源项目', value: 'MIT 许可协议' },
  { label: '数据安全', value: '100% 本地存储' },
  { label: '持续更新', value: '活跃开发中' }
]
</script>

<template>
  <div class="base-setting">
    <div class="title">{{ props.title }}</div>
    <div class="content">
      <!-- 应用信息 -->
      <div class="info-section">
        <div class="app-header">
          <div class="app-icon">✨</div>
          <div class="app-info">
            <h2 class="app-name">{{ appInfo.name }}</h2>
            <p class="app-slogan">{{ appInfo.slogan }}</p>
            <p class="app-version">Version {{ appInfo.version }}</p>
          </div>
        </div>

        <p class="app-description">{{ appInfo.description }}</p>

        <!-- 亮点展示 -->
        <div class="highlights-grid">
          <div v-for="item in highlights" :key="item.label" class="highlight-item">
            <div class="highlight-label">{{ item.label }}</div>
            <div class="highlight-value">{{ item.value }}</div>
          </div>
        </div>

        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">👨‍💻 作者</span>
            <span class="info-value">{{ appInfo.author }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">📜 许可协议</span>
            <span class="info-value">{{ appInfo.license }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">🏠 项目主页</span>
            <a :href="appInfo.homepage" target="_blank" class="info-link">GitHub</a>
          </div>
          <div class="info-item">
            <span class="info-label">🎮 哔哩哔哩</span>
            <a :href="appInfo.bilibili" target="_blank" class="info-link">热爱游戏的猫猫</a>
          </div>
          <div class="info-item">
            <span class="info-label">💻 开源仓库</span>
            <a :href="appInfo.github" target="_blank" class="info-link">@nihaozyj7</a>
          </div>
        </div>
      </div>

      <!-- 功能特性 -->
      <div class="feature-section">
        <h3 class="section-title">💡 核心功能</h3>
        <div class="feature-grid">
          <div v-for="(feature, index) in features" :key="index" class="feature-item">
            <div class="feature-icon">{{ feature.icon }}</div>
            <div class="feature-content">
              <div class="feature-title">{{ feature.title }}</div>
              <div class="feature-desc">{{ feature.desc }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 技术栈 -->
      <div class="tech-section">
        <h3 class="section-title">🛠️ 技术栈</h3>
        <div class="tech-grid">
          <div v-for="tech in techStack" :key="tech.name" class="tech-item">
            <span class="tech-name">{{ tech.name }}</span>
            <span class="tech-desc">{{ tech.desc }}</span>
          </div>
        </div>
      </div>

      <!-- 版权信息 -->
      <div class="copyright">
        <p class="copyright-year">© 2024 {{ appInfo.name }}. All rights reserved.</p>
        <p class="copyright-message">✍️ 让每一个创作灵感都有归宿,让每一段文字都闪耀光芒</p>
        <p class="copyright-thanks">感谢使用 {{ appInfo.name }},愿你的创作之路繁花似锦 🌸</p>
        <p class="copyright-author">Made with ❤️ by 热爱游戏的猫猫</p>
        <div class="social-links">
          <a :href="appInfo.bilibili" target="_blank" class="social-link">🎮 B站主页</a>
          <a :href="appInfo.github" target="_blank" class="social-link">💻 GitHub</a>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.content {
  padding: 0 !important;
}

.info-section {
  margin-bottom: 2rem;
  padding: 1.5rem;
  background-color: var(--background-secondary);
  border-radius: 0.5rem;
  border: 1px solid var(--border-color);
}

.app-header {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

.app-icon {
  font-size: 4rem;
  line-height: 1;
}

.app-info {
  flex: 1;
}

.app-name {
  font-size: 2rem;
  font-weight: bold;
  margin: 0;
  color: var(--text-primary);
}

.app-slogan {
  margin: 0.25rem 0;
  color: var(--primary);
  font-size: 1rem;
  font-weight: 500;
  font-style: italic;
}

.app-version {
  margin: 0.5rem 0 0;
  color: var(--text-secondary);
  font-size: 0.9rem;
  font-family: monospace;
}

.app-description {
  font-size: 1rem;
  color: var(--text-primary);
  margin-bottom: 1.5rem;
  line-height: 1.6;
}

.highlights-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.highlight-item {
  text-align: center;
  padding: 1rem;
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark, var(--primary)) 100%);
  border-radius: 0.5rem;
  color: white;
  transition: transform 0.2s, box-shadow 0.2s;
}

.highlight-item:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
}

.highlight-label {
  font-size: 0.75rem;
  opacity: 0.9;
  margin-bottom: 0.25rem;
  font-weight: 500;
}

.highlight-value {
  font-size: 0.9rem;
  font-weight: bold;
}

.info-grid {
  display: grid;
  gap: 0.75rem;
}

.info-item {
  display: flex;
  align-items: baseline;
  padding: 0.75rem;
  background-color: var(--background-tertiary);
  border-radius: 0.25rem;
}

.info-label {
  font-weight: 600;
  color: var(--text-primary);
  min-width: 6rem;
  font-size: 0.85rem;
}

.info-value {
  color: var(--text-primary);
  font-size: 0.85rem;
}

.info-link {
  color: var(--primary);
  text-decoration: none;
  transition: opacity 0.2s;
  font-size: 0.85rem;
}

.info-link:hover {
  opacity: 0.8;
  text-decoration: underline;
}

.section-title {
  font-size: 1.2rem;
  font-weight: bold;
  margin: 0 0 1rem 0;
  color: var(--text-primary);
  padding-bottom: 0.5rem;
  border-bottom: 2px solid var(--primary);
}

.feature-section {
  margin-bottom: 2rem;
  padding: 1.5rem;
  background-color: var(--background-secondary);
  border-radius: 0.5rem;
  border: 1px solid var(--border-color);
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}

.feature-item {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
  padding: 1.25rem;
  background-color: var(--background-tertiary);
  border-radius: 0.5rem;
  color: var(--text-primary);
  transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
  border: 2px solid var(--border-color);
}

.feature-item:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1);
  border-color: var(--primary);
}

.feature-icon {
  font-size: 2rem;
  line-height: 1;
  flex-shrink: 0;
}

.feature-content {
  flex: 1;
}

.feature-title {
  font-weight: 600;
  font-size: 0.95rem;
  margin-bottom: 0.25rem;
  color: var(--text-primary);
}

.feature-desc {
  font-size: 0.8rem;
  color: var(--text-secondary);
  line-height: 1.5;
}

.tech-section {
  margin-bottom: 2rem;
  padding: 1.5rem;
  background-color: var(--background-secondary);
  border-radius: 0.5rem;
  border: 1px solid var(--border-color);
}

.tech-grid {
  display: grid;
  gap: 0.75rem;
}

.tech-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background-color: var(--background-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 0.25rem;
  transition: border-color 0.2s;
}

.tech-item:hover {
  border-color: var(--primary);
}

.tech-name {
  font-weight: 600;
  color: var(--text-primary);
  font-size: 0.9rem;
}

.tech-desc {
  color: var(--text-secondary);
  font-size: 0.85rem;
}

.copyright {
  margin-top: 2rem;
  padding: 1.5rem;
  background-color: var(--background-secondary);
  border-radius: 0.5rem;
  border: 1px solid var(--border-color);
  text-align: center;
  color: var(--text-tertiary);
  font-size: 0.85rem;
}

.copyright p {
  margin: 0.5rem 0;
  line-height: 1.8;
}

.copyright-year {
  font-size: 0.8rem;
  opacity: 0.7;
}

.copyright-message {
  font-size: 0.95rem;
  font-weight: 500;
  color: var(--primary);
  margin: 1rem 0 !important;
}

.copyright-thanks {
  font-size: 0.85rem;
}

.copyright-author {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 1.2rem 0 0.8rem !important;
}

.social-links {
  display: flex;
  justify-content: center;
  gap: 1.5rem;
  margin-top: 1rem;
}

.social-link {
  display: inline-flex;
  align-items: center;
  padding: 0.5rem 1rem;
  background-color: var(--background-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
  color: var(--text-primary);
  text-decoration: none;
  font-size: 0.85rem;
  transition: all 0.2s;
}

.social-link:hover {
  background-color: var(--primary);
  color: white;
  border-color: var(--primary);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}
</style>
