/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { createHash } from 'node:crypto'
import { createReadStream, createWriteStream, existsSync } from 'node:fs'
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { basename, dirname, join, resolve, sep } from 'node:path'
import { spawnSync } from 'node:child_process'
import yauzl from 'yauzl'

const FFMPEG_VERSION = '8.1.2'
const ARCHIVE_NAME = `ffmpeg-${FFMPEG_VERSION}-essentials_build.zip`
const DOWNLOAD_URL = `https://www.gyan.dev/ffmpeg/builds/packages/${ARCHIVE_NAME}`
const ARCHIVE_SHA256 = 'db580001caa24ac104c8cb856cd113a87b0a443f7bdf47d8c12b1d740584a2ec'
const MAX_ARCHIVE_BYTES = 180 * 1024 * 1024

const projectRoot = resolve(import.meta.dirname, '..')
const resourcesRoot = resolve(projectRoot, 'resources')
const outputDir = resolve(resourcesRoot, 'ffmpeg')
const noticePath = resolve(resourcesRoot, 'ffmpeg.NOTICE.md')
const executableName = process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg'
const executablePath = join(outputDir, executableName)
const manifestPath = join(outputDir, 'bundle-manifest.json')
const downloadCacheDir = resolve(projectRoot, 'node_modules', '.cache', 'sion-media')
const cachedArchivePath = join(downloadCacheDir, ARCHIVE_NAME)

function assertSafeOutputPath(path) {
  if (!path.startsWith(`${resourcesRoot}${sep}`)) {
    throw new Error(`Refusing to modify FFmpeg output outside resources: ${path}`)
  }
}

async function sha256(path) {
  const hash = createHash('sha256')
  for await (const chunk of createReadStream(path)) hash.update(chunk)
  return hash.digest('hex')
}

function inspectFfmpeg(path) {
  const protocols = spawnSync(path, ['-hide_banner', '-protocols'], {
    encoding: 'utf8',
    windowsHide: true,
    timeout: 15_000
  })
  const protocolOutput = `${protocols.stdout || ''}\n${protocols.stderr || ''}`
  if (protocols.error || protocols.status !== 0 || !/(?:^|\s)srt(?:\s|$)/m.test(protocolOutput)) {
    throw new Error('Bundled FFmpeg does not provide the SRT protocol.')
  }

  const encoders = spawnSync(path, ['-hide_banner', '-encoders'], {
    encoding: 'utf8',
    windowsHide: true,
    timeout: 15_000
  })
  const encoderOutput = `${encoders.stdout || ''}\n${encoders.stderr || ''}`
  if (
    encoders.error ||
    encoders.status !== 0 ||
    !/\b(?:libx264|h264_mf|h264_qsv|h264_nvenc|h264_amf)\b/.test(encoderOutput)
  ) {
    throw new Error('Bundled FFmpeg does not provide a supported H.264 encoder.')
  }
}

async function existingBundleIsValid() {
  if (!existsSync(executablePath) || !existsSync(manifestPath)) return false
  try {
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
    if (manifest.version !== FFMPEG_VERSION || manifest.archiveSha256 !== ARCHIVE_SHA256)
      return false
    if ((await sha256(executablePath)) !== manifest.executableSha256) return false
    inspectFfmpeg(executablePath)
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
  if (!response.ok || !response.body) {
    throw new Error(`FFmpeg download failed: HTTP ${response.status}`)
  }

  const declaredLength = Number(response.headers.get('content-length') || 0)
  if (declaredLength > MAX_ARCHIVE_BYTES) throw new Error('FFmpeg archive exceeds the size limit.')

  await mkdir(dirname(destination), { recursive: true })
  const file = createWriteStream(destination, { flags: 'wx' })
  let received = 0
  try {
    for await (const chunk of response.body) {
      received += chunk.length
      if (received > MAX_ARCHIVE_BYTES) throw new Error('FFmpeg archive exceeds the size limit.')
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
    throw new Error(`FFmpeg checksum mismatch: expected ${ARCHIVE_SHA256}, received ${actualHash}`)
  }
}

async function ensureVerifiedArchive() {
  if (existsSync(cachedArchivePath)) {
    const cachedHash = await sha256(cachedArchivePath)
    if (cachedHash === ARCHIVE_SHA256) {
      console.log(`[FFmpeg] Using verified download cache: ${cachedArchivePath}`)
      return cachedArchivePath
    }
    console.warn('[FFmpeg] Discarding download cache with an invalid checksum.')
    await rm(cachedArchivePath, { force: true })
  }

  await mkdir(downloadCacheDir, { recursive: true })
  console.log(`[FFmpeg] Downloading ${DOWNLOAD_URL}`)
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
    ['ffmpeg.exe', 'ffmpeg.exe'],
    ['LICENSE', 'LICENSE.txt'],
    ['README.txt', 'UPSTREAM-README.txt']
  ])
  const extracted = new Set()

  return new Promise((resolveExtract, rejectExtract) => {
    yauzl.open(archivePath, { lazyEntries: true }, (openError, zip) => {
      if (openError || !zip)
        return rejectExtract(openError || new Error('Unable to open FFmpeg archive.'))
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
          const targetPath = join(destination, targetName)
          const output = createWriteStream(targetPath, { flags: 'wx' })
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
        if (missing.length > 0)
          return rejectExtract(new Error(`FFmpeg archive is missing: ${missing.join(', ')}`))
        resolveExtract()
      })
      zip.readEntry()
    })
  })
}

async function main() {
  if (process.platform !== 'win32') {
    console.log('[FFmpeg] Skipped: bundled binary is currently Windows-only.')
    return
  }
  assertSafeOutputPath(outputDir)
  if (await existingBundleIsValid()) {
    console.log(`[FFmpeg] Verified cached ${executablePath}`)
    return
  }

  const workDir = join(resourcesRoot, `.ffmpeg-staging-${process.pid}-${Date.now()}`)
  assertSafeOutputPath(workDir)
  const stagedDir = join(workDir, 'bundle')
  try {
    await mkdir(stagedDir, { recursive: true })
    const archivePath = await ensureVerifiedArchive()
    await extractSelectedFiles(archivePath, stagedDir)
    const stagedExecutable = join(stagedDir, executableName)
    inspectFfmpeg(stagedExecutable)
    const executableSha256 = await sha256(stagedExecutable)
    await writeFile(
      join(stagedDir, 'bundle-manifest.json'),
      `${JSON.stringify({ version: FFMPEG_VERSION, source: DOWNLOAD_URL, archiveSha256: ARCHIVE_SHA256, executableSha256 }, null, 2)}\n`,
      'utf8'
    )
    await writeFile(
      join(stagedDir, 'THIRD_PARTY_NOTICES.md'),
      await readFile(noticePath, 'utf8'),
      'utf8'
    )
    await rm(outputDir, { recursive: true, force: true })
    await rename(stagedDir, outputDir)
    console.log(`[FFmpeg] Ready: ${executablePath}`)
  } finally {
    await rm(workDir, { recursive: true, force: true })
  }
}

main().catch((error) => {
  console.error(`[FFmpeg] ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
})
