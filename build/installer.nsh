; ═══════════════════════════════════════════════════════════════
; SION Media — NSIS Installer Customization
; Bahasa Indonesia UI strings + SmartScreen guidance page
; ═══════════════════════════════════════════════════════════════

; ─── MUI Welcome Page ─────────────────────────────────────────
!define MUI_ABORTWARNING
!define MUI_WELCOMEPAGE_TITLE_3LINES
!define MUI_WELCOMEPAGE_TITLE "Selamat Datang di Setup SION Media"
!define MUI_WELCOMEPAGE_TEXT "Wizard ini akan memasang SION Media pada komputer Anda.$\r$\n$\r$\nSION Media menyatukan lagu, Alkitab, media, dan layar jemaat dalam satu ruang kerja presentasi ibadah.$\r$\n$\r$\nTutup aplikasi lain sebelum melanjutkan agar proses instalasi berjalan lancar."

; ─── MUI Directory Page ───────────────────────────────────────
!define MUI_DIRECTORYPAGE_TEXT_TOP "Pilih folder tempat SION Media akan dipasang. Setup akan membuat folder aplikasi secara otomatis."
!define MUI_DIRECTORYPAGE_TITLE "Pilih Lokasi Instalasi"
!define MUI_DIRECTORYPAGE_SUBTITLE "Tentukan folder untuk memasang SION Media."

; ─── MUI Finish Page ──────────────────────────────────────────
!define MUI_FINISHPAGE_TITLE_3LINES
!define MUI_FINISHPAGE_TITLE "SION Media Siap Digunakan"
!define MUI_FINISHPAGE_TEXT "Instalasi SION Media telah selesai.$\r$\n$\r$\nHubungkan layar proyektor, buka aplikasi, lalu ikuti pengaturan awal untuk menyiapkan ruang kerja ibadah Anda."
!define MUI_FINISHPAGE_RUN_TEXT "Jalankan SION Media"

; ─── MUI Uninstaller Pages ────────────────────────────────────
!define MUI_UNWELCOMEPAGE_TITLE_3LINES
!define MUI_UNWELCOMEPAGE_TITLE "Hapus SION Media"
!define MUI_UNWELCOMEPAGE_TEXT "Wizard ini akan menghapus aplikasi SION Media dari komputer.$\r$\n$\r$\nData dan pengaturan pengguna tetap dipertahankan agar dapat digunakan kembali saat instalasi berikutnya."
!define MUI_UNFINISHPAGE_TITLE "SION Media Telah Dihapus"

; ═══════════════════════════════════════════════════════════════
; SmartScreen Guidance — Custom Installer Page
;
; Menampilkan halaman informatif di awal instalasi yang menjelaskan
; kepada pengguna tentang peringatan Windows SmartScreen dan
; memberikan panduan untuk melanjutkan instalasi dengan aman.
; ═══════════════════════════════════════════════════════════════

!include "nsDialogs.nsh"
!include "WinMessages.nsh"

!ifndef BUILD_UNINSTALLER
Var SmartScreenDialog
Var SmartScreenHeaderLabel
Var SmartScreenBodyLabel
Var SmartScreenStepsLabel
Var SmartScreenFooterLabel

; ─── Custom Page Function ─────────────────────────────────────
Function SmartScreenGuidancePage

  ; Create the page
  nsDialogs::Create 1018
  Pop $SmartScreenDialog

  ${If} $SmartScreenDialog == error
    Abort
  ${EndIf}

  ; ── Header Label ──
  ${NSD_CreateLabel} 0 0 100% 36u \
    "⛨  Informasi Keamanan Windows (SmartScreen)"
  Pop $SmartScreenHeaderLabel
  CreateFont $0 "Segoe UI" 11 700
  SendMessage $SmartScreenHeaderLabel ${WM_SETFONT} $0 1

  ; ── Explanation Body ──
  ${NSD_CreateLabel} 0 42u 100% 60u \
    "SION Media sedang dalam tahap Beta dan belum memiliki sertifikat tanda tangan digital (code signing certificate) dari otoritas sertifikat terpercaya. Windows SmartScreen akan menampilkan peringatan $\"Windows protected your PC$\" untuk aplikasi yang belum dikenal oleh sistem reputasi Microsoft.$\r$\n$\r$\nINI BUKAN VIRUS — ini adalah perilaku normal Windows untuk aplikasi baru."
  Pop $SmartScreenBodyLabel
  CreateFont $1 "Segoe UI" 9 400
  SendMessage $SmartScreenBodyLabel ${WM_SETFONT} $1 1

  ; ── Step-by-step bypass instructions ──
  ${NSD_CreateLabel} 0 108u 100% 48u \
    "Langkah-langkah untuk menginstal SION Media dengan aman:$\r$\n  1. Klik tombol 'More info' pada dialog Windows SmartScreen yang muncul.$\r$\n  2. Klik tombol 'Run anyway' yang akan muncul di bawahnya.$\r$\n  3. SION Media akan langsung terinstal secara normal."
  Pop $SmartScreenStepsLabel
  CreateFont $2 "Segoe UI" 9 700
  SendMessage $SmartScreenStepsLabel ${WM_SETFONT} $2 1

  ; ── Footer text ──
  ${NSD_CreateLabel} 0 162u 100% 24u \
    "Untuk verifikasi kode sumber dan laporan keamanan, silakan kunjungi:$\r$\nhttps://github.com/AiWerek-Tech/SION-Media"
  Pop $SmartScreenFooterLabel
  CreateFont $3 "Segoe UI" 8 400
  SendMessage $SmartScreenFooterLabel ${WM_SETFONT} $3 1

  ; Show the dialog
  nsDialogs::Show

FunctionEnd

; ─── Custom Page Leave Function ────────────────────────────────
Function SmartScreenGuidancePageLeave
  ; No validation needed, user just clicks Next
FunctionEnd

; ═══════════════════════════════════════════════════════════════
; Page Insertion Macro
;
; electron-builder invokes this macro to insert custom pages.
; We hook into customInstall to add our SmartScreen page
; BEFORE the standard installation begins.
; ═══════════════════════════════════════════════════════════════

!macro customPageAfterChangeDir
  Page custom SmartScreenGuidancePage SmartScreenGuidancePageLeave
!macroend
!endif
