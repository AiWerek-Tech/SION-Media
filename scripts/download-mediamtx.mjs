/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { createHash } from 'node:crypto'
import { createReadStream, createWriteStream, existsSync } from 'node:fs'
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { basename, dirname, join, resolve, sep } from 'node:path'
import { spawnSync } from 'node:child_process'
import yauzl from 'yauzl'

const VERSION = '1.17.0'
const ARCHIVE_NAME = `mediamtx_v${VERSION}_windows_amd64.zip`
const DOWNLOAD_URL = `https://github.com/bluenviron/mediamtx/releases/download/v${VERSION}/${ARCHIVE_NAME}`
const ARCHIVE_SHA256 = '99b365bbbc1661fd2d2a1488fe70689998b9543971a7e064160131443fcae312'
const MAX_ARCHIVE_BYTES = 80 * 1024 * 1024

const projectRoot = resolve(import.meta.dirname, '..')
const resourcesRoot = resolve(projectRoot, 'resources')
const outputDir = resolve(resourcesRoot, 'mediamtx')
const executablePath = join(outputDir, 'mediamtx.exe')
const manifestPath = join(outputDir, 'bundle-manifest.json')
const noticePath = resolve(resourcesRoot, 'mediamtx.NOTICE.md')
const cacheDir = resolve(projectRoot, 'node_modules', '.cache', 'sion-media')
const cachedArchivePath = join(cacheDir, ARCHIVE_NAME)

function assertSafeOutputPath(path) {
  if (!path.startsWith(`${resourcesRoot}${sep}`)) {
    throw new Error(`Refusing to modify MediaMTX output outside resources: ${path}`)
  }
}

async function sha256(path) {
  const hash = createHash('sha256')
  for await (const chunk of createReadStream(path)) hash.update(chunk)
  return hash.digest('hex')
}

function inspectBinary(path) {
  const result = spawnSync(path, ['--version'], {
    encoding: 'utf8',
    windowsHide: true,
    timeout: 15_000
  })
  const output = `${result.stdout || ''}\n${result.stderr || ''}`
  if (result.error || result.status !== 0 || !output.includes(`v${VERSION}`)) {
    throw new Error(`Bundled MediaMTX failed validation: ${output.trim() || 'no output'}`)
  }
}

async function existingBundleIsValid() {
  if (!existsSync(executablePath) || !existsSync(manifestPath)) return false
  try {
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
    if (manifest.version !== VERSION || manifest.archiveSha256 !== ARCHIVE_SHA256) return false
    if ((await sha256(executablePath)) !== manifest.executableSha256) return false
    inspectBinary(executablePath)
    return true
  } catch {
    return false
  }
}

async function downloadArchive(destination) {
  const response = await fetch(DOWNLOAD_URL, {
    redirect: 'follow',
    headers: { 'User-Agent': 'SION-Media-Build/1.1' }
  })
  if (!response.ok || !response.body)
    throw new Error(`MediaMTX download failed: HTTP ${response.status}`)
  const declaredLength = Number(response.headers.get('content-length') || 0)
  if (declaredLength > MAX_ARCHIVE_BYTES)
    throw new Error('MediaMTX archive exceeds the size limit.')

  await mkdir(dirname(destination), { recursive: true })
  const file = createWriteStream(destination, { flags: 'wx' })
  let received = 0
  try {
    for await (const chunk of response.body) {
      received += chunk.length
      if (received > MAX_ARCHIVE_BYTES) throw new Error('MediaMTX archive exceeds the size limit.')
      if (!file.write(chunk)) await new Promise((resolveDrain) => file.once('drain', resolveDrain))
    }
    await new Promise((resolveClose, rejectClose) => {
      file.end(resolveClose)
      file.once('error', rejectClose)
    })
  } catch (error) {
    file.destroy()
    throw error
  }
  const actualHash = await sha256(destination)
  if (actualHash !== ARCHIVE_SHA256) {
    throw new Error(
      `MediaMTX checksum mismatch: expected ${ARCHIVE_SHA256}, received ${actualHash}`
    )
  }
}

