import { createHash } from 'node:crypto'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, test } from 'vitest'

const root = process.cwd()
const config = readFileSync(resolve(root, 'electron-builder.yml'), 'utf8')
const packageJson = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')) as {
  scripts: Record<string, string>
}
const nsisIncludePath = resolve(root, 'build/installer.nsh')
const assetGeneratorPath = resolve(root, 'scripts/generate-installer-assets.ps1')
const signingCertGeneratorPath = resolve(root, 'scripts/generate-signing-cert.ps1')
const signBuildPath = resolve(root, 'scripts/sign-build.ps1')

function bmpDimensions(path: string): { width: number; height: number } {
  const data = readFileSync(resolve(root, path))
  expect(data.subarray(0, 2).toString('ascii')).toBe('BM')
  return { width: data.readInt32LE(18), height: Math.abs(data.readInt32LE(22)) }
}

describe('Celestial Native Windows installer', () => {
  test('uses the branded assisted NSIS flow with production-safe behavior', () => {
    expect(config).toContain('oneClick: false')
    expect(config).toContain('allowToChangeInstallationDirectory: true')
    expect(config).toContain('installerSidebar: build/installerSidebar.bmp')
    expect(config).toContain('uninstallerSidebar: build/uninstallerSidebar.bmp')
    expect(config).toContain('installerHeader: build/installerHeader.bmp')
    expect(config).toContain('installerIcon: build/icon.ico')
    expect(config).toContain('icon: build/icon.ico')
    expect(config).toContain('include: build/installer.nsh')
    expect(config).toContain('deleteAppDataOnUninstall: false')
    expect(config).toContain('runAfterFinish: true')
    expect(config).toContain('- id_ID')
    expect(config).toContain("language: '1057'")
  })

  test('provides correctly sized native NSIS bitmap assets', () => {
    expect(bmpDimensions('build/installerSidebar.bmp')).toEqual({ width: 164, height: 314 })
    expect(bmpDimensions('build/uninstallerSidebar.bmp')).toEqual({ width: 164, height: 314 })
    expect(bmpDimensions('build/installerHeader.bmp')).toEqual({ width: 150, height: 57 })
  })

  test('ships Indonesian welcome and completion copy', () => {
    expect(existsSync(nsisIncludePath)).toBe(true)
    const include = readFileSync(nsisIncludePath, 'utf8')
    expect(include).toContain('Selamat Datang di Setup SION Media')
    expect(include).toContain('SION Media Siap Digunakan')
    expect(include).toContain('Jalankan SION Media')
  })

  test('detects install, update, repair, and downgrade modes', () => {
    const include = readFileSync(nsisIncludePath, 'utf8')
    expect(include).toContain('Function DetectExistingInstallation')
    expect(include).toContain('SetRegView 64')
    expect(include).toContain('DisplayVersion')
    expect(include).toContain('InstallLocation')
    expect(include).toContain('${VersionCompare}')
    expect(include).toContain('STR:Perbarui')
    expect(include).toContain('STR:Perbaiki')
    expect(include).toContain('Pembaruan SION Media')
    expect(include).toContain('Perbaikan SION Media')
    expect(include).toContain('versi yang lebih baru sudah terpasang')
    expect(include).toContain('StrCpy $INSTDIR $ExistingInstallLocation')
  })

  test('keeps native update and repair UI readable at fixed NSIS dimensions', () => {
    const include = readFileSync(nsisIncludePath, 'utf8')
    expect(include).toMatch(/SendMessage \$0 \$\{WM_SETTEXT\} 0 "STR:Perbarui"/)
    expect(include).toMatch(/SendMessage \$0 \$\{WM_SETTEXT\} 0 "STR:Perbaiki"/)
    expect(include).toContain('SION Media Siap Diperbarui')
    expect(include).toContain('SION Media Siap Diperbaiki')
    expect(include).toContain('Data pengguna tetap dipertahankan')
    expect(include).not.toContain('${If} $InstallerMode != "install"')
    expect(include).not.toContain('STR:Perbarui SION Media')
    expect(include).not.toContain('STR:Perbaiki SION Media')
    expect(include).not.toContain('━')
  })

  test('keeps the user data directory outside installer replacement scope', () => {
    const include = readFileSync(nsisIncludePath, 'utf8')
    expect(config).toContain('deleteAppDataOnUninstall: false')
    expect(include).not.toMatch(/RMDir\s+\/r\s+[^\r\n]*APPDATA/i)
  })

  test('generates the Windows icon from the official SION Media brand asset', () => {
    const generator = readFileSync(assetGeneratorPath, 'utf8')
    expect(generator).toContain('resources\\branding\\app-icon.png')
    expect(generator).toContain('build\\icon.ico')

    const icon = readFileSync(resolve(root, 'build/icon.ico'))
    expect(icon.readUInt16LE(0)).toBe(0)
    expect(icon.readUInt16LE(2)).toBe(1)
    expect(icon.readUInt16LE(4)).toBeGreaterThanOrEqual(6)
  })
})

