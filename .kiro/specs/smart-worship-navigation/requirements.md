# Requirements Document

## Introduction

Fitur **Smart Worship Navigation** menambahkan sistem navigasi kontekstual pada Worship Projection Mode di SION Media Desktop. Sistem navigasi saat ini bersifat linear murni — setiap klik Next/Previous hanya berpindah satu slide ke depan atau belakang tanpa memahami struktur lagu.

Fitur ini memperkenalkan **Navigation Flow Engine** yang memahami struktur section lagu (verse, chorus, bridge, dll) dan secara otomatis menentukan slide tujuan berikutnya berdasarkan aturan navigasi worship yang kontekstual. Ketika lagu memiliki chorus, navigasi Next akan mengikuti pola V1 → C → V2 → C → V3 → C secara otomatis. Ketika lagu tidak memiliki chorus, navigasi tetap linear seperti sebelumnya.

Fitur ini dibangun di atas infrastruktur yang sudah ada: `useProjectionStore`, `SlideData.sectionLabel`, `SectionIndexMap`, dan `generateSlidesForSong` — tanpa merombak arsitektur projection runtime yang sudah stabil.

---

## Glossary

- **Navigation_Flow_Engine**: Komponen baru yang bertanggung jawab menghitung target slide berikutnya/sebelumnya berdasarkan aturan navigasi kontekstual.
- **Navigation_Flow**: Urutan section yang dihasilkan oleh Navigation_Flow_Engine untuk satu lagu, misalnya `[V1, C, V2, C, V3, C]`.
- **Navigation_Flow_Step**: Satu elemen dalam Navigation_Flow, merepresentasikan satu section yang akan ditampilkan.
- **Section**: Bagian struktural dari sebuah lagu, diidentifikasi oleh `sectionLabel` pada `SlideData`. Contoh: `verse`, `chorus`, `bridge`, `intro`, `ending`.
- **Verse_Section**: Section dengan `sectionLabel` yang mengandung kata `verse` (case-insensitive). Contoh: `verse`, `Verse 1`, `VERSE 2`.
- **Chorus_Section**: Section dengan `sectionLabel` yang mengandung kata `chorus` atau `reff` atau `refrain` (case-insensitive).
- **Bridge_Section**: Section dengan `sectionLabel` yang mengandung kata `bridge` (case-insensitive).
- **Intro_Section**: Section dengan `sectionLabel` yang mengandung kata `intro` (case-insensitive).
- **Ending_Section**: Section dengan `sectionLabel` yang mengandung kata `ending` atau `outro` atau `tag` (case-insensitive).
- **Slide_Sequence**: Array `SlideData[]` yang merepresentasikan semua slide dari satu lagu, dalam urutan asli dari `generateSlidesForSong`.
- **Section_Boundary**: Slide pertama dari setiap section yang berbeda dalam Slide_Sequence.
- **Smart_Mode**: Mode navigasi aktif ketika lagu memiliki setidaknya satu Chorus_Section.
- **Linear_Mode**: Mode navigasi fallback ketika lagu tidak memiliki Chorus_Section, identik dengan perilaku navigasi saat ini.
- **Flow_Position**: Indeks posisi saat ini dalam Navigation_Flow (bukan indeks slide).
- **Projection_Store**: `useProjectionStore` — Zustand store yang mengelola seluruh state projection runtime.
- **Program_Slides**: `programSlides` dalam Projection_Store — array slide yang sedang aktif di output live.
- **Program_Slide_Index**: `programSlideIndex` dalam Projection_Store — posisi slide yang sedang diproyeksikan.
- **Section_Index_Map**: `SectionIndexMap` — map dari section label ke array indeks slide, sudah ada di Projection_Store.
- **Worship_Flow_Indicator**: Komponen UI baru yang menampilkan urutan section aktif (V1, C, V2, C, ...) dengan highlight posisi saat ini.

---

## Requirements

### Requirement 1: Song Section Model yang Terstruktur

**User Story:** Sebagai operator worship, saya ingin sistem memahami struktur section lagu secara eksplisit, sehingga navigasi dapat bekerja berdasarkan makna section, bukan hanya posisi slide.

