# Implementation Log: Media Library Collections & Song Binding v12

> Date: May 13, 2026
> Status: Complete

## Summary

Fase lanjutan media library kini membawa SION Media dari sekadar asset repository menjadi workflow background yang siap dipakai lintas level:

- level global service
- level collection / pack
- level song binding
- level operator bulk management

Pass ini menambahkan `media_collections`, bulk actions untuk asset library, serta binding background langsung ke lagu dari `SongEditor`.

## Scope

### 1. Media Collections Persistence

**Files modified:**

- `src/main/migrations.ts`
- `src/main/database.ts`

**Perubahan utama:**

- Menambahkan migrasi `projection_atmosphere_media_collections_v1`
- Menambahkan tabel:
  - `media_collections`
  - `media_collection_items`
- Menyediakan relasi many-to-many antara asset dan collection
- Menambahkan `cover_asset_id` untuk identity visual collection
- Menyediakan query asset count dan cover thumbnail untuk UI collection manager

### 2. Bulk Media Operations

**Files modified:**

- `src/main/database.ts`
- `src/main/ipc-handlers.ts`
- `src/preload/index.ts`
- `src/preload/index.d.ts`

**Perubahan utama:**

- Bulk update favorite state untuk banyak asset sekaligus
- Bulk update kategori asset terpilih
- Bulk delete untuk selection asset
- Add/remove selection ke collection aktif

**Tujuan operator:**

- membangun pack background lebih cepat
- merapikan library tanpa edit satu per satu
- mengelompokkan seasonal packs / sermon packs / worship packs dengan workflow desktop yang lebih realistis

### 3. Referential Cleanup Safety

**Files modified:**

- `src/main/database.ts`

**Perubahan utama:**

- Saat asset dihapus, backend kini membersihkan referensi yang menunjuk ke asset tersebut dari:
  - `settings.projection_default_atmosphere`
  - `settings.projection_bg_image`
  - `songs.song_background_config`
  - `media_collections.cover_asset_id`
- Dengan ini background system tidak menyisakan referensi mati saat asset library berubah

Ini penting karena layer media sekarang dipakai lintas global dan lagu, jadi cleanup tidak lagi cukup hanya di UI settings.

### 4. Background Settings Workspace Upgrade

**Files modified:**

- `src/renderer/src/screens/settings/BackgroundSettings.tsx`

**Perubahan utama:**

- Menambahkan chip filter collection:
  - `Semua Asset`
  - `Unassigned`
  - per-collection chips
- Menambahkan `Collection Manager` langsung di workspace settings
- Menambahkan bulk action bar saat operator memilih banyak asset
- Menambahkan selection toggle per-card
- Menambahkan metadata visual untuk membership collection pada asset card dan detail panel
- Menambahkan create collection dari selection yang sedang aktif
- Menambahkan aksi:
  - add selection to active collection
  - remove selection from active collection
  - set selected asset as collection cover
  - delete collection

### 5. Song-Level Asset Binding

**Files modified:**

- `src/renderer/src/screens/SongEditorScreen.tsx`

**Perubahan utama:**

- `SongEditor` kini mendukung 3 mode atmosphere:
  - `inherit-global`
  - `scene-preset`
  - `library-asset`
- Jika mode `library-asset` dipilih, operator dapat:
  - memfilter asset berdasarkan collection
  - memilih asset image/video dari media library
  - menyimpan binding tersebut langsung ke `song_background_config`
- Payload song background disimpan sebagai `AtmosphereConfig` yang mereferensikan:
  - `media.assetId`
  - `media.path`
  - `mode`

Hasilnya, lagu tidak lagi bergantung hanya pada preset generik; lagu tertentu bisa memiliki background asset sendiri yang curated dari library enterprise.

### 6. Management Visibility

**Files modified:**

- `src/renderer/src/screens/modes/ManagementMode.tsx`

**Perubahan utama:**

- Inspector lagu kini menampilkan ringkasan `Background Binding`
- Operator bisa melihat apakah lagu memakai:
  - `Global`
  - `Preset Lagu`
  - `Asset Library`

Ini mengurangi blind spot saat review metadata dan kurasi library konten.

## Architectural Result

Dengan pass ini, arsitektur background bergerak menjadi:

1. `media_assets` untuk source of truth asset
2. `media_collections` untuk grouping operasional
3. `projection_default_atmosphere` untuk default global
4. `song_background_config` untuk override per lagu
5. `usage_count` untuk ranking dan analytics dasar

Jadi pipeline sekarang benar-benar mendukung:

- global defaults
- curated packs
- per-song override
- safe deletion
- bulk operator workflow

## Verification

Checklist verifikasi untuk pass ini:

- Diagnostics bersih pada:
  - `database.ts`
  - `ipc-handlers.ts`
  - `preload/index.ts`
  - `preload/index.d.ts`
  - `BackgroundSettings.tsx`
  - `SongEditorScreen.tsx`
  - `ManagementMode.tsx`
- Type surface media API sinkron dari main -> preload -> renderer

## Current Gaps

- Song editor belum punya gallery thumbnail penuh; picker masih berbasis dropdown/filter agar integrasi tetap ringan dan stabil
- Collections belum memiliki ordering manual / drag-sort
- Belum ada playlist-level background automation
- Belum ada analytics view untuk asset usage lintas service

## Next Natural Phase

- thumbnail picker penuh di `SongEditor`
- drag-sort / ordering dalam collection
- song bulk background assignment
- playlist / service template background rules
- usage analytics dashboard untuk media packs
