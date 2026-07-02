# Walkthrough - Bible Pack External SQLite Schema Fix

We successfully resolved the runtime database schema mismatch error that was occurring when loading the Bible panel.

## Cause of the Issue

The original `bibleExternalSqliteRepository.ts` implementation assumed columns like `code`, `"order"`, and `chapters` in the `bible_books` table. However, the actual scraper output (`tb_lai_1974.sqlite`) contains columns `book_code`, `book_order`, and `chapters_count`. This led to the `no such column: code` error upon opening the Bible view.

Additionally, the FTS5 search snippet query was using a column index of `0` (which refers to `version_code`) instead of `3` (which refers to the `text` column).

## Actions Taken

1. **Inspected Schema**: Wrote and executed an inspection script using the Electron engine to retrieve the active SQLite database schema details.
2. **Mapped Database Schema in Queries**: Updated [bibleExternalSqliteRepository.ts](file:///d:/my_dev/SION-Media/sion-media-desktop/src/main/services/bible/bibleExternalSqliteRepository.ts) to correctly use:
   - `book_code as code`
   - `book_order as "order"`
   - `chapters_count as chapters`
   - `book_code` for WHERE filters instead of `code`.
3. **Fixed FTS5 Snippet Index**: Updated `searchBibleVerses` to use the correct FTS5 virtual table text column index `3` for terms highlighting.
4. **Verified Build**: Built the application and typecheck successfully with `0` compilation errors.