#### Acceptance Criteria

1. THE `Navigation_Flow_Engine` SHALL mengklasifikasikan setiap section dalam `Slide_Sequence` ke dalam salah satu dari tipe berikut: `verse`, `chorus`, `bridge`, `intro`, `ending`, atau `other`.
2. WHEN `sectionLabel` mengandung kata `verse` (case-insensitive), THE `Navigation_Flow_Engine` SHALL mengklasifikasikan section tersebut sebagai `verse`.
3. WHEN `sectionLabel` mengandung kata `chorus`, `reff`, atau `refrain` (case-insensitive) dan tidak mengandung kata `verse`, THE `Navigation_Flow_Engine` SHALL mengklasifikasikan section tersebut sebagai `chorus`.
4. WHEN `sectionLabel` mengandung kata `bridge` (case-insensitive) dan tidak mengandung kata `verse` atau `chorus`, THE `Navigation_Flow_Engine` SHALL mengklasifikasikan section tersebut sebagai `bridge`.
5. WHEN `sectionLabel` mengandung kata `intro` (case-insensitive) dan tidak mengandung kata `verse`, `chorus`, atau `bridge`, THE `Navigation_Flow_Engine` SHALL mengklasifikasikan section tersebut sebagai `intro`.
6. WHEN `sectionLabel` mengandung kata `ending`, `outro`, atau `tag` (case-insensitive) dan tidak mengandung kata `verse`, `chorus`, `bridge`, atau `intro`, THE `Navigation_Flow_Engine` SHALL mengklasifikasikan section tersebut sebagai `ending`.
7. WHEN `sectionLabel` mengandung beberapa kata kunci yang berbeda, THE `Navigation_Flow_Engine` SHALL menggunakan prioritas klasifikasi berikut secara berurutan: `verse` → `chorus` → `bridge` → `intro` → `ending` → `other`.
8. WHEN `sectionLabel` tidak cocok dengan pola manapun di atas, THE `Navigation_Flow_Engine` SHALL mengklasifikasikan section tersebut sebagai `other`.
9. THE `Navigation_Flow_Engine` SHALL menghasilkan klasifikasi yang identik untuk input `sectionLabel` yang sama, tanpa memandang urutan pemanggilan (deterministic).
10. THE `Navigation_Flow_Engine` SHALL menghasilkan klasifikasi yang identik untuk `sectionLabel` yang sama meskipun berbeda kapitalisasi (`verse`, `Verse`, `VERSE` → semua `verse`).

---

### Requirement 2: Navigation Flow Resolution

**User Story:** Sebagai operator worship, saya ingin sistem secara otomatis menghitung urutan navigasi yang benar untuk lagu dengan chorus, sehingga saya tidak perlu mengingat kapan harus menekan chorus secara manual.

#### Acceptance Criteria

1. WHEN `Slide_Sequence` mengandung setidaknya satu `Chorus_Section`, THE `Navigation_Flow_Engine` SHALL mengaktifkan `Smart_Mode` untuk lagu tersebut.
2. WHEN `Slide_Sequence` tidak mengandung `Chorus_Section`, THE `Navigation_Flow_Engine` SHALL mengaktifkan `Linear_Mode` untuk lagu tersebut.
3. WHILE `Smart_Mode` aktif, THE `Navigation_Flow_Engine` SHALL menghasilkan `Navigation_Flow` dengan pola: setiap `Verse_Section` diikuti oleh `Chorus_Section`, kecuali setelah verse terakhir yang diikuti oleh `Ending_Section` (jika ada) atau akhir lagu.
4. WHILE `Smart_Mode` aktif dan lagu memiliki `Intro_Section`, THE `Navigation_Flow_Engine` SHALL menempatkan `Intro_Section` sebagai elemen pertama dalam `Navigation_Flow`.
5. WHILE `Smart_Mode` aktif dan lagu memiliki `Bridge_Section`, THE `Navigation_Flow_Engine` SHALL menempatkan `Bridge_Section` setelah chorus terakhir sebelum verse terakhir, atau setelah semua verse jika tidak ada posisi yang lebih tepat.
6. WHILE `Linear_Mode` aktif, THE `Navigation_Flow_Engine` SHALL menghasilkan `Navigation_Flow` yang identik dengan urutan section asli dari `Slide_Sequence`.
7. THE `Navigation_Flow_Engine` SHALL menghasilkan `Navigation_Flow` yang sama untuk `Slide_Sequence` yang sama, tanpa memandang kapan atau berapa kali dipanggil (idempotent).
8. THE `Navigation_Flow_Engine` SHALL menyelesaikan kalkulasi `Navigation_Flow` dalam waktu kurang dari 10 milidetik untuk lagu dengan maksimal 50 section.
9. IF `Slide_Sequence` kosong atau null, THEN THE `Navigation_Flow_Engine` SHALL mengembalikan `Navigation_Flow` kosong tanpa melempar exception.

