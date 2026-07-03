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

  test('keeps the production Bible database in source control and installer resources', () => {
    const gitignore = readFileSync(resolve(root, '.gitignore'), 'utf8')

    expect(gitignore).toContain('!resources/content-packs/bibles/bible_tb/tb_lai_1974.sqlite')
    expect(config).toContain('!resources/sion.db')
    expect(config).toContain('!resources/**/*.sqlite-wal')
    expect(config).toContain('!resources/**/*.sqlite-shm')
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
    expect(packageJson.scripts.pretest).toBe('npm rebuild better-sqlite3')
    expect(packageJson.scripts.predev).toBe('electron-builder install-app-deps')
    expect(packageJson.scripts.prestart).toBe('electron-builder install-app-deps')
  })

  test('development startup does not delete a shared Chromium cache', () => {
    const mainEntry = readFileSync(resolve(root, 'src/main/index.ts'), 'utf8')
    expect(mainEntry).not.toContain('clearDevChromiumCache')
    expect(mainEntry).not.toContain("import { rmSync } from 'fs'")
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
