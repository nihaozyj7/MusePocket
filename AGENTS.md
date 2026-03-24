# AGENTS.md - MusePocket Development Guide

## Build & Development Commands

```bash
npm run dev              # Start Vite dev server (web mode)
npm run build            # Type check + production build
npm run preview          # Preview production build
npm run electron:dev     # Run Electron app in development mode
npm run electron:build   # Build Electron app for current platform
npm run electron:build:win  # Build Electron app for Windows
```

**Note:** This project uses pnpm (pnpm-lock.yaml present). No test framework is configured.

## Project Structure

```
src/
├── app/           # App entry, router, plugins, styles
├── core/          # Core services (API clients)
├── domains/       # Feature modules (editor, library, settings)
├── pages/         # Page-level components (BooksPage, EditPage)
└── shared/        # Shared utilities, components, types, constants
```

## Code Style Guidelines

### Imports
- Use path aliases: `@/`, `@app/`, `@shared/`, `@core/`, `@domains/`, `@pages/`
- Import Vue composables from 'vue': `import { ref, computed, onMounted } from 'vue'`
- Import Pinia stores: `import { useSettingStore } from '@domains/settings/stores/settings.store'`
- Group imports: Vue → Pinia → Utils → Components → Styles

### TypeScript
- Use `lang="ts"` in Vue SFC script tags
- Define interfaces for complex types in `src/shared/types/index.ts`
- Use type annotations for function parameters and return types
- State stores use typed state: `state: () => ({ theme: 'dark' })`

### Naming Conventions
- **Files**: PascalCase for Vue components (`SettingPopup.vue`), kebab-case for utilities (`event-bus.ts`)
- **Components**: PascalCase (`ConfirmDialog`, `EditBookPopup`)
- **Stores**: `useXxxStore` pattern, file: `xxx.store.ts`
- **Variables/Functions**: camelCase (`settingStore`, `getImageByID`)
- **Types/Interfaces**: PascalCase (`ShortcutKeys`, `BaseSettings`)
- **CSS Classes**: kebab-case (`.app-container`, `.entity-style`)

### Vue Components
- Use Composition API with `<script setup lang="ts">`
- Props with `defineProps`, events with `defineEmits`
- Template refs with `ref<InstanceType<typeof Component> | null>(null)`
- Lifecycle: `onMounted`, `onUnmounted`, `watch`

### Pinia Stores
```typescript
export const useSettingStore = defineStore('setting', {
  persist: true,  // For persisted state
  state: () => ({ theme: 'dark' }),
  getters: { isDark: state => state.theme === 'dark' },
  actions: { setDark() { this.theme = 'dark' } }
})
```

### Error Handling
- Use try/catch for async operations
- Log errors with `console.error('Description:', err)`
- Return safe defaults on failure (empty strings, empty arrays)
- Throw errors only for critical failures (e.g., duplicate tab blocking)

### DOM Manipulation
- Use `document.querySelector` for direct DOM access
- Apply styles via `element.style.property` or CSS custom properties
- Use `StyleManager` class for dynamic CSS rules
- Clean up: `URL.revokeObjectURL()` for blob URLs, `removeEventListener`

### Comments
- Use JSDoc for exported functions: `/** Description */`
- Use Chinese comments throughout the codebase (consistent with existing code)
- Add inline comments for complex logic

### CSS
- Use CSS custom properties for theming: `var(--background-primary)`
- Scoped styles in Vue components: `<style scoped>`
- Theme switching via `data-theme` attribute on `<html>`

## Key Patterns

### Event Bus
```typescript
import { event_on } from '@shared/utils/event-bus'
event_on('openSettings', () => { /* handle event */ })
```

### Z-index Management
```typescript
import { zIndexManager } from '@shared/utils'
const z = zIndexManager.getNext()  // Get next z-index
```

### Unique IDs
```typescript
import { uid } from '@shared/utils'
const id = uid(8)  // Generate 8-char nanoid
```

## Electron Notes
- Main process: `electron/main.js`
- Uses `window.close()` for programmatic close
- Prevents context menu: `document.addEventListener('contextmenu', e => e.preventDefault())`
- Prevents duplicate tabs via `preventDuplicateTab` utility

## Database
- Uses IndexedDB via `idb` library
- Database module: `src/shared/db/`
- Image storage: `imagedb.getAllImages()`, blob storage

## Additional Patterns

### Utility Functions
- Export utilities from `src/shared/utils/index.ts` for public API
- Use `index-all.ts` for bulk exports when needed
- Utility naming: descriptive verbs (`getImageByID`, `clearImageCache`)

### Constants & Defaults
- Default factories in `src/shared/constants/defaults.ts` (e.g., `getDefaultBook()`)
- Use factory functions for default objects that need unique IDs
- Import defaults: `import { getDefaultBaseSettings } from '@shared/constants/defaults'`

### Component Communication
- Parent → Child: props with `defineProps<{ prop: Type }>()`
- Child → Parent: emit with `defineEmits<{ (e: 'event', data: Type): void }>()`
- Cross-component: event bus (`event_on`, `event_off`, `event_emit`)

### State Management
- Local state: `ref()`, `reactive()` from Vue
- Shared state: Pinia stores in `domains/*/stores/*.store.ts`
- Persisted state: stores use `persist: true` option
- Access stores: `const store = useXxxStore()`

### Async Operations
- Use `async/await` pattern consistently
- Handle errors with try/catch blocks
- Return empty values on failure rather than throwing
- Use `Promise.all()` for parallel operations

### File Organization
- Domain modules: `domains/{feature}/` contains components, stores, services
- Shared code: `shared/` for cross-domain utilities and components
- Pages: `pages/` for full-page components (route-level)
- Keep components small and focused on single responsibility

## VSCode Setup
- Recommended extension: Vue.volar
- TypeScript strict mode: disabled (`strictNullChecks: false`, `noImplicitAny: false`)
- Path aliases configured in `tsconfig.app.json` and `vite.config.ts`