---

### Requirement 3: Smart Next Navigation

**User Story:** Sebagai operator worship, saya ingin tombol Next secara otomatis mengikuti alur worship yang benar (V1 → C → V2 → C → ...), sehingga saya dapat fokus pada ibadah tanpa khawatir urutan navigasi.

#### Acceptance Criteria

1. WHEN operator menekan Next dan `Smart_Mode` aktif dan `Program_Slide_Index` berada di dalam `Verse_Section`, THE `Projection_Store` SHALL berpindah ke slide pertama (indeks 0 dalam section) dari `Chorus_Section` berikutnya dalam `Navigation_Flow`, dan memperbarui `Flow_Position` serta tipe section aktif menjadi `chorus`.
2. WHEN operator menekan Next dan `Smart_Mode` aktif dan `Program_Slide_Index` berada di slide terakhir dari `Chorus_Section`, THE `Projection_Store` SHALL berpindah ke slide pertama (indeks 0 dalam section) dari `Verse_Section` berikutnya dalam `Navigation_Flow`, dan memperbarui `Flow_Position` serta tipe section aktif menjadi `verse`.
3. WHEN operator menekan Next dan `Smart_Mode` aktif dan `Program_Slide_Index` berada di slide non-terakhir dalam `Chorus_Section`, THE `Projection_Store` SHALL berpindah ke slide berikutnya dalam section yang sama (navigasi linear dalam section).
4. WHEN operator menekan Next dan `Smart_Mode` aktif dan `Program_Slide_Index` berada di slide non-terakhir dalam `Verse_Section`, THE `Projection_Store` SHALL berpindah ke slide berikutnya dalam section yang sama (navigasi linear dalam section).
5. WHEN operator menekan Next dan `Smart_Mode` aktif dan `Program_Slide_Index` berada di slide terakhir dari `Verse_Section` terakhir dan tidak ada `Ending_Section`, THE `Projection_Store` SHALL berpindah ke slide pertama dari `Chorus_Section` terakhir dalam `Navigation_Flow`.
6. WHEN operator menekan Next dan `Smart_Mode` aktif dan `Program_Slide_Index` berada di slide terakhir dari `Chorus_Section` terakhir dan tidak ada section berikutnya, THE `Projection_Store` SHALL mempertahankan posisi di slide terakhir (tidak melewati batas akhir lagu).
7. WHEN operator menekan Next dan `Linear_Mode` aktif, THE `Projection_Store` SHALL berpindah ke slide berikutnya secara linear, identik dengan perilaku navigasi saat ini.
8. WHEN operator menekan Next dan `projectionState` bukan `LIVE` atau `FREEZE`, THE `Projection_Store` SHALL mengabaikan perintah navigasi (tidak ada perubahan state).
9. THE `Projection_Store` SHALL mengirimkan `projection:slide-update` IPC event setelah setiap perpindahan slide yang berhasil.

---

### Requirement 4: Smart Previous Navigation

**User Story:** Sebagai operator worship, saya ingin tombol Previous juga bekerja secara logis mengikuti alur worship (V2 ← C ← V1), sehingga saya dapat kembali ke bagian yang benar jika terjadi kesalahan.

#### Acceptance Criteria

