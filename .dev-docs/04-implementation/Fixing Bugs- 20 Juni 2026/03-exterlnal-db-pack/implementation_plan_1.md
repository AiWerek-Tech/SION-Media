# External SQLite Content Pack System — Bible TB Integration

Membangun sistem **External SQLite Content Pack** di SION Media Desktop agar aplikasi dapat menyimpan dan memakai file SQLite eksternal untuk Alkitab (dan konten lain di masa depan), dimulai dengan mengimpor `out_tb/tb_lai_1974.sqlite` sebagai Bible Pack TB full offline.

---

## User Review Required

> [!IMPORTANT]
> **Strategi External SQLite**: Database utama (`sion.db`) hanya menyimpan _registry_ metadata content pack. Semua data ayat tetap di file SQLite external (`tb_lai_1974.sqlite`) yang dibuka read-only. Ini menghindari mengimpor 31.102 ayat ke DB utama.

> [!IMPORTANT]
> **Migrasi Existing Bible API**: Existing `window.api.bible.*` saat ini mengakses tabel `bible_translations`/`bible_books`/`bible_verses` di DB utama. Sistem baru akan **menambahkan** API `contentPacks` dan **memperbarui** API `bible` untuk membaca dari external SQLite. Existing old bible tables di DB utama tetap ada tapi tidak digunakan oleh content pack system — backward compatible.

> [!WARNING]
> **BibleScreen.tsx akan di-rewrite**: Screen lama (`src/renderer/src/screens/BibleScreen.tsx`) hardcoded untuk DB internal. Akan ditulis ulang agar membaca dari external SQLite pack via IPC baru. Existing code backup sebagai referensi.

---

## Proposed Changes

Estimasi: **~25 file baru/dimodifikasi** di 7 area.

---

### 1. Content Pack Directory & .gitignore

#### [NEW] `resources/content-packs/bibles/.gitkeep`

Empty file agar folder `resources/content-packs/bibles/` masuk ke git.

#### [NEW] `resources/content-packs/hymnals/.gitkeep`

#### [NEW] `resources/content-packs/readings/.gitkeep`

#### [NEW] `resources/content-packs/media/.gitkeep`

#### [MODIFY] [.gitignore](file:///d:/my_dev/SION-Media/sion-media-desktop/.gitignore)

Tambahkan:

```gitignore
# Content Packs (binary files — no commit)
resources/content-packs/**/*.sqlite
resources/content-packs/**/*.db
resources/content-packs/**/*.jsonl
resources/content-packs/**/*.csv
```

---

### 2. Database Migration (Main Process)

#### [MODIFY] [migrations.ts](file:///d:/my_dev/SION-Media/sion-media-desktop/src/main/migrations.ts)

Tambahkan migration **version 18**: `content_packs_registry`

```sql
CREATE TABLE IF NOT EXISTS content_packs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pack_id TEXT NOT NULL UNIQUE,
  pack_type TEXT NOT NULL DEFAULT 'bible',
  version_code TEXT NOT NULL,
  name TEXT NOT NULL,
  short_name TEXT NOT NULL DEFAULT '',
  language TEXT NOT NULL DEFAULT 'id',
  publisher TEXT DEFAULT '',
  copyright TEXT DEFAULT '',
  license_status TEXT DEFAULT '',
  source_type TEXT DEFAULT '',
  source_base_url TEXT DEFAULT '',
  installed_path TEXT NOT NULL,
  sqlite_filename TEXT NOT NULL,
  manifest_filename TEXT DEFAULT '',
  books_filename TEXT DEFAULT '',
  import_report_filename TEXT DEFAULT '',
  is_active INTEGER DEFAULT 1,
  is_default INTEGER DEFAULT 0,
  is_offline_available INTEGER DEFAULT 1,
  validation_ok INTEGER DEFAULT 0,
  fts5_created INTEGER DEFAULT 0,
  books_count INTEGER DEFAULT 0,
  chapters_count INTEGER DEFAULT 0,
  verses_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_content_packs_pack_type ON content_packs(pack_type);
CREATE INDEX IF NOT EXISTS idx_content_packs_is_active ON content_packs(is_active);
CREATE INDEX IF NOT EXISTS idx_content_packs_is_default ON content_packs(is_default);
```

---

### 3. Main Process — Content Pack Manager & Bible Repository

#### [NEW] `src/main/services/content-packs/contentPackPaths.ts`

- `getUserContentPackRoot()` → `app.getPath('userData')/content-packs/`
- `getBundledContentPackRoot()` → `resources/content-packs/` (via `__dirname`)
- `getBiblePackDirectory(packId)` → subdirectory
- `ensureContentPackDirectories()` → mkdir jika belum ada

#### [NEW] `src/main/services/content-packs/contentPackRegistry.ts`