describe('Bundled database contract', () => {
  const biblePackDir = resolve(root, 'resources/content-packs/bibles/bible_tb')
  const bibleDatabasePath = resolve(biblePackDir, 'tb_lai_1974.sqlite')
  const bibleManifestPath = resolve(biblePackDir, 'tb_lai_1974.manifest.json')

  test('includes the production song database and excludes transient journal files', () => {
    const gitignore = readFileSync(resolve(root, '.gitignore'), 'utf8')

    expect(gitignore).toContain('!resources/content-packs/bibles/bible_tb/tb_lai_1974.sqlite')
    // sion.db MUST be included in the build — it is the pre-populated default database
    expect(config).toContain("- '!resources/sion.db'")
    // Journal files MUST be excluded — they are transient runtime artifacts
    expect(config).toContain('!resources/**/*.db-wal')
    expect(config).toContain('!resources/**/*.db-shm')
    expect(config).toContain('!resources/**/*.sqlite-wal')
    expect(config).toContain('!resources/**/*.sqlite-shm')
  })

  test('copies Bible content packs into the installer resources directory explicitly', () => {
    expect(config).toMatch(
      /extraResources:\s*[\s\S]*?- from: resources\/content-packs\s*[\s\S]*?to: content-packs/
    )

    const pathSource = readFileSync(
      resolve(root, 'src/main/services/content-packs/contentPackPaths.ts'),
      'utf8'
    )
    expect(pathSource).toContain("join(process.resourcesPath, 'content-packs')")
    expect(pathSource).not.toContain("replace('app.asar', 'app.asar.unpacked')")
  })

  test('copies the bundled song database to a real SQLite-readable production path', () => {
    expect(config).toMatch(
      /extraResources:\s*[\s\S]*?- from: resources\/sion\.db\s*[\s\S]*?to: sion\.db/
    )
    expect(config).toContain("- '!resources/sion.db'")

    const databaseSource = readFileSync(resolve(root, 'src/main/database.ts'), 'utf8')
    expect(databaseSource).toContain("join(process.resourcesPath, 'sion.db')")
  })

  test('ships a complete and checksum-valid TB Bible database', () => {
    expect(existsSync(bibleDatabasePath)).toBe(true)
    expect(statSync(bibleDatabasePath).size).toBeGreaterThan(15_000_000)
    expect(readFileSync(bibleDatabasePath).subarray(0, 16).toString('ascii')).toBe(
      'SQLite format 3\u0000'
    )

    const manifest = JSON.parse(readFileSync(bibleManifestPath, 'utf8')) as {
      files: Array<{ filename: string; sha256: string }>
    }
    const databaseManifest = manifest.files.find((file) => file.filename === 'tb_lai_1974.sqlite')
    const checksum = createHash('sha256').update(readFileSync(bibleDatabasePath)).digest('hex')
    expect(databaseManifest).toBeDefined()
    expect(checksum).toBe(databaseManifest?.sha256)
  })
})

describe('native dependency runtime contract', () => {
  test('automatically targets better-sqlite3 for Node tests and Electron runtime', () => {
    expect(packageJson.scripts.pretest).toBeUndefined()
    expect(packageJson.scripts['rebuild:node-native']).toBe('npm rebuild better-sqlite3')
    expect(packageJson.scripts['rebuild:electron-native']).toBe(
      'electron-rebuild -f -w better-sqlite3'
    )
    expect(packageJson.scripts.test).toBe('node scripts/run-vitest-restore-electron.mjs')
    const testRunner = readFileSync(
      resolve(root, 'scripts/run-vitest-restore-electron.mjs'),
      'utf8'
    )
    expect(testRunner).toContain("['run', 'rebuild:node-native']")
    expect(testRunner).toContain("['run', 'rebuild:electron-native']")
    expect(packageJson.scripts.predev).toBe('npm run rebuild:electron-native')
    expect(packageJson.scripts.prestart).toBe('npm run rebuild:electron-native')
    expect(packageJson.scripts['build:unpack']).toContain('npm run rebuild:electron-native')
    expect(packageJson.scripts['build:win']).toContain('npm run rebuild:electron-native')
    expect(config).toContain('npmRebuild: false')
  })

  test('development startup does not delete a shared Chromium cache', () => {
    const mainEntry = readFileSync(resolve(root, 'src/main/index.ts'), 'utf8')
    expect(mainEntry).not.toContain('clearDevChromiumCache')
    expect(mainEntry).not.toContain("import { rmSync } from 'fs'")
  })
})

