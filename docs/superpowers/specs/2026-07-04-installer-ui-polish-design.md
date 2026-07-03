# Installer UI Polish Design

## Goal

Prevent clipped controls and corrupted decorative characters in the native Windows installer.

## Behavior

- First installation shows the SmartScreen information page.
- Update and repair flows skip SmartScreen guidance because the application has already been installed.
- Native action buttons use the short labels `Perbarui` and `Perbaiki` so they fit the fixed NSIS button width.
- Window titles retain the complete context: `Pembaruan SION Media` and `Perbaikan SION Media`.
- SmartScreen copy uses plain Windows-safe text without Unicode line decorations.
- The existing scrolling text control remains available for first-install guidance.

## Verification

- Contract tests assert that update and repair skip the SmartScreen page.
- Contract tests reject long native action-button labels and Unicode separators.
- A real NSIS installer build must complete successfully.
