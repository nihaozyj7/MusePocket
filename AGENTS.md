# AGENTS.md - MusePocket Development Guide

## Quick Commands

```bash
pnpm dev              # Start Electron dev server
pnpm build            # Typecheck + production build
pnpm build:win        # Build Windows installer
pnpm lint             # ESLint
pnpm format           # Prettier
pnpm typecheck        # Full TS typecheck (node + web)
```

## Architecture

**Electron + Vue 3 + TypeScript** monorepo using `electron-vite`.

### Path Aliases (renderer)

- `@` / `@renderer` → `src/renderer/src`
- `@app` → `src/app` | `@domains` → `src/domains` | `@pages` → `src/pages`
- `@shared` → `src/shared` | `@core` → `src/core`

### Directory Structure

```
src/
├── main/              # Electron main process
├── preload/           # Preload scripts
└── renderer/src/      # Vue frontend
    ├── app/           # App entry, router, plugins
    ├── domains/       # Business logic (editor, library, settings)
    ├── pages/         # Page components
    ├── shared/        # Cross-domain utils, db, types, components
    └── core/          # Infrastructure (API)
```

## Key Conventions

- **No implicit any**: `strictNullChecks: false`, `noImplicitAny: false` (lenient TS)
- **Prettier**: singleQuote, no semi, 100 printWidth
- **Vue**: Composition API only, `<script lang="ts">` required in `.vue`
- **State**: Pinia with persistedstate plugin (auto-saves to localStorage)
- **Data**: IndexedDB via `idb` library - data is local-only

## Gotchas

1. **Duplicate tab prevention**: App blocks multiple windows via `preventDuplicateTab()` in `main.ts`
2. **AI config storage**: Stored in `%APPDATA%/ai-config.json` (Electron main process)
3. **Window state persistence**: Position/size saved to `%APPDATA%/window-state.json`
4. **Build excludes**: `src/`, config files, `.env*` excluded from Electron package
5. **Code splitting**: Manual chunks for `vue-libs`, `utils`, `db` in Vite config

## Testing

No test suite configured. Manual testing only.

## Tech Stack

- Vue 3.5, TypeScript 5.9, Vite 7.2, Electron 39.2
- Pinia 3.0, Vue Router 4.6
- IndexedDB (`idb` 8.0), lodash-es, nanoid, diff, pinyin-pro
- UnoCSS (atomic CSS), Notyf (notifications)
