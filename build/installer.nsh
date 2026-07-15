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
!include "WordFunc.nsh"
!insertmacro VersionCompare
!define SION_UNINSTALL_REGISTRY_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\53d10980-7c5d-53c4-b8b8-e77124218cfc"

!ifndef BUILD_UNINSTALLER
Var InstallerMode
Var ExistingVersion
Var ExistingInstallLocation
Var SmartScreenDialog
Var SmartScreenHeaderLabel
Var SmartScreenTextBox

Function DetectExistingInstallation
  ; Check both 32-bit and 64-bit registry views on 64-bit Windows.
  SetRegView 64
  StrCpy $InstallerMode "install"
  StrCpy $ExistingVersion ""
  StrCpy $ExistingInstallLocation ""

  ; Per-user mode: check HKCU first (primary), then HKLM as fallback
  ; to allow upgrading from old per-machine installations.
  ReadRegStr $ExistingVersion HKCU \
    "${SION_UNINSTALL_REGISTRY_KEY}" \
    "DisplayVersion"
  ReadRegStr $ExistingInstallLocation HKCU \
    "${SION_UNINSTALL_REGISTRY_KEY}" \
    "InstallLocation"
  ${If} $ExistingVersion == ""
    ; Fallback: check HKLM for legacy per-machine installations
    ReadRegStr $ExistingVersion HKLM \
      "${SION_UNINSTALL_REGISTRY_KEY}" \
      "DisplayVersion"
    ReadRegStr $ExistingInstallLocation HKLM \
      "${SION_UNINSTALL_REGISTRY_KEY}" \
      "InstallLocation"
  ${EndIf}

  ${If} $ExistingVersion != ""
    ${VersionCompare} $ExistingVersion "${VERSION}" $0
    ${If} $0 == 0
      StrCpy $InstallerMode "repair"
    ${ElseIf} $0 == 1
      MessageBox MB_ICONSTOP|MB_OK \
        "SION Media $ExistingVersion tidak dapat ditimpa oleh ${VERSION} karena versi yang lebih baru sudah terpasang."
      Quit
    ${Else}
      StrCpy $InstallerMode "update"
    ${EndIf}

    ${If} $ExistingInstallLocation != ""
      StrCpy $INSTDIR $ExistingInstallLocation
    ${EndIf}
  ${EndIf}
FunctionEnd

!macro customInit
  Call DetectExistingInstallation
!macroend

; ─── Custom Page Function ─────────────────────────────────────
Function SmartScreenGuidancePage

  ${If} $InstallerMode == "update"
    GetDlgItem $0 $HWNDPARENT 1
    SendMessage $0 ${WM_SETTEXT} 0 "STR:Perbarui"
    SendMessage $HWNDPARENT ${WM_SETTEXT} 0 "STR:Pembaruan SION Media"
  ${ElseIf} $InstallerMode == "repair"
    GetDlgItem $0 $HWNDPARENT 1
    SendMessage $0 ${WM_SETTEXT} 0 "STR:Perbaiki"
    SendMessage $HWNDPARENT ${WM_SETTEXT} 0 "STR:Perbaikan SION Media"
  ${EndIf}

  ; Create the page
  nsDialogs::Create 1018
  Pop $SmartScreenDialog

  ${If} $SmartScreenDialog == error
    Abort
  ${EndIf}

  ; Existing installations get a real confirmation page. The short native
  ; action label fits the fixed NSIS button while the page carries context.
  ${If} $InstallerMode == "update"
    ${NSD_CreateLabel} 0 4u 100% 24u "SION Media Siap Diperbarui"
    Pop $SmartScreenHeaderLabel
    CreateFont $0 "Segoe UI" 12 700
    SendMessage $SmartScreenHeaderLabel ${WM_SETFONT} $0 1
    ${NSD_CreateLabel} 0 40u 100% 82u \
      "Versi $ExistingVersion akan diperbarui ke ${VERSION}.$\r$\n$\r$\nData pengguna tetap dipertahankan: lagu pribadi, playlist, pengaturan, catatan Alkitab, highlight, dan media.$\r$\n$\r$\nKlik Perbarui untuk melanjutkan."
    Pop $1
    nsDialogs::Show
    Return
  ${ElseIf} $InstallerMode == "repair"
    ${NSD_CreateLabel} 0 4u 100% 24u "SION Media Siap Diperbaiki"
    Pop $SmartScreenHeaderLabel
    CreateFont $0 "Segoe UI" 12 700
    SendMessage $SmartScreenHeaderLabel ${WM_SETFONT} $0 1
    ${NSD_CreateLabel} 0 40u 100% 82u \
      "Setup akan memperbaiki file aplikasi SION Media ${VERSION}.$\r$\n$\r$\nData pengguna tetap dipertahankan: lagu pribadi, playlist, pengaturan, catatan Alkitab, highlight, dan media.$\r$\n$\r$\nKlik Perbaiki untuk melanjutkan."
    Pop $1
    nsDialogs::Show
    Return
  ${EndIf}

  ; ── Header Label ──
  ${NSD_CreateLabel} 0 0 100% 24u \
    "Informasi Keamanan Windows (SmartScreen)"
  Pop $SmartScreenHeaderLabel
  CreateFont $0 "Segoe UI" 11 700
  SendMessage $SmartScreenHeaderLabel ${WM_SETFONT} $0 1

  ; ── Scrollable Read-Only Text Area ──
  ; Uses a multi-line edit control with ES_READONLY and WS_VSCROLL
  nsDialogs::CreateControl "RichEdit20A" \
    ${WS_VISIBLE}|${WS_CHILD}|${WS_VSCROLL}|${WS_TABSTOP}|${ES_MULTILINE}|${ES_READONLY}|${ES_WANTRETURN} \
    ${WS_EX_STATICEDGE} \
    0 28u 100% 142u ""
  Pop $SmartScreenTextBox
  CreateFont $1 "Segoe UI" 9 400
  SendMessage $SmartScreenTextBox ${WM_SETFONT} $1 1

  ; Set the full text content
  ${NSD_SetText} $SmartScreenTextBox \
    "SION Media sedang dalam tahap Beta dan belum memiliki sertifikat tanda tangan digital (code signing certificate) dari otoritas sertifikat terpercaya. Windows SmartScreen akan menampilkan peringatan $\"Windows protected your PC$\" untuk aplikasi yang belum dikenal oleh sistem reputasi Microsoft.$\r$\n$\r$\nINI BUKAN VIRUS — ini adalah perilaku normal Windows untuk aplikasi baru.$\r$\n$\r$\nLangkah aman untuk melanjutkan:$\r$\n$\r$\n  1. Klik $\"More info$\" pada dialog Windows SmartScreen.$\r$\n  2. Klik $\"Run anyway$\".$\r$\n  3. Ikuti langkah instalasi sampai selesai.$\r$\n$\r$\nVerifikasi keaslian:$\r$\n  Penerbit: AiWerek Tech$\r$\n  App ID: com.aiwerek.sion-media$\r$\n  Website: https://aiwerek-tech.github.io/sion-media-web$\r$\n  Kode sumber: https://github.com/AiWerek-Tech/SION-Media"

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

; Persist the resolved directory for deterministic upgrades from this release onward.
; SHELL_CONTEXT is set by electron-builder's multiUser logic to match the current
; install mode (HKCU for per-user, HKLM for per-machine).
!macro customInstall
  WriteRegStr SHELL_CONTEXT "${SION_UNINSTALL_REGISTRY_KEY}" "InstallLocation" "$INSTDIR"
!macroend
!endif
