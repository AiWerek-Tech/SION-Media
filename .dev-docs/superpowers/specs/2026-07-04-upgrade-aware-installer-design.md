# Upgrade-Aware Installer and Data Preservation Design

## Objective

Make the Windows installer recognize an existing SION Media installation as an update, replace application-owned content with the newest bundled version, and preserve all user-owned data.

## Installer behavior

The NSIS installer uses the existing stable application identity and installation registry entry.

- No existing installation: show the normal install flow.
- Older installed version: show an update flow labeled **Perbarui SION Media**.
- Same installed version: show a repair flow labeled **Perbaiki SION Media**.
- Newer installed version: block accidental downgrade and explain that a newer version is already installed.
- Running application: request a clean shutdown before replacing files.
- Installation path: reuse the existing path during update to prevent parallel installations.

Application files and bundled content packs are replaced by the installer. The installer never deletes the Electron `userData` directory during install, update, repair, or uninstall.

## Data ownership

Data is divided into two ownership classes.

### Application-owned data

Application-owned records originate from SION Media release assets and have stable identifiers. A newer release may insert, correct, or replace these records.

- Bundled Bible SQLite databases and manifests
- Bundled hymnals and songs
- Other future default content packs

### User-owned data

User-owned records are never overwritten by release content.

- User-created or imported songs
- Playlists and playlist ordering
- Settings and application preferences
- Bible notes and highlights
- User media and user-installed content packs

Every mutable seeded record must have explicit provenance such as `system`/`bundled` or `user`. Existing records without provenance are classified conservatively: records that cannot be proven to match a stable bundled identifier are treated as user-owned.

## Update transaction

On the first launch after an application update:

1. Read the last successfully applied application/content version.
2. If migration is required, checkpoint SQLite WAL and close active database connections.
3. Create a timestamped backup of the user database and its relevant sidecar state.
4. Open the database and run schema migrations in a transaction.
5. Upsert application-owned seed records by stable bundled identifier.
6. Leave user-owned rows and their relationships unchanged.
7. Re-register bundled Bible packs using their current installation paths.
8. Validate schema version, foreign keys, required bundled records, and content-pack checksums.
9. Record the successfully applied version only after validation passes.
10. If any step fails, roll back the transaction or restore the backup before allowing normal startup.

Backups use bounded retention so repeated updates do not consume disk space indefinitely. The newest successful pre-update backups are retained.

## Bundled Bible updates

Bible content is installed outside `app.asar` under Electron's resources directory. Each installer replaces the application-owned bundled Bible pack with the release copy. At startup, the registry path and metadata are updated to the new bundled files.

Bible notes and highlights remain in the user database and reference stable semantic keys: Bible version code, book code, chapter, and verse. Replacing a bundled SQLite file therefore does not delete user annotations.

## Seeded songs and hymnals

Bundled hymnals and songs require stable release identifiers independent of local SQLite row IDs. Update logic may change their official title, lyrics, metadata, and ordering. It must not change user-created songs or user edits stored as separate user-owned records.

If the current schema cannot distinguish a modified bundled song from a release-owned song, the migration must preserve the local row and report the conflict instead of silently discarding user work.

## Failure handling

- Insufficient disk space or backup failure aborts migration before writes begin.
- Invalid bundled database or checksum failure keeps the previous working user database.
- Migration failure produces a recovery log and restores the pre-update backup.
- Application startup must not continue with a partially migrated database.
- Repair mode replaces missing or corrupted application files without resetting user data.

## Verification

Automated tests must cover:

- NSIS install, update, repair, and downgrade-detection contracts.
- User-data directory preservation.
- Backup creation before migration writes.
- Bundled-record upsert and correction.
- Preservation of user songs, playlists, settings, Bible notes, and highlights.
- Rollback or restore after forced migration failure.
- Packaged installer contains checksum-valid default Bible data.
- Upgrade from a representative previous-version database.

A packaged Windows build must also be installed over a previous release in a disposable test profile. The verification must confirm one installation entry, the updated application version and bundled content, and unchanged user-owned fixtures.
