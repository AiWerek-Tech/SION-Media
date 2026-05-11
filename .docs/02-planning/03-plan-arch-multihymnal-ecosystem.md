# Audit & Fix: Multi-Hymnal Ecosystem Architecture Implementation

Audit menyeluruh terhadap implementasi arsitektur `arch-multihymnal-ecosystem.md` mengungkapkan **6 bug kritis/high-priority** yang harus diperbaiki agar aplikasi berjalan dengan benar.

Task: Fix All Multi-Hymnal Ecosystem Bugs
[x] Bug 1: Remove duplicate IPC handlers in ipc-handlers.ts
[x] Bug 2: Fix display channel name mismatch in preload/index.ts
[x] Bug 3: Fix Bible verse search SQL in database.ts
[x] Bug 4: Add Bible & Slides API to preload/index.ts + index.d.ts
[x] Bug 5: Add relation methods to SongsAPI type declaration
[x] Bug 6: Fix theme-manager.ts merge state persistence
[x] Bug 7: Fix SongRelation type mismatch in shared/types.ts
[x] Verification: typecheck ✅ + lint ✅ + build ✅

## Temuan Bug

### 🔴 CRITICAL — App Crash on Startup

#### Bug 1: Duplicate IPC Handler Registration
**File:** [ipc-handlers.ts](file:///d:/my_dev/SION-Media/src/main/ipc-handlers.ts)

Bible handlers didaftarkan **DUA KALI** (lines 199-215 DAN lines 337-356). Custom Slides handlers juga didaftarkan **DUA KALI** (lines 217-236 DAN lines 358-381).

Electron's `ipcMain.handle()` akan melempar `Error: Attempted to register a second handler for 'channel'` saat channel yang sama didaftarkan dua kali. **Ini akan menyebabkan crash saat startup.**

```diff
 // Lines 199-236: Bible & Slides handlers (FIRST registration — KEEP)
 
-// Lines 337-381: Bible & Slides handlers (DUPLICATE — DELETE)
-  // ========== Bible IPC Handlers ==========
-  ipcMain.handle('db:get-bible-translations', ...)
-  ... (semua duplicate handlers)
-  // ========== Custom Slides IPC Handlers ==========
-  ... (semua duplicate handlers)
-  // ========== Slide Groups IPC Handlers ==========
-  ... (semua duplicate handlers)
```

---

### 🔴 CRITICAL — Silent Feature Failure

#### Bug 2: Display Channel Name Mismatch
- [ipc-channels.ts](file:///d:/my_dev/SION-Media/src/shared/ipc-channels.ts) line 60: `GET_ALL: 'display_get-all'` (underscore `_`)
- [ipc-handlers.ts](file:///d:/my_dev/SION-Media/src/main/ipc-handlers.ts) line 149: `ipcMain.handle('display_get-all', ...)` (underscore `_`)
- [preload/index.ts](file:///d:/my_dev/SION-Media/src/preload/index.ts) line 52: `ipcRenderer.invoke('display:get-all')` (colon `:`)

Renderer memanggil `display:get-all` tapi handler mendengarkan `display_get-all`. **Deteksi monitor tidak akan pernah berhasil.**

```diff
-  getAll: (): Promise<unknown[]> => ipcRenderer.invoke('display:get-all'),
+  getAll: (): Promise<unknown[]> => ipcRenderer.invoke('display_get-all'),
```

---

### 🟡 HIGH — Bible Search Broken

#### Bug 3: Bible Verse Search SQL Error
**File:** [database.ts](file:///d:/my_dev/SION-Media/src/main/database.ts) lines 796-811

Query menggunakan `WHERE bible_verses_fts MATCH ?` tanpa JOIN ke tabel FTS. Harus menggunakan `JOIN bible_verses_fts f ON v.id = f.rowid` dan `WHERE f.text MATCH ?`.

```diff
   let sql = `
     SELECT v.*, b.short_name as book_short, b.long_name as book_long, b.testament
     FROM bible_verses v
     JOIN bible_books b ON v.book_id = b.id
-    WHERE bible_verses_fts MATCH ?
+    JOIN bible_verses_fts f ON v.id = f.rowid
+    WHERE f.text MATCH ?
   `
```

---

### 🟡 HIGH — Missing Preload APIs

#### Bug 4: Bible & Custom Slides API Not Exposed to Renderer
**Files:** [preload/index.ts](file:///d:/my_dev/SION-Media/src/preload/index.ts), [preload/index.d.ts](file:///d:/my_dev/SION-Media/src/preload/index.d.ts)

IPC handlers untuk Bible dan Custom Slides sudah terdaftar di backend, tetapi preload bridge **tidak mengekspos** API ini ke renderer. Akibatnya renderer tidak bisa memanggil operasi Bible atau Custom Slides.

**Solusi:** Tambahkan `bible` dan `slides` namespace ke preload `api` object dan type declarations.

---

### 🟡 HIGH — Type Declaration Incomplete

#### Bug 5: SongsAPI Missing Relation Methods in Type Declarations
**File:** [preload/index.d.ts](file:///d:/my_dev/SION-Media/src/preload/index.d.ts) lines 40-47

Preload `index.ts` sudah mengekspos `getRelations`, `addRelation`, `deleteRelation` (lines 81-86), tetapi type declaration `SongsAPI` di `index.d.ts` **tidak mencantumkan** method-method ini.

---

### 🟡 HIGH — Theme State Never Persisted

#### Bug 6: Theme Manager `mergeProjectionTheme` Doesn't Update State
**File:** [theme-manager.ts](file:///d:/my_dev/SION-Media/src/main/theme-manager.ts) line 12-22

`mergeProjectionTheme()` mengembalikan hasil merge tapi **tidak pernah meng-update** `latestProjectionTheme`. Saat projection window di-reload atau stage display dibuat, snapshot theme akan selalu `null`.

```diff
 export function mergeProjectionTheme(theme: unknown): unknown {
+  let merged: unknown;
   if (latestProjectionTheme && typeof latestProjectionTheme === 'object' && theme && typeof theme === 'object') {
-    return { ...latestProjectionTheme, ...theme }
+    merged = { ...latestProjectionTheme, ...theme }
+  } else {
+    merged = theme
   }
-  return theme
+  latestProjectionTheme = merged
+  return merged
 }
```

---

### 🟢 MINOR — Type Mismatches (Non-breaking)

#### Bug 7: SongRelation Type vs DB Column Mismatch
**File:** [shared/types.ts](file:///d:/my_dev/SION-Media/src/shared/types.ts) lines 78-84

Type mendefinisikan `song_id` / `related_song_id`, tapi database menggunakan `source_song_id` / `target_song_id`. Type `relation_type` tidak mencakup value default `'translation'`.

---

## Proposed Changes

### 1. IPC Handlers — Remove Duplicates

#### [MODIFY] [ipc-handlers.ts](file:///d:/my_dev/SION-Media/src/main/ipc-handlers.ts)
- Hapus seluruh blok duplikat lines 337-381 (Bible, Custom Slides, dan Slide Groups handlers yang terduplikasi)

---

### 2. Display Channel Fix

#### [MODIFY] [preload/index.ts](file:///d:/my_dev/SION-Media/src/preload/index.ts)
- Perbaiki `display:get-all` → `display_get-all` agar sesuai dengan handler

---

### 3. Bible Search SQL Fix

#### [MODIFY] [database.ts](file:///d:/my_dev/SION-Media/src/main/database.ts)
- Tambahkan `JOIN bible_verses_fts f ON v.id = f.rowid` dan ubah `WHERE bible_verses_fts MATCH ?` → `WHERE f.text MATCH ?`

---

### 4. Add Bible & Slides API to Preload

#### [MODIFY] [preload/index.ts](file:///d:/my_dev/SION-Media/src/preload/index.ts)
- Tambahkan `bible` namespace dengan semua operasi Bible
- Tambahkan `slides` namespace dengan semua operasi Custom Slides & Groups

#### [MODIFY] [preload/index.d.ts](file:///d:/my_dev/SION-Media/src/preload/index.d.ts)
- Tambahkan `BibleAPI`, `SlidesAPI` interface declarations
- Tambahkan `getRelations`, `addRelation`, `deleteRelation` ke `SongsAPI`
- Tambahkan `bible` dan `slides` ke `API` interface

---

### 5. Theme Manager Fix

#### [MODIFY] [theme-manager.ts](file:///d:/my_dev/SION-Media/src/main/theme-manager.ts)
- Perbaiki `mergeProjectionTheme()` agar mengupdate `latestProjectionTheme`

---

### 6. SongRelation Type Fix

#### [MODIFY] [shared/types.ts](file:///d:/my_dev/SION-Media/src/shared/types.ts)
- Ubah field names agar sesuai database: `source_song_id`, `target_song_id`
- Tambahkan `'translation'` ke union type `relation_type`

---

## Verification Plan

### Automated Tests
1. `npm run typecheck` — Pastikan zero TypeScript errors
2. `npm run lint` — Pastikan zero ESLint errors/warnings
3. `npx electron-vite build` — Pastikan production build berhasil

### Manual Verification
- Jalankan `npm run dev` untuk memastikan app tidak crash saat startup (verifikasi Bug 1 fixed)
