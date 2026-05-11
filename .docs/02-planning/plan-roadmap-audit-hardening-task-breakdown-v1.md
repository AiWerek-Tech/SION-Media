# Task Breakdown Roadmap Audit & Hardening v1

## Tujuan Dokumen

Dokumen ini memecah roadmap audit-hardening menjadi checklist task granular per modul agar mudah diubah menjadi tiket sprint.

Referensi utama:
- `02-planning/plan-roadmap-audit-hardening-v1.md`

## Status Legend

- `[ ]` Belum dikerjakan
- `[~]` Sedang berjalan
- `[x]` Selesai
- `[!]` Blocked / perlu keputusan

## Milestone P0 - Critical Hardening

### Modul `src/main/windows.ts` (Electron Security)

- [x] Audit final konfigurasi `webPreferences` untuk semua window (main/projection/stage).
- [x] Pastikan `contextIsolation` aktif dan `nodeIntegration` nonaktif secara eksplisit.
- [~] Evaluasi aktivasi `sandbox: true` + compatibility test preload bridge.
- [x] Tambahkan catatan fallback behavior jika ada fitur terdampak saat sandbox diaktifkan.
- [~] Tambahkan smoke test manual mode: `LIBRARY`, `MANAGEMENT`, `PROJECTION`, `BROADCAST`.

### Modul `src/main/ipc-handlers.ts` (IPC Validation)

- [~] Buat schema validator payload untuk channel sensitif:
  - [x] `file:parse-excel`
  - [x] `file:write-json`
  - [x] `db:reseed`
  - [x] `db:restore-backup`
  - [x] `scraper:start`
  - [x] `scraper:import`
- [x] Terapkan sanitasi path policy untuk operasi file write.
- [x] Tambahkan error mapping terstandar agar renderer menerima pesan yang aman dan konsisten.
- [x] Tambahkan log audit untuk channel destruktif.

### Modul `src/main/database.ts` (SQL Safety)

- [x] Amankan update SQL dinamis dengan whitelist field:
  - [x] `updateCustomSlide`
  - [x] `updateSlideGroup`
- [x] Tambahkan guard jika payload update kosong.
- [ ] Tambahkan unit test untuk memastikan field ilegal ditolak.
- [x] Tambahkan unit test untuk memastikan field ilegal ditolak.
- [x] Review ulang operasi yang berpotensi destruktif pada legacy schema wipe.

### Modul `src/main/scraper/task/ScraperTaskManager.ts` (Task Lifecycle)

- [x] Perbaiki state transition task agar `activeTask` reset saat task selesai/aborted/error.
- [x] Pastikan `start()` hanya menolak task saat benar-benar ada task aktif `RUNNING`.
- [x] Pastikan `retryFailed()` tidak menimpa state task valid secara tidak sengaja.
- [x] Tambahkan test skenario:
  - [x] start -> complete -> start ulang
  - [x] start -> abort -> start ulang
  - [x] start -> retryFailed

### Modul `src/main/scraper/task/ScraperTask.ts` (Timeout & Resource)

- [x] Refactor `fetchWithTimeout` agar timer selalu dibersihkan.
- [x] Pastikan tidak ada timer leak pada beban batch besar.
- [ ] Tambahkan metrik internal sederhana untuk timeout count per task.
- [ ] Tambahkan test untuk timeout path dan cancel path.

## Milestone P1 - Stabilization & Quality

### Modul `src/renderer/src/components/scraper/*` (Lint & UI Stability)

- [x] Hilangkan semua lint error di area scraper management.
- [x] Perbaiki `setState` di effect yang memicu cascading render.
- [x] Hapus penggunaan `any` dan ganti dengan type eksplisit.
- [x] Rapikan warning format agar diff bersih dan review-friendly.
- [ ] Validasi ulang behavior panel:
  - [ ] conflict resolution
  - [ ] progress panel
  - [ ] activity stream
  - [ ] preview inspector

### Modul `src/renderer/src/App.tsx` (Refactor Orchestration)

