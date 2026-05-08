# SION Media Implementation History V1

Dokumen ini mencatat riwayat implementasi, tugas yang diselesaikan, dan panduan teknis selama pengembangan V1.

---

_Note: This file contains the consolidated history of walkthroughs and tasks for version 1._

## Maintenance Backport Note — 2026-05-07

Meskipun V1 adalah fase awal, beberapa prinsip dari audit terbaru harus dianggap sebagai baseline permanen:

- Jangan mengirim slide ke output hanya karena lagu dipilih.
- Pastikan custom title bar selalu memiliki CSS lengkap.
- Pertahankan shortcut keyboard live operation (`Space`, `Arrow`, `B`, `F`, `Esc`) tanpa mengganggu input teks.
- Backup database lokal harus mempertimbangkan WAL SQLite.