- `registerPack(packData)` → INSERT ke `content_packs`
- `listPacks(packType?)` → SELECT
- `getDefaultPack(packType)` → SELECT WHERE is_default=1
- `setDefaultPack(packId)` → UPDATE is_default
- `removePack(packId)` → DELETE + hapus folder
- `getPackByPackId(packId)` → SELECT WHERE pack_id=?

#### [NEW] `src/main/services/content-packs/contentPackManager.ts`

- `previewBiblePackFolder(folderPath)` → baca manifest + import_report + books.json, validasi, return metadata preview
- `installBiblePackFromFolder(folderPath)` → copy files ke userData, register
- `selectFolderDialog()` → Electron dialog.showOpenDialog
- Validasi sesuai spec: manifest.validation_ok, import_report.ok, 66 books, 1189 chapters, 31102 verses, fts5_created

#### [NEW] `src/main/services/content-packs/index.ts`

Re-export public API

#### [NEW] `src/main/services/bible/bibleExternalSqliteRepository.ts`

- Buka external SQLite read-only via `better-sqlite3`
- Cache connection per pack (Map)
- `getVersions()` → dari registry `content_packs`
- `getBooks(versionCode)` → query `bible_books` dari external SQLite
- `getChapter(versionCode, bookCode, chapter)` → query `bible_verses`
- `getVerseRange(versionCode, bookCode, chapter, verseStart, verseEnd)`
- `search(versionCode, query)` → FTS5 search di external SQLite
- `getPackInfo(versionCode)` → registry metadata
- `closeAll()` → close semua cached connections (untuk app shutdown)

#### [NEW] `src/main/services/bible/bibleReferenceParser.ts`

- `parseReference(input)` → parse "Yoh 3:16", "1 Kor 13:1-13", dll
- `normalizeBookName(input)` → normalize variasi singkatan Indonesia
- `resolveBookCode(bookNameOrAlias)` → map ke book code dari books.json
- Support: nama lengkap, singkatan, kitab bernomor, pasal penuh, range ayat
- Error message ramah: "Kitab 'Xyz' tidak ditemukan. Apakah yang dimaksud 'Yosua'?"

#### [NEW] `src/main/services/bible/index.ts`

Re-export

---

### 4. IPC Layer

#### [MODIFY] [ipc-channels.ts](file:///d:/my_dev/SION-Media/sion-media-desktop/src/shared/ipc-channels.ts)

Tambahkan:

```ts
export const IPC_CONTENT_PACKS = {
  SELECT_FOLDER: 'contentPacks:selectFolder',
  PREVIEW_BIBLE_PACK: 'contentPacks:previewBiblePack',
  INSTALL_BIBLE_PACK: 'contentPacks:installBiblePack',
  LIST: 'contentPacks:list',
  REMOVE: 'contentPacks:remove',
  SET_DEFAULT: 'contentPacks:setDefault'
} as const

export const IPC_BIBLE_PACK = {
  GET_VERSIONS: 'bible:versions:list',
  GET_BOOKS: 'bible:books:list',
  GET_CHAPTER: 'bible:chapter:get',
  GET_VERSE_RANGE: 'bible:verseRange:get',
  SEARCH: 'bible:search',
  PARSE_REFERENCE: 'bible:reference:parse'
} as const
```

#### [NEW] `src/main/services/content-packs/contentPackIpcHandlers.ts`

IPC handler registration untuk content pack channels — menggunakan pola `safeIpcHandle` yang sudah ada.

#### [NEW] `src/main/services/bible/biblePackIpcHandlers.ts`

IPC handler registration untuk bible pack channels.

#### [MODIFY] [ipc-handlers.ts](file:///d:/my_dev/SION-Media/sion-media-desktop/src/main/ipc-handlers.ts)

Import dan panggil `setupContentPackIPC()` dan `setupBiblePackIPC()` dari `setupIPC()`.

---

### 5. Preload Bridge

#### [MODIFY] [preload/index.ts](file:///d:/my_dev/SION-Media/sion-media-desktop/src/preload/index.ts)

Tambahkan namespace:

```ts
contentPacks: {
  selectFolder: () => ...,
  previewBiblePack: (folderPath) => ...,
  installBiblePack: (folderPath) => ...,
  list: (packType?) => ...,
  remove: (packId) => ...,
  setDefault: (packId) => ...,
},
biblePack: {
  getVersions: () => ...,
  getBooks: (versionCode) => ...,
  getChapter: (versionCode, bookCode, chapter) => ...,
  getVerseRange: (payload) => ...,
  search: (payload) => ...,
  parseReference: (input) => ...,
}
```

#### [MODIFY] [preload/index.d.ts](file:///d:/my_dev/SION-Media/sion-media-desktop/src/preload/index.d.ts)