describe('Bundled FFmpeg contract', () => {
  const downloaderPath = resolve(root, 'scripts/download-ffmpeg.mjs')
  const noticePath = resolve(root, 'resources/ffmpeg.NOTICE.md')

  test('prepares FFmpeg before every Windows packaging flow', () => {
    expect(packageJson.scripts['prepare:ffmpeg']).toBe('node scripts/download-ffmpeg.mjs')
    expect(packageJson.scripts['prepare:streaming']).toContain('npm run prepare:ffmpeg')
    expect(packageJson.scripts['build:unpack']).toContain('npm run prepare:streaming')
    expect(packageJson.scripts['build:win']).toContain('npm run prepare:streaming')
    expect(config).toMatch(/- from: resources\/ffmpeg\s*[\s\S]*?to: ffmpeg/)
  })

  test('bundles a pinned and verified MediaMTX gateway for OBS live input', () => {
    const downloader = readFileSync(resolve(root, 'scripts/download-mediamtx.mjs'), 'utf8')
    const notice = readFileSync(resolve(root, 'resources/mediamtx.NOTICE.md'), 'utf8')
    expect(packageJson.scripts['prepare:mediamtx']).toBe('node scripts/download-mediamtx.mjs')
    expect(packageJson.scripts['prepare:streaming']).toContain('npm run prepare:mediamtx')
    expect(config).toMatch(/- from: resources\/mediamtx\s*[\s\S]*?to: mediamtx/)
    expect(downloader).toContain("const VERSION = '1.17.0'")
    expect(downloader).toContain('ARCHIVE_SHA256')
    expect(downloader).toContain('checksum mismatch')
    expect(notice).toContain('License: MIT')
  })

  test('pins and verifies the upstream archive before packaging', () => {
    const downloader = readFileSync(downloaderPath, 'utf8')
    expect(downloader).toContain("const FFMPEG_VERSION = '8.1.2'")
    expect(downloader).toContain(
      "const ARCHIVE_SHA256 = 'db580001caa24ac104c8cb856cd113a87b0a443f7bdf47d8c12b1d740584a2ec'"
    )
    expect(downloader).toContain("['-hide_banner', '-protocols']")
    expect(downloader).toContain("['-hide_banner', '-encoders']")
    expect(downloader).toContain('checksum mismatch')
  })

  test('keeps generated binaries out of git while shipping upstream license notices', () => {
    const gitignore = readFileSync(resolve(root, '.gitignore'), 'utf8')
    expect(gitignore).toContain('resources/ffmpeg/')
    expect(existsSync(noticePath)).toBe(true)
    expect(readFileSync(noticePath, 'utf8')).toContain('GNU General Public License version 3')
  })
})

describe('Code signing infrastructure', () => {
  test('electron-builder.yml declares publisher identity and signing policy', () => {
    expect(config).toContain('requestedExecutionLevel: asInvoker')
    expect(config).toContain('verifyUpdateCodeSignature: false')
    expect(config).toContain('forceCodeSigning: false')
  })

  test('signing certificate generator script exists and targets correct output', () => {
    expect(existsSync(signingCertGeneratorPath)).toBe(true)
    const script = readFileSync(signingCertGeneratorPath, 'utf8')
    expect(script).toContain('CN=AiWerek Tech')
    expect(script).toContain('CodeSigningCert')
    expect(script).toContain('sion-media-signing.pfx')
    expect(script).toContain('CSC_LINK')
    expect(script).toContain('CSC_KEY_PASSWORD')
  })

  test('sign-build wrapper script exists and orchestrates the signing pipeline', () => {
    expect(existsSync(signBuildPath)).toBe(true)
    const script = readFileSync(signBuildPath, 'utf8')
    expect(script).toContain('CSC_LINK')
    expect(script).toContain('CSC_KEY_PASSWORD')
    expect(script).toContain('CSC_IDENTITY_AUTO_DISCOVERY')
    expect(script).toContain('Get-AuthenticodeSignature')
    expect(script).toContain('npm run build:win')
  })

  test('installer includes SmartScreen guidance page for unsigned beta', () => {
    const include = readFileSync(nsisIncludePath, 'utf8')
    expect(include).toContain('SmartScreen')
    expect(include).toContain('SmartScreenGuidancePage')
    expect(include).toContain('Informasi Keamanan Windows')
    expect(include).toContain('More info')
    expect(include).toContain('Run anyway')
    expect(include).toContain('github.com/AiWerek-Tech/SION-Media')
  })

  test('certificate files are protected by .gitignore', () => {
    const gitignore = readFileSync(resolve(root, '.gitignore'), 'utf8')
    expect(gitignore).toContain('certs/')
    expect(gitignore).toContain('*.pfx')
    expect(gitignore).toContain('*.p12')
  })

  test('code signing documentation exists', () => {
    const docPath = resolve(root, 'docs/CODE_SIGNING.md')
    expect(existsSync(docPath)).toBe(true)
    const doc = readFileSync(docPath, 'utf8')
    expect(doc).toContain('Self-Signed Certificate')
    expect(doc).toContain('CA Certificate')
    expect(doc).toContain('generate-signing-cert.ps1')
    expect(doc).toContain('sign-build.ps1')
    expect(doc).toContain('electron-builder.yml')
  })
})
