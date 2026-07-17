# Changelog (Working)

## 2026-05-23 — Documentation Overhaul

- Perombakan besar-besaran seluruh dokumentasi `.dev-docs/`
- Semua file berserakan di root `.dev-docs/` dipindahkan ke folder yang benar
- Status semua planning docs diperbarui (✅ IMPLEMENTED / ❌ belum)
- `10-enterprise-refactor-system/INDEX.md` diperbarui: semua 12 phase SELESAI
- `00-index/README.md` diperbarui dengan status implementasi terkini
- `STATUS.md` baru dibuat sebagai quick-reference
- `01-architecture/10-feature-gap-analysis.md` diperbarui: Bible & Announcement sudah ✅
- Duplikat nomor file di `04-implementation/` diperbaiki

## 2026-05-17 — Recovery contract hardening

- Explicitly hardened preload IPC contract for recovery and emergency projection handlers.
- Added production-aligned mocks for `app.notifyShellReady`, `app.isSafeMode`, `projection.emergencyUpdate`, and `projection.onEmergencyUpdate`.
- Verified contract and typings with `npm run typecheck:web`.
- Lihat: `2026-05-17-boot-recovery-contract-hardening.md`

## 2026-05-16 — Build & Modal polish

- Fixed several TypeScript error sources and hardened verification error handling.
- Reworked Crash Recovery modal to match the common modal pattern used across the app.
- Minor projection/integration fixes and instrumentation adjustments.
- Lihat: `2026-05-16-build-modal-polish.md`

## 2026-05-15~16 — Enterprise Refactor Phase 0-11 SELESAI

- Semua 12 phase enterprise refactor selesai diimplementasikan
- Dead UI fixes, modal system, projection hardening, design system, library/projection/management improvements, store decomposition
- Lihat: `../10-enterprise-refactor-system/10-implementation/`
