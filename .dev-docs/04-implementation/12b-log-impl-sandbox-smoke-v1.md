# Log Implementasi Sandbox Compatibility & Smoke Check v1

Tanggal: 2026-05-11
Status: In Progress

## Tujuan

- Mendokumentasikan posture `sandbox: true` sebagai baseline security.
- Menetapkan fallback behavior resmi saat sandbox memicu inkompatibilitas runtime.
- Menyediakan checklist smoke test mode utama agar verifikasi regresi konsisten.

## Implementasi

- `src/main/windows.ts` memakai `sandbox: isSandboxEnabled` untuk semua window utama:
  - main window
  - projection window
  - stage display window
- Baseline:
  - `isSandboxEnabled = process.env['ELECTRON_DISABLE_SANDBOX'] !== '1'`
  - Artinya default tetap `sandbox: true`.
- Fallback kompatibilitas:
  - Jika ditemukan issue runtime spesifik environment, operator/dev dapat menjalankan dengan:
    - `ELECTRON_DISABLE_SANDBOX=1`
  - Ini bersifat workaround sementara untuk troubleshooting, bukan default operasional.

## Catatan Fallback Behavior

- Gejala yang perlu diobservasi saat sandbox aktif:
  - preload bridge tidak merespons event tertentu
  - IPC bridge gagal untuk action kritikal (show/hide projection, mode switch, save session)
  - anomali pada secondary window (projection/stage) setelah launch
- Tindakan mitigasi:
  1. Jalankan sekali dengan `ELECTRON_DISABLE_SANDBOX=1`.
  2. Bandingkan perilaku.
  3. Jika normal saat sandbox off, catat channel/flow yang terdampak untuk perbaikan preload/IPC.

## Smoke Test Matrix (Manual)

Checklist ini ditujukan untuk eksekusi operator QA di environment aktual.

- [ ] LIBRARY mode:
  - [ ] buka app ke mode default
  - [ ] pilih lagu, pastikan preview/render normal
- [ ] MANAGEMENT mode:
  - [ ] buka management screen
  - [ ] navigasi panel tanpa crash
- [ ] PROJECTION mode:
  - [ ] masuk projection mode
  - [ ] uji next/prev/black/freeze/clear
- [ ] BROADCAST mode:
  - [ ] masuk broadcast mode
  - [ ] validasi shortcut utama dan transisi screen
- [ ] Secondary windows:
  - [ ] show/hide projection window
  - [ ] show/hide stage display

## Verifikasi Otomatis Yang Sudah Jalan

- `npm run lint` pass
- `npm run typecheck` pass
- `npm test` pass

## Next Action

- Eksekusi checklist manual di atas dan lampirkan hasil pass/fail per mode.
- Jika ada regresi spesifik sandbox, buat issue terpisah per channel/flow.