1. WHEN operator menekan Previous dan `Smart_Mode` aktif dan `Program_Slide_Index` berada di slide pertama (indeks 0 dalam section) dari `Verse_Section` (bukan verse pertama), THE `Projection_Store` SHALL berpindah ke slide pertama dari `Chorus_Section` sebelumnya dalam `Navigation_Flow`, dan memperbarui `Flow_Position` serta tipe section aktif menjadi `chorus`.
2. WHEN operator menekan Previous dan `Smart_Mode` aktif dan `Program_Slide_Index` berada di slide pertama (indeks 0 dalam section) dari `Chorus_Section`, THE `Projection_Store` SHALL berpindah ke slide pertama dari `Verse_Section` sebelumnya dalam `Navigation_Flow`, dan memperbarui `Flow_Position` serta tipe section aktif menjadi `verse`.
3. WHEN operator menekan Previous dan `Smart_Mode` aktif dan `Program_Slide_Index` berada di slide non-pertama dalam section manapun, THE `Projection_Store` SHALL berpindah ke slide sebelumnya dalam section yang sama (navigasi linear dalam section).
4. WHEN operator menekan Previous dan `Smart_Mode` aktif dan `Program_Slide_Index` berada di slide pertama dari section pertama dalam `Navigation_Flow`, THE `Projection_Store` SHALL mempertahankan posisi di slide pertama (tidak melewati batas awal lagu).
5. WHEN operator menekan Previous dan `Linear_Mode` aktif, THE `Projection_Store` SHALL berpindah ke slide sebelumnya secara linear, identik dengan perilaku navigasi saat ini.
6. WHEN operator menekan Previous dan `projectionState` bukan `LIVE` atau `FREEZE`, THE `Projection_Store` SHALL mengabaikan perintah navigasi.
7. THE `Projection_Store` SHALL mengirimkan `projection:slide-update` IPC event setelah setiap perpindahan slide yang berhasil.

---

### Requirement 5: Navigation Flow State Management

**User Story:** Sebagai operator worship, saya ingin sistem selalu mengetahui posisi saya dalam alur lagu, sehingga navigasi selalu konsisten dan dapat diprediksi.

#### Acceptance Criteria

1. WHEN lagu baru di-load ke `Projection_Store` melalui `setSlides`, THE `Projection_Store` SHALL menghitung dan menyimpan `Navigation_Flow` untuk lagu tersebut.
2. WHEN `takeCue` dieksekusi, THE `Projection_Store` SHALL menginisialisasi `Flow_Position` ke posisi yang sesuai dengan slide yang di-commit ke program.
3. WHEN `nextSlide` atau `prevSlide` dieksekusi dan `Smart_Mode` aktif, THE `Projection_Store` SHALL memperbarui `Flow_Position` sesuai dengan perpindahan yang terjadi — `Flow_Position` hanya berubah saat perintah navigasi dieksekusi, bukan secara otomatis.
4. WHEN `goToLiveSlide` dieksekusi, THE `Projection_Store` SHALL menghitung ulang `Flow_Position` berdasarkan slide tujuan.
5. WHEN `clearScreen` dieksekusi, THE `Projection_Store` SHALL mereset `Flow_Position` ke nilai awal.
6. THE `Projection_Store` SHALL memastikan `Flow_Position` selalu valid (dalam rentang `Navigation_Flow`) setelah setiap operasi navigasi.
7. IF `Navigation_Flow` berubah karena `hotSwapSlides`, THEN THE `Projection_Store` SHALL menghitung ulang `Navigation_Flow` dan menyesuaikan `Flow_Position` ke posisi terdekat yang valid.

---

### Requirement 6: Worship Flow Indicator UI

**User Story:** Sebagai operator worship, saya ingin melihat urutan section lagu secara visual (V1, C, V2, C, ...) dengan indikator posisi saat ini, sehingga saya selalu tahu di mana posisi saya dalam lagu dan apa yang akan datang berikutnya.

#### Acceptance Criteria

