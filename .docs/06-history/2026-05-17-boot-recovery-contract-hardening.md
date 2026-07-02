# SION Presenter — Recovery Contract Hardening (2026-05-17)

Perbaikan ini fokus pada menjaga integritas boundary recovery antara:

- `main` process safe mode authority
- `preload` IPC bridge
- `renderer` bootstrap dan runtime
- environment test

## Ringkasan Perubahan

1. **Preload bridge contract dibuat eksplisit**
   - `ProjectionAPI.emergencyUpdate` kini wajib.
   - `ProjectionAPI.onEmergencyUpdate` kini wajib.
   - Ini menghilangkan path `undefined` tersembunyi saat `renderer` berinteraksi dengan bridge.

2. **Test environment disesuaikan dengan contract produksi**
   - Menambahkan mock `window.api.app.notifyShellReady`.
   - Menambahkan mock `window.api.app.isSafeMode`.
   - Menambahkan mock `window.api.projection.emergencyUpdate`.
   - Menambahkan mock `window.api.projection.onEmergencyUpdate`.

3. **Validasi compile**
   - Perubahan diverifikasi dengan `npm run typecheck:web`.

## Dampak

- Kontrak preload menjadi typed dan deterministik.
- Perilaku safe mode di test lebih mendekati produksi.
- Recovery loop menjadi lebih konsisten antara `main`, `preload`, dan `renderer`.
- Risiko false-positive pada test akibat bridge mock tidak lengkap berkurang.

## Berkas yang diubah

- `src/preload/index.d.ts`
- `src/renderer/src/test-utils/setup.ts`