async function ensureVerifiedArchive() {
  if (existsSync(cachedArchivePath)) {
    if ((await sha256(cachedArchivePath)) === ARCHIVE_SHA256) {
      console.log(`[MediaMTX] Using verified download cache: ${cachedArchivePath}`)
      return cachedArchivePath
    }
    await rm(cachedArchivePath, { force: true })
  }
  await mkdir(cacheDir, { recursive: true })
  console.log(`[MediaMTX] Downloading ${DOWNLOAD_URL}`)
  try {
    await downloadArchive(cachedArchivePath)
  } catch (error) {
    await rm(cachedArchivePath, { force: true })
    throw error
  }
  return cachedArchivePath
}

function extractSelectedFiles(archivePath, destination) {
  const wanted = new Map([
    ['mediamtx.exe', 'mediamtx.exe'],
    ['LICENSE', 'LICENSE.txt']
  ])
  const extracted = new Set()
  return new Promise((resolveExtract, rejectExtract) => {
    yauzl.open(archivePath, { lazyEntries: true }, (openError, zip) => {
      if (openError || !zip)
        return rejectExtract(openError || new Error('Unable to open MediaMTX archive.'))
      const fail = (error) => {
        zip.close()
        rejectExtract(error)
      }
      zip.on('error', fail)
      zip.on('entry', (entry) => {
        const sourceName =
          entry.fileName.split('/').filter(Boolean).pop() || basename(entry.fileName)
        const targetName = wanted.get(sourceName)
        if (!targetName || extracted.has(sourceName)) {
          zip.readEntry()
          return
        }
        zip.openReadStream(entry, (streamError, stream) => {
          if (streamError || !stream)
            return fail(streamError || new Error(`Unable to extract ${sourceName}.`))
          const output = createWriteStream(join(destination, targetName), { flags: 'wx' })
          stream.once('error', fail)
          output.once('error', fail)
          output.once('finish', () => {
            extracted.add(sourceName)
            zip.readEntry()
          })
          stream.pipe(output)
        })
      })
      zip.on('end', () => {
        const missing = [...wanted.keys()].filter((name) => !extracted.has(name))
        if (missing.length)
          return rejectExtract(new Error(`MediaMTX archive is missing: ${missing.join(', ')}`))
        resolveExtract()
      })
      zip.readEntry()
    })
  })
}

async function main() {
  if (process.platform !== 'win32') {
    console.log('[MediaMTX] Skipped: bundled gateway is currently Windows-only.')
    return
  }
  assertSafeOutputPath(outputDir)
  if (await existingBundleIsValid()) {
    console.log(`[MediaMTX] Verified cached ${executablePath}`)
    return
  }

  const workDir = join(resourcesRoot, `.mediamtx-staging-${process.pid}-${Date.now()}`)
  const stagedDir = join(workDir, 'bundle')
  assertSafeOutputPath(workDir)
  try {
    await mkdir(stagedDir, { recursive: true })
    const archivePath = await ensureVerifiedArchive()
    await extractSelectedFiles(archivePath, stagedDir)
    const stagedExecutable = join(stagedDir, 'mediamtx.exe')
    inspectBinary(stagedExecutable)
    const executableSha256 = await sha256(stagedExecutable)
    await writeFile(
      join(stagedDir, 'bundle-manifest.json'),
      `${JSON.stringify({ version: VERSION, source: DOWNLOAD_URL, archiveSha256: ARCHIVE_SHA256, executableSha256 }, null, 2)}\n`,
      'utf8'
    )
    await writeFile(
      join(stagedDir, 'THIRD_PARTY_NOTICES.md'),
      await readFile(noticePath, 'utf8'),
      'utf8'
    )
    await rm(outputDir, { recursive: true, force: true })
    await rename(stagedDir, outputDir)
    console.log(`[MediaMTX] Ready: ${executablePath}`)
  } finally {
    await rm(workDir, { recursive: true, force: true })
  }
}

main().catch((error) => {
  console.error(`[MediaMTX] ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
})
