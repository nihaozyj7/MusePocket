// Editor domain components
export { default as Editor } from './components/Editor.vue'
export { default as FindReplacePopup } from './components/FindReplacePopup.vue'
export { default as ProofreadTool } from './components/ProofreadTool.vue'
export { default as AiSuggestionTool } from './components/AiSuggestionTool.vue'
export { default as NameGeneratorTool } from './components/NameGeneratorTool.vue'
export { default as DraftManager } from './components/DraftManager.vue'
export { default as SearchArticlePopup } from './components/SearchArticlePopup.vue'
export { default as InsertSnippetPopup } from './components/InsertSnippetPopup.vue'
export { default as ProofreadResultPopup } from './components/ProofreadResultPopup.vue'

// Editor domain stores
export * from './stores/history.store'
export * from './stores/selected-article.store'
export * from './stores/text-snippets.store'

// Editor domain services
export * from './services/history.service'
export * from './services/proofreading.service'