1. THE `Worship_Flow_Indicator` SHALL menampilkan setiap `Navigation_Flow_Step` sebagai badge dengan label singkat: `V1`, `V2`, `C`, `B`, `I`, `E`, atau label custom untuk section `other`.
2. WHILE `Smart_Mode` aktif, THE `Worship_Flow_Indicator` SHALL menampilkan badge untuk setiap step dalam `Navigation_Flow` secara horizontal.
3. WHILE `Linear_Mode` aktif, THE `Worship_Flow_Indicator` SHALL menampilkan badge untuk setiap section unik dalam urutan asli lagu.
4. WHEN `Flow_Position` berubah, THE `Worship_Flow_Indicator` SHALL memperbarui highlight visual untuk menunjukkan step yang sedang aktif.
5. THE `Worship_Flow_Indicator` SHALL menampilkan step berikutnya (next step) dengan visual yang berbeda dari step aktif (misalnya opacity lebih rendah atau warna berbeda).
6. WHEN `projectionState` adalah `CLEAR` atau tidak ada lagu yang di-load, THE `Worship_Flow_Indicator` SHALL menampilkan state kosong tanpa badge.
7. THE `Worship_Flow_Indicator` SHALL dapat di-scroll secara horizontal jika jumlah badge melebihi lebar container yang tersedia.
8. THE `Worship_Flow_Indicator` SHALL ditempatkan di area ControlBar atau di bawah Program Monitor, tanpa mengubah layout utama `ProjectionMode.tsx`.
9. WHEN operator mengklik badge section dalam `Worship_Flow_Indicator`, THE `Projection_Store` SHALL berpindah ke slide pertama dari section tersebut (quick jump via `goToLiveSection`).

---

### Requirement 7: Preview Next Section Accuracy

**User Story:** Sebagai operator worship, saya ingin preview "next slide" yang ditampilkan di monitor selalu akurat mencerminkan slide yang akan muncul setelah Next ditekan, sehingga saya dapat mempersiapkan diri dengan benar.

#### Acceptance Criteria

1. WHILE `Smart_Mode` aktif, THE `Projection_Store` SHALL menghitung `nextSlideData` berdasarkan aturan Smart Navigation (bukan hanya `programSlideIndex + 1`).
2. WHEN `Program_Slide_Index` berada di slide terakhir dari `Verse_Section`, THE `Projection_Store` SHALL menetapkan `nextSlideData` ke slide pertama dari `Chorus_Section` berikutnya.
3. WHEN `Program_Slide_Index` berada di slide terakhir dari `Chorus_Section`, THE `Projection_Store` SHALL menetapkan `nextSlideData` ke slide pertama dari `Verse_Section` berikutnya.
4. WHEN tidak ada slide berikutnya dalam `Navigation_Flow`, THE `Projection_Store` SHALL menetapkan `nextSlideData` ke `null`.
5. WHILE `Linear_Mode` aktif, THE `Projection_Store` SHALL menghitung `nextSlideData` secara linear (`programSlideIndex + 1`), identik dengan perilaku saat ini.
6. THE `Projection_Store` SHALL memperbarui `nextSlideData` setiap kali `programSlideIndex` berubah.
7. THE `nextSlideText` yang dikirim dalam `SlideData` melalui IPC SHALL mencerminkan teks dari `nextSlideData` yang dihitung oleh Smart Navigation.

---

### Requirement 8: Stabilitas dan Keamanan Runtime

**User Story:** Sebagai developer, saya ingin Smart Navigation tidak mengganggu stabilitas projection runtime yang sudah ada, sehingga tidak ada risiko desync, race condition, atau infinite loop selama ibadah berlangsung.

#### Acceptance Criteria

