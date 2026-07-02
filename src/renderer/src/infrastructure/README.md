# Infrastructure Layer

> **Dokumentasi lengkap:** `.docs/11-source-architecture/infrastructure/infrastructure-layer.md`

**Status:** ✅ Active — Electron IPC, SQLite (WAL+FTS5), Excel import, Firebase (stub), update checker, cache.

**Prinsip:** Infrastructure tidak boleh import dari `@features/*`. Hanya features yang import dari infrastructure.
