<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{ title: string }>()

const appInfo = {
  name: 'MusePocket',
  version: '1.0.0',
  description: '一个基于Vue3的知识管理工具',
  author: 'BeriCute',
  homepage: 'https://github.com/yourusername/musepocket',
  license: 'MIT'
}

const features = [
  '📝 支持Markdown编辑',
  '📚 书籍管理',
  '🎭 自定义实体管理',
  '💾 本地存储，数据安全',
  '🎨 深色/浅色主题切换',
  '⚡ 快捷键支持'
]

const techStack = [
  { name: 'Vue 3', desc: '渐进式 JavaScript 框架' },
  { name: 'TypeScript', desc: 'JavaScript 的超集' },
  { name: 'Vite', desc: '下一代前端工具链' },
  { name: 'Pinia', desc: 'Vue 状态管理' },
  { name: 'IndexedDB', desc: '浏览器端数据库' },
  { name: 'UnoCSS', desc: '原子化CSS引擎' }
]
</script>

<template>
  <div class="base-setting">
    <div class="title">{{ props.title }}</div>
    <div class="content">
      <!-- 应用信息 -->
      <div class="info-section">
        <div class="app-header">
          <div class="app-icon">📚</div>
          <div class="app-info">
            <h2 class="app-name">{{ appInfo.name }}</h2>
            <p class="app-version">Version {{ appInfo.version }}</p>
          </div>
        </div>

        <p class="app-description">{{ appInfo.description }}</p>

        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">作者：</span>
            <span class="info-value">{{ appInfo.author }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">许可：</span>
            <span class="info-value">{{ appInfo.license }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">主页：</span>
            <a :href="appInfo.homepage" target="_blank" class="info-link">{{ appInfo.homepage }}</a>
          </div>
        </div>
      </div>

      <!-- 功能特性 -->
      <div class="feature-section">
        <h3 class="section-title">功能特性</h3>
        <div class="feature-grid">
          <div v-for="(feature, index) in features" :key="index" class="feature-item">
            {{ feature }}
          </div>
        </div>
      </div>

      <!-- 技术栈 -->
      <div class="tech-section">
        <h3 class="section-title">技术栈</h3>
        <div class="tech-grid">
          <div v-for="tech in techStack" :key="tech.name" class="tech-item">
            <span class="tech-name">{{ tech.name }}</span>
            <span class="tech-desc">{{ tech.desc }}</span>
          </div>
        </div>
      </div>

      <!-- 版权信息 -->
      <div class="copyright">
        <p>© 2024 {{ appInfo.name }}. All rights reserved.</p>
        <p>感谢使用 {{ appInfo.name }}，希望它能帮助您更好地管理知识。</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.info-section {
  margin-bottom: 2rem;
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

.app-version {
  margin: 0.5rem 0 0;
  color: var(--text-secondary);
  font-size: 1rem;
}

.app-description {
  font-size: 1.1rem;
  color: var(--text-primary);
  margin-bottom: 1.5rem;
  line-height: 1.6;
}

.info-grid {
  display: grid;
  gap: 1rem;
}

.info-item {
  display: flex;
  align-items: baseline;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--border-color);
}

.info-label {
  font-weight: 500;
  color: var(--text-secondary);
  min-width: 4rem;
}

.info-value {
  color: var(--text-primary);
}

.info-link {
  color: var(--primary);
  text-decoration: none;
  transition: opacity 0.2s;
}

.info-link:hover {
  opacity: 0.8;
  text-decoration: underline;
}

.section-title {
  font-size: 1.3rem;
  font-weight: bold;
  margin: 2rem 0 1rem;
  color: var(--text-primary);
  padding-bottom: 0.5rem;
  border-bottom: 2px solid var(--primary);
}

.feature-section {
  margin-bottom: 2rem;
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.feature-item {
  padding: 0.75rem 1rem;
  background-color: var(--background-secondary);
  border-radius: 0.5rem;
  font-size: 0.95rem;
  color: var(--text-primary);
  transition: transform 0.2s, box-shadow 0.2s;
}

.feature-item:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.tech-section {
  margin-bottom: 2rem;
}

.tech-grid {
  display: grid;
  gap: 1rem;
}

.tech-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background-color: var(--background-secondary);
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
  transition: border-color 0.2s;
}

.tech-item:hover {
  border-color: var(--primary);
}

.tech-name {
  font-weight: 600;
  color: var(--text-primary);
  font-size: 1rem;
}

.tech-desc {
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.copyright {
  margin-top: 3rem;
  padding-top: 2rem;
  border-top: 1px solid var(--border-color);
  text-align: center;
  color: var(--text-tertiary);
  font-size: 0.9rem;
}

.copyright p {
  margin: 0.5rem 0;
  line-height: 1.6;
}
</style>
