# Release System Documents

This directory contains release artifacts, release notes, and deployment records.

## Purpose

Documents here are created during the release preparation phase (Phase 11) and updated with each release.

## Document Naming Convention

```
release-notes-v[version].md       — release notes
release-checklist-v[version].md   — production readiness checklist results
deployment-record-v[version].md   — deployment record
hotfix-[date]-[description].md    — emergency hotfix records
```

## Release Channels

| Channel  | Audience                 | Trigger              | Current Version |
| -------- | ------------------------ | -------------------- | --------------- |
| Internal | Developers               | Every develop commit | 1.0.0           |
| Alpha    | Trusted operators (5-10) | After Milestone 2    | Not yet         |
| Beta     | Wider operators (20-50)  | After Milestone 4    | Not yet         |
| Stable   | All users                | After Milestone 6    | 1.0.0           |
| Hotfix   | All users                | Critical bugs        | As needed       |

## Release Milestones

| Milestone                            | Target Version | Phases Required | Status |
| ------------------------------------ | -------------- | --------------- | ------ |
| Milestone 1: Infrastructure          | v1.1.0-alpha   | Phase 0-1       | ⬜     |
| Milestone 2: Dead UI Eliminated      | v1.1.0-alpha   | Phase 0-3       | ⬜     |
| Milestone 3: Runtime Hardened        | v1.1.0-beta    | Phase 0-4       | ⬜     |
| Milestone 4: UI Modernized           | v1.2.0-beta    | Phase 0-8       | ⬜     |
| Milestone 5: Architecture Normalized | v1.3.0-beta    | Phase 0-9       | ⬜     |
| Milestone 6: Production Ready        | v1.3.0         | Phase 0-11      | ⬜     |

## Production Readiness Checklist

Before any stable release, all items in the production readiness checklist (in `04-production-system/01-production-architecture.md`) must be checked. Record results here.

## Version History

| Version | Date       | Type   | Key Changes     |
| ------- | ---------- | ------ | --------------- |
| 1.0.0   | 2026-05-14 | Stable | Initial release |