1. THE `Navigation_Flow_Engine` SHALL menghasilkan `Navigation_Flow` yang bersifat immutable setelah dihitung — tidak ada modifikasi in-place pada array yang sudah ada.
2. THE `Navigation_Flow_Engine` SHALL menyelesaikan kalkulasi tanpa side effects (pure function) — tidak memodifikasi state eksternal selama kalkulasi.
3. IF `Navigation_Flow_Engine` menerima input yang tidak valid (null, undefined, array kosong), THEN THE `Navigation_Flow_Engine` SHALL mengembalikan `Navigation_Flow` kosong secara silent tanpa melempar exception dan tanpa menghasilkan log error.
4. THE `Projection_Store` SHALL memastikan bahwa setiap transisi navigasi Smart menghasilkan `programSlideIndex` yang valid (dalam rentang `[0, programSlides.length - 1]`).
5. THE `Projection_Store` SHALL memastikan tidak ada infinite loop dalam kalkulasi navigasi — setiap panggilan `nextSlide` atau `prevSlide` menghasilkan perubahan state yang finite dan terminates.
6. WHEN `hotSwapSlides` dipanggil saat `Smart_Mode` aktif, THE `Projection_Store` SHALL menghitung ulang `Navigation_Flow` sebelum memperbarui `programSlide`, untuk mencegah desync antara flow dan slide aktual.
7. THE `Navigation_Flow_Engine` SHALL menghasilkan hasil yang identik untuk input yang sama, tanpa memandang urutan pemanggilan sebelumnya (stateless pure function).
8. THE `Projection_Store` SHALL mempertahankan semua invariant yang sudah ada (`programLockState`, `pendingChanges`, IPC broadcast) saat Smart Navigation aktif.

---

### Requirement 9: Kompatibilitas dengan Navigasi Manual

**User Story:** Sebagai operator worship, saya ingin tetap dapat melakukan navigasi manual (klik langsung ke slide tertentu atau section tertentu) meskipun Smart Navigation aktif, sehingga saya memiliki kontrol penuh saat dibutuhkan.

#### Acceptance Criteria

1. WHEN operator menggunakan `goToLiveSlide(index)` saat `Smart_Mode` aktif, THE `Projection_Store` SHALL berpindah ke slide yang ditentukan dan menghitung ulang `Flow_Position` berdasarkan posisi baru tersebut.
2. WHEN operator menggunakan `goToLiveSection(section)` saat `Smart_Mode` aktif, THE `Projection_Store` SHALL berpindah ke slide pertama dari section yang ditentukan dan memperbarui `Flow_Position`.
3. WHEN operator menggunakan `goToLiveAddress(address)` saat `Smart_Mode` aktif, THE `Projection_Store` SHALL menyelesaikan address dan memperbarui `Flow_Position` sesuai.
4. AFTER navigasi manual, THE `Projection_Store` SHALL melanjutkan Smart Navigation dari posisi baru — Next/Previous berikutnya akan mengikuti aturan Smart Navigation dari posisi tersebut.
5. THE `Projection_Store` SHALL memastikan bahwa navigasi manual tidak merusak `Navigation_Flow` yang sudah dihitung — hanya `Flow_Position` yang berubah, bukan `Navigation_Flow` itu sendiri.

---

### Requirement 10: Parser Lirik dan Round-Trip Integrity

**User Story:** Sebagai developer, saya ingin memastikan bahwa parsing section label dari lirik lagu menghasilkan data yang konsisten dan dapat diverifikasi, sehingga Navigation Flow Engine selalu mendapat input yang benar.

#### Acceptance Criteria

1. THE `slideEngine` SHALL menghasilkan `sectionLabel` yang non-empty untuk setiap slide yang berasal dari section yang memiliki marker `[SECTION_NAME]` dalam `lyrics_raw`.
2. WHEN `lyrics_raw` mengandung marker `[CHORUS]`, THE `slideEngine` SHALL menghasilkan `sectionLabel` bernilai `CHORUS` untuk semua slide dalam section tersebut.
3. WHEN `lyrics_raw` mengandung marker `[VERSE 1]`, THE `slideEngine` SHALL menghasilkan `sectionLabel` bernilai `VERSE 1` untuk semua slide dalam section tersebut.
4. FOR ALL valid `lyrics_raw` yang mengandung section markers, parsing `lyrics_raw` menjadi `SlideData[]` kemudian mengekstrak kembali section labels SHALL menghasilkan set section labels yang ekuivalen dengan section markers dalam `lyrics_raw` (round-trip property).
5. WHEN `lyrics_raw` tidak mengandung section markers, THE `slideEngine` SHALL menghasilkan `sectionLabel` bernilai string kosong untuk semua slide, dan `Navigation_Flow_Engine` SHALL mengaktifkan `Linear_Mode`.
6. THE `Navigation_Flow_Engine` SHALL menerima `Slide_Sequence` dengan `sectionLabel` kosong sebagai input yang valid dan menghasilkan `Linear_Mode` flow tanpa error.
