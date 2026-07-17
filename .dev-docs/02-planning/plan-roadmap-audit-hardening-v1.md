# Plan Roadmap Audit & Hardening v1

> **Status:** Aktif — Sprint 1 sedang berjalan  
> **Terakhir diperbarui:** 2026-05-23

## Ringkasan

Dokumen ini adalah roadmap eksekusi pasca audit menyeluruh kode SION Media. Fokus utama adalah:

1. Menutup risiko keamanan dan stabilitas yang berdampak tinggi.
2. Menurunkan technical debt pada modul scraper dan boundary IPC.
3. Menyiapkan fondasi fitur operasional untuk skala penggunaan ibadah live.

## Tujuan Utama (90 Hari)

- Mencapai baseline keamanan Electron yang lebih ketat.
- Menstabilkan pipeline scraper end-to-end tanpa deadlock task.
- Menaikkan kualitas kode ke standar release (`lint` zero error).
- Memperkuat type contract antar process (main, preload, renderer).
- Menambah fitur operasional untuk reliability dan observability.

## Prioritas Eksekusi

### P0 - Critical Hardening (Wajib Selesai Dulu)

- Aktifkan hardening `webPreferences` untuk semua window:
  - validasi `contextIsolation`, `nodeIntegration`, `sandbox`.
- Tutup celah update SQL dinamis dengan field whitelist pada operasi update object.
- Perbaiki lifecycle `ScraperTaskManager` agar task tidak terkunci setelah selesai.
- Perbaiki timeout helper scraper agar tidak menimbulkan timer leak.
- Tambahkan validasi payload IPC untuk channel sensitif (`file:*`, `db:*`, `scraper:*`).

### P1 - Stabilization & Quality

- Bersihkan seluruh error lint pada modul scraper management.
- Kurangi warning lint prioritas tinggi (React hooks, explicit-any).
- Refactor `App.tsx` menjadi beberapa hook/service terpisah untuk init dan shortcut orchestration.
- Kuatkan type DTO di preload API (kurangi `unknown` untuk jalur data utama).
- Tambah regression tests untuk alur:
  - JSON import (dry-run + commit)
  - scraper dry-run/import
  - backup/restore
  - crash recovery

### P2 - Operational Excellence & Feature Growth

- Tambahkan role-based safety mode (Operator vs Admin) untuk aksi destruktif.
- Tambahkan auto-backup scheduler + retention policy + health check restore.
- Tambahkan observability dashboard runtime (IPC latency, failure rate, event loop lag).
- Kembangkan provider plugin architecture untuk scraper ekstensi jangka panjang.
- Tambahkan import impact preview (diff per hymnal + confidence summary).

## Rencana Sprint (6 Sprint, 2 Minggu per Sprint)

## Sprint 1 (Minggu 1-2): Security Baseline

**Target**

- Risiko kritikal keamanan ditutup tanpa regresi fitur utama.

**Deliverables**

- Hardening window preferences untuk main/projection/stage window.
- Whitelist update field untuk query update dinamis.
- Validator payload IPC untuk endpoint sensitif.
- Dokumen keputusan keamanan (trade-off dan fallback compatibility).

**Definition of Done**

- Tidak ada temuan kritikal terbuka di area security baseline.
- Smoke test mode PROJECTION/LIBRARY/MANAGEMENT/BROADCAST lulus.

## Sprint 2 (Minggu 3-4): Scraper Reliability

**Target**

- Pipeline scraper stabil untuk penggunaan produksi.

**Deliverables**

- Fix task lifecycle manager (active task reset + status transition jelas).
- Fix timeout cleanup pada worker fetch.
- Pengetesan retry/backoff/abort/retryFailed.
- Audit logging scraper konsisten per item.

**Definition of Done**

- Tidak ada stuck task pada skenario start -> complete -> start ulang.
- Dry-run/import konsisten pada >100 item skenario simulasi.

## Sprint 3 (Minggu 5-6): Code Quality Gate

**Target**

- Mencapai quality gate siap release.

**Deliverables**

- `eslint` zero error untuk seluruh workspace.
- Pengurangan warning scraper UI secara signifikan.
- Perbaikan pola React effect yang memicu cascading render.
- Penyelarasan formatter agar diff bersih.

**Definition of Done**

- `npm run lint` tanpa error.
- `npm run typecheck` lulus.

## Sprint 4 (Minggu 7-8): Type Contract & Refactor

**Target**

- Boundary antar process lebih aman dan mudah dipelihara.

**Deliverables**

- Introduksi DTO typed untuk domain utama (songs, playlists, scraper, health).
- Penggantian `unknown` pada jalur kritis menjadi type eksplisit.
- Refactor `App.tsx` menjadi hook modular:
  - `useAppBootstrap`
  - `useGlobalShortcuts`
  - `useCrashRecovery`

**Definition of Done**

- Contract API preload terdokumentasi dan tervalidasi.
- Regression manual test pada screen utama lulus.

## Sprint 5 (Minggu 9-10): Reliability Features

**Target**

- Operasional lebih aman untuk tim ibadah/live operator.

**Deliverables**

- Role-based safety mode (Operator/Admin).
- Backup scheduler + retention + notifikasi kegagalan backup.
- Guard konfirmasi untuk aksi destruktif (`reseed`, restore overwrite, mass overwrite).

**Definition of Done**

- Seluruh aksi destruktif terlindungi guard policy.
- Backup otomatis tervalidasi di skenario restart aplikasi.

## Sprint 6 (Minggu 11-12): Observability & Extensibility

**Target**

- Platform siap tumbuh dan mudah diobservasi.

**Deliverables**

- Runtime observability panel (latency, error ratio, dropped command, heartbeat quality).
- Import impact preview sebelum commit final.
- Baseline plugin contract untuk provider scraper.

**Definition of Done**

- Dashboard observability menampilkan metrik inti real-time.
- Uji coba minimal 1 provider baru via contract plugin.

## KPI Keberhasilan

- Quality:
  - `lint`: 0 error.
  - `typecheck`: 100% pass.
- Stability:
  - crash-free sessions >= 99.5%.
  - scraper task stuck rate <= 0.5%.
- Security:
  - 0 temuan kritikal terbuka setelah Sprint 2.
- Performance:
  - p95 IPC round-trip latency <= 60ms.
  - p95 command execution latency <= 80ms.
- Operasional:
  - backup success rate >= 99%.
  - restore drill success >= 95%.

## Risiko & Mitigasi

- Risiko kompatibilitas saat hardening Electron.
  - Mitigasi: rollout bertahap + feature flag + fallback sementara.
- Risiko regressi dari refactor besar `App.tsx`.
  - Mitigasi: pecah bertahap per hook + smoke test tiap PR.
- Risiko scope creep fitur baru.
  - Mitigasi: kunci scope tiap sprint dan evaluasi di sprint review.

## Strategi Delivery

- Gunakan branch strategy berbasis milestone:
  - `milestone/p0-hardening`
  - `milestone/p1-stabilization`
  - `milestone/p2-operational`
- Setiap milestone dipecah menjadi PR kecil (maks 400-600 LOC perubahan efektif).
- Wajib sertakan:
  - test plan
  - rollback plan
  - update dokumentasi implementasi di `04-implementation/`.

## Exit Criteria Roadmap v1

Roadmap ini dianggap selesai bila:

- P0 dan P1 selesai 100%.
- P2 minimal 60% selesai (fitur observability dan backup policy wajib masuk).
- Kualitas baseline release tercapai (lint/typecheck/build pass stabil).

---

Terakhir diperbarui: 2026-05-11