- [x] Ekstrak bootstrap logic ke `useAppBootstrap`.
- [x] Ekstrak shortcut orchestration ke `useGlobalShortcuts`.
- [x] Ekstrak recovery flow ke `useCrashRecovery`.
- [x] Kurangi side effect campuran dalam satu `useEffect` besar.
- [~] Pastikan tidak ada regresi navigation screen/mode.

### Modul `src/preload/index.ts` & `src/preload/index.d.ts` (Type Contract)

- [~] Definisikan DTO utama:
  - [x] songs
  - [x] playlists
  - [x] scraper progress/result
  - [x] health endpoints
- [x] Kurangi `unknown` pada jalur data utama.
- [x] Sinkronkan declaration file dengan implementasi preload.
- [ ] Tambahkan catatan breaking changes untuk renderer API jika ada.

### Testing & CI Quality Gate

- [ ] Jalankan baseline quality:
  - [x] `npm run lint`
  - [x] `npm run typecheck`
  - [x] `npm run build`
- [x] Tambahkan regression test minimal untuk:
  - [x] scraper dry-run/import (lifecycle manager coverage via unit tests)
- [ ] Tambahkan regression test minimal untuk:
  - [ ] import JSON (dry-run + commit)
  - [ ] scraper dry-run/import
  - [ ] backup/restore
  - [ ] crash recovery

## Milestone P2 - Operational Excellence & Feature Growth

### Security UX & Role Guard

- [ ] Definisikan role `Operator` vs `Admin`.
- [ ] Lindungi endpoint destruktif dengan policy role.
- [ ] Tambahkan konfirmasi berlapis untuk aksi berisiko tinggi.
- [ ] Tambahkan audit log siapa melakukan aksi destruktif.

### Backup & Recovery Reliability

- [ ] Implementasi auto-backup scheduler.
- [ ] Tambahkan retention policy (mis. 7/30/90 hari).
- [ ] Tambahkan notifikasi gagal backup.
- [ ] Tambahkan restore drill flow untuk validasi integritas backup.

### Observability & Diagnostics

- [ ] Tambahkan metrik runtime:
  - [ ] IPC latency
  - [ ] command failure ratio
  - [ ] dropped command ratio
  - [ ] event loop lag
- [ ] Tambahkan panel ringkas kesehatan sistem untuk operator.
- [ ] Tambahkan export snapshot diagnostik untuk troubleshooting.

### Scraper Extensibility

- [ ] Definisikan contract plugin provider.
- [ ] Pisahkan registry provider agar siap load eksternal.
- [ ] Tambahkan validasi capability provider sebelum eksekusi task.
- [ ] Siapkan 1 provider pilot sebagai bukti arsitektur extensible.

## Breakdown Eksekusi Per Sprint

### Sprint 1
- [ ] Hardening window preferences
- [ ] IPC payload validator baseline
- [ ] SQL whitelist fix

### Sprint 2
- [ ] Scraper task lifecycle fix
- [ ] Timeout cleanup + retry reliability
- [ ] Test skenario high-volume scrape

### Sprint 3
- [ ] Lint error zero
- [ ] Warning reduction prioritas scraper
- [ ] Formatter alignment

### Sprint 4
- [ ] DTO preload contract
- [ ] Refactor `App.tsx` ke hooks modular
- [ ] Regression smoke pass

### Sprint 5
- [ ] Role-based safety mode
- [ ] Backup scheduler + retention
- [ ] Guard aksi destruktif

### Sprint 6
- [ ] Observability dashboard
- [ ] Import impact preview
- [ ] Provider plugin baseline

## Checklist Rilis (Final Gate)

- [ ] P0 selesai 100%
- [ ] P1 selesai 100%
- [ ] P2 minimum 60% (backup + observability wajib)
- [ ] `lint` pass
- [ ] `typecheck` pass
- [ ] `build` pass
- [ ] Dokumentasi implementasi per fitur diperbarui di `04-implementation/`

---

Terakhir diperbarui: 2026-05-11
