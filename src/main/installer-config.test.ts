import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, test } from 'vitest'

const root = process.cwd()
const config = readFileSync(resolve(root, 'electron-builder.yml'), 'utf8')
const nsisIncludePath = resolve(root, 'build/installer.nsh')
const assetGeneratorPath = resolve(root, 'scripts/generate-installer-assets.ps1')

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
