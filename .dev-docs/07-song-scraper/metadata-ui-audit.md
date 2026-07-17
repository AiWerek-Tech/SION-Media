# Song Metadata UI Audit & Implementation

> **Created**: 2026-05-12
> **Purpose**: Dokumentasi audit UI penampil lagu dan implementasi field metadata

---

## Ringkasan

Audit dan implementasi field metadata lagu di semua mode UI (projection, stage display, library, editor) untuk memastikan data dari `songs_full_metadata.json` ditampilkan dengan sempurna.

---

## Field Mapping Metadata

Mapping field dari `songs_full_metadata.json` ke database dan UI:

| JSON Field       | Database Column       | UI Label             | Status |
| ---------------- | --------------------- | -------------------- | ------ |
| `english_title`  | `alternate_title`     | Sub Judul (English)  | ✅     |
| `composer`       | `composer`            | Komposer             | ✅     |
| `arranger`       | `author`              | Pengarang (Arranger) | ✅     |
| `key_signature`  | `key_note`            | Nada Dasar           | ✅     |
| `time_signature` | `time_signature`      | Birama               | ✅     |
| `bible_verse`    | `scripture_reference` | Referensi Alkitab    | ✅     |
| `album`          | `category`            | Kategori             | ✅     |

---

## Hasil Audit Per Mode UI

### 1. Projection Mode (ProjectionApp.tsx)

**Status**: ✅ Lengkap untuk audience projection

**Field yang ditampilkan**:

- `key_note` - Nada dasar (overlay musik)
- `time_signature` - Birama (overlay musik)
- `tempo` - BPM (overlay musik)

**Rationale**: Projection untuk audience hanya menampilkan metadata musik dasar yang relevan untuk pemusik, bukan detail komposer/author.

---

### 2. Stage Display (StageDisplayApp.tsx)

**Status**: ✅ Lengkap untuk musisi/singer

**Field yang ditampilkan**:

- `key_note` - Nada dasar (footer)
- `composer` - Komposer (footer, baru ditambah)
- `author` - Pengarang/Arranger (footer, baru ditambah)

**Perubahan**:

- Menambahkan composer dan author di footer untuk informasi musisi

---

### 3. Library Mode

#### LibraryTitleView.tsx (List View)

**Status**: ✅ Lengkap

**Field yang ditampilkan**:

- `category` - Kategori (badge)
- `author` - Pengarang (subtitle)
- `composer` - Komposer (subtitle, baru ditambah)

**Perubahan**:

- Menambahkan composer display di subtitle

#### SongCard.tsx (Card View)

**Status**: ✅ Lengkap

**Field yang ditampilkan**:

- `alternate_title` - Sub judul (italic)
- `category` - Kategori (badge)
- `key_note` - Nada dasar (metadata badge)
- `composer` / `author` - Credits (baru ditambah)

**Perubahan**:

- Menambahkan composer/author credits display

---

### 4. Editor Mode (SongEditorScreen.tsx)

**Status**: ✅ Lengkap

**Field yang ditampilkan** (semua editable):

- `alternate_title` - Sub Judul (English/Optional)
- `category` - Kategori (dropdown)
- `author` - Pengarang (Arranger) - **BARU**
- `composer` - Komposer - **BARU**
- `scripture_reference` - Referensi Alkitab - **BARU**
- `key_note` - Nada Dasar (input dengan validasi)
- `time_signature` - Birama (dropdown)
- `tempo` - BPM (input dengan validasi)

**Perubahan**:

- Menambahkan input field untuk composer, author, scripture_reference
- Update state management untuk menyertakan field baru
- Update dirty state check untuk field baru
- Update save function untuk menyimpan field baru

---

### 5. Preview Monitors (LivePreviewPanel.tsx)

**Status**: ✅ Sesuai desain

**Field yang ditampilkan**: Hanya slide text

**Rationale**: Preview monitors untuk operator hanya menampilkan slide content, bukan metadata lagu.

---

### 6. Lyrics Pane (LibraryLyricsPane.tsx)

**Status**: ✅ Sesuai desain

**Field yang ditampilkan**: Hanya lyrics

**Rationale**: Lyrics pane khusus untuk melihat lirik, bukan metadata.

---

## Perubahan Kode

### File yang Dimodifikasi

1. **src/renderer/src/screens/SongEditorScreen.tsx**
   - Added state: `author`, `composer`, `scriptureReference`
   - Added UI input fields untuk composer, author, scripture_reference
   - Updated initial snapshot
   - Updated isDirty check
   - Updated save function

2. **src/renderer/src/stageDisplay/StageDisplayApp.tsx**
   - Added composer dan author display di footer

3. **src/renderer/src/components/library/LibraryTitleView.tsx**
   - Added composer display di subtitle

4. **src/renderer/src/components/SongCard.tsx**
   - Added composer/author credits display

5. **src/renderer/src/types.ts**
   - Updated `ConfidencePayload.song` untuk menyertakan `composer` dan `author`

6. **src/renderer/src/utils/confidencePayloadBuilder.ts**
   - Updated function signature untuk menerima composer dan author
   - Updated song metadata building untuk menyertakan composer dan author

---

## Database Update

### Update Script

**File**: `scripts/update-song-metadata.mjs`

**Purpose**: Update database dengan metadata dari `songs_full_metadata.json`

**Usage**:

```bash
# Update resources database (default)
node scripts/update-song-metadata.mjs

# Update specific database
node scripts/update-song-metadata.mjs /path/to/sion.db
```

**Features**:

- Normalisasi song number untuk matching
- Mapping field JSON ke database columns
- Error handling per song update
- Summary output

---

## Database Default Configuration

**File**: `src/main/database.ts`

**Initialization Logic** (lines 449-463):

```typescript
export function initDatabase(): void {
  const dbPath = join(app.getPath('userData'), 'sion.db')
  const resourcesPath = join(__dirname, '../../resources/sion.db')

  // Copy default database from resources if it doesn't exist
  if (!existsSync(dbPath) && existsSync(resourcesPath)) {
    console.log('Copying default database from resources...')
    copyFileSync(resourcesPath, dbPath)
    console.log('Default database copied successfully')
  }
  // ...
}
```

**Status**: ✅ Database default sudah dikonfigurasi dengan benar

**Flow**:

1. Pada instalasi pertama, aplikasi menyalin `resources/sion.db` ke `userData/sion.db`
2. Setiap user baru akan mendapatkan database dengan metadata yang sudah diupdate
3. Update script default mengupdate `resources/sion.db` untuk memastikan database default selalu up-to-date

---

## Verifikasi

Untuk memverifikasi metadata sudah ada di database:

1. Buka aplikasi
2. Cari lagu di library (misalnya lagu nomor 1 "Di Hadapan Hadirat-Mu")
3. Cek apakah field metadata muncul:
   - Composer: Isaac Watts
   - Author: John Hatton
   - Key Note: 2#=D
   - Time Signature: 4/4
   - Category: LS. Edisi Baru

---

## Catatan Penting

1. **Projection Mode**: Hanya menampilkan metadata musik dasar (key, time signature, tempo) untuk audience
2. **Stage Display**: Menampilkan composer dan author untuk informasi musisi
3. **Library Mode**: Menampilkan metadata lengkap untuk browsing
4. **Editor Mode**: Semua field metadata editable
5. **Database Default**: `resources/sion.db` adalah database default yang disalin pada instalasi pertama

---

## Referensi

- Metadata source: `.dev-docs/07-song-scraper/songs_full_metadata.json`
- Update script: `scripts/update-song-metadata.mjs`
- Database initialization: `src/main/database.ts`