Tambahkan type interfaces: `ContentPacksAPI`, `BiblePackAPI`, dan tambahkan ke `API`.

---

### 6. Shared Types

#### [MODIFY] [shared/types.ts](file:///d:/my_dev/SION-Media/sion-media-desktop/src/shared/types.ts)

Tambahkan:

```ts
// Content Pack types
export type ContentPackType = 'bible' | 'hymnal' | 'reading' | 'media'

export interface ContentPackRecord { ... }  // registry row
export interface BiblePackPreview { ... }   // preview result
export interface BiblePackManifest { ... }  // manifest.json shape
export interface BiblePackImportReport { ... }
export interface BiblePackBook { ... }      // books.json item shape

// Bible external query types
export interface BibleExternalBook { ... }
export interface BibleExternalVerse { ... }
export interface BibleSearchResult { ... }
export interface BibleParsedReference { ... }

// Bible projection type
export interface BibleProjectionItem { ... }
```

---

### 7. Renderer — Bible Feature & Settings UI

#### [NEW] `src/renderer/src/features/bible/types/bible.types.ts`

Renderer-side type re-exports.

#### [NEW] `src/renderer/src/features/bible/hooks/useBiblePacks.ts`

Hook untuk list installed packs, import, remove, set default.

#### [NEW] `src/renderer/src/features/bible/hooks/useBibleReader.ts`

Hook untuk navigasi kitab/pasal/ayat dari external SQLite.

#### [NEW] `src/renderer/src/features/bible/hooks/useBibleSearch.ts`

Hook untuk FTS5 search + reference parsing.

#### [NEW] `src/renderer/src/features/bible/components/BiblePackManager.tsx`

Panel Settings/Management: list installed packs, import, remove, set default. (Ditempatkan di Settings screen)

#### [MODIFY] [screens/BibleScreen.tsx](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/screens/BibleScreen.tsx)

Rewrite: Gunakan hooks baru (`useBibleReader`, `useBibleSearch`) yang membaca dari external pack via `window.api.biblePack.*`. Pertahankan layout visual yang mirip tapi gunakan data dari content pack.

#### [MODIFY] [components/projection/BiblePanel.tsx](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/components/projection/BiblePanel.tsx)

Update: Gunakan `window.api.biblePack.*` untuk membaca kitab/ayat.

#### [MODIFY] [screens/settings/index.ts](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/screens/settings/index.ts)

Export `BiblePackManager` sebagai section baru di Settings, atau embed di existing settings page.

---

### 8. App Lifecycle — Cleanup

#### [MODIFY] [main/index.ts](file:///d:/my_dev/SION-Media/sion-media-desktop/src/main/index.ts)

- Panggil `ensureContentPackDirectories()` saat startup (setelah `initDatabase()`).
- Panggil `closeAllExternalConnections()` saat `app.on('will-quit')`.

---

## File Summary

| Area                 | New Files    | Modified Files           |
| -------------------- | ------------ | ------------------------ |
| Directory/Config     | 4 `.gitkeep` | `.gitignore`             |
| Migration            | —            | `migrations.ts`          |
| Content Pack Manager | 4 files      | —                        |
| Bible Repository     | 3 files      | —                        |
| IPC Handlers         | 2 files      | `ipc-handlers.ts`        |
| IPC Channels         | —            | `ipc-channels.ts`        |
| Shared Types         | —            | `types.ts`               |
| Preload              | —            | `index.ts`, `index.d.ts` |
| Renderer Hooks       | 3 files      | —                        |
| Renderer Components  | 1 file       | 3 files                  |
| App Lifecycle        | —            | `main/index.ts`          |
| **Total**            | **~17 new**  | **~10 modified**         |

---

## Verification Plan

### Automated Tests

```bash
npm run typecheck        # TypeScript compilation check
npm run lint             # ESLint
npm run test             # Vitest (existing 16 tests should still pass)
```

### Manual Verification

1. **Import flow**: Start app → Settings/Management → Import Bible Pack → Select `out_tb` folder → Preview metadata → Install.
2. **Registry check**: Pack muncul di list "TB · Full Offline · 66 Kitab · 31.102 Ayat · Search Ready".
3. **Bible Library**: Buka Bible screen → Pilih TB → Navigasi Kejadian 1, Mazmur 23, Yohanes 3, Wahyu 22.
4. **Search**: Cari "kasih", "sabat", "iman" — hasil muncul dari external SQLite.
5. **Reference parser**: Parse "Yoh 3:16", "Mzm 23", "Why 14:6-12", "1 Kor 13:1-13".
6. **Projection**: Send Yohanes 3:16 to Preview → Take Live → copyright tampil.
7. **Restart**: Restart app → pack masih terdeteksi dari registry.
8. **Git check**: `git status` — tidak ada file `.sqlite` yang masuk tracking.
