# SION Media Documentation Roadmap V1 (Consolidated)

Dokumen ini menggabungkan semua rencana awal dan pondasi dasar SION Media V1.

## Major Plans Included:

- UI/UX Implementation Plan
- Core Flow Architecture
- Initial Database Schema

---

_Note: This file is a consolidated version of previous planning documents for V1._

## 2026-05-07 Maintenance Update

V1 roadmap tetap menjadi fondasi, tetapi implementasi terbaru menambahkan stabilitas live workflow yang wajib dipertahankan:

- Program output dipisahkan dari cue/preview melalui `programSlide`.
- Stage Display harus aktif dan menerima state snapshot.
- Backup SQLite harus checkpoint WAL sebelum copy.
- Title Bar harus memakai custom CSS lengkap agar tidak kembali ke tampilan raw/unstyled.
