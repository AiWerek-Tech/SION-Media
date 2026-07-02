# Core: Runtime Contracts

> **Dokumentasi lengkap:** `.docs/11-source-architecture/core/runtime-contracts.md`

**Status:** ✅ Active — Typed events/commands, correlation IDs, audit trail.

Prinsip: Transport-agnostic, replay-safe, immutable after emission. Semua events harus menggunakan `RuntimeEventType` discriminator.
