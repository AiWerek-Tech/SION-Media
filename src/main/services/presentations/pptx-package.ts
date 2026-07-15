import { createHash, randomUUID } from 'crypto'
import { existsSync } from 'fs'
import { mkdir, readFile, readdir, rename, rm, stat, writeFile } from 'fs/promises'
import { basename, dirname, extname, join, posix } from 'path'
import { spawn } from 'child_process'
import { app } from 'electron'
import yauzl from 'yauzl'
import { XMLParser } from 'fast-xml-parser'

const MAX_PPTX_BYTES = 300 * 1024 * 1024
const MAX_ZIP_ENTRIES = 20_000
const MAX_ENTRY_BYTES = 64 * 1024 * 1024
const MAX_TOTAL_XML_BYTES = 256 * 1024 * 1024

export interface PresentationPackageSlide {
  index: number
  sourcePath: string
  imagePath: string
  title: string
  notes: string
}

export interface PresentationPackageManifest {
  version: 1
  id: string
  title: string
  sourcePath: string
  sourceSha256: string
  importedAt: string
  pdfPath: string
  slideCount: number
  conversionProvider: 'powerpoint' | 'wps' | 'libreoffice'
  outputMode: 'pdf' | 'images'
  warnings: string[]
  slides: PresentationPackageSlide[]
}

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return []
  return Array.isArray(value) ? value : [value]
}

function decodeXml(value: string): string {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
}

function relationshipMap(xml: string): Map<string, string> {
  const result = new Map<string, string>()
  const pattern = /<Relationship\b([^>]+?)\/?\s*>/g
  for (const match of xml.matchAll(pattern)) {
    const attrs = match[1] ?? ''
    const id = /\bId="([^"]+)"/.exec(attrs)?.[1]
    const target = /\bTarget="([^"]+)"/.exec(attrs)?.[1]
    if (id && target) result.set(id, decodeXml(target))
  }
  return result
}

export function getOrderedSlidePaths(presentationXml: string, relationshipsXml: string): string[] {
  const relationships = relationshipMap(relationshipsXml)
  const ids = Array.from(presentationXml.matchAll(/<p:sldId\b[^>]*\br:id="([^"]+)"[^>]*\/?\s*>/g))
    .map((match) => match[1])
    .filter((id): id is string => Boolean(id))
  return ids
    .map((id) => relationships.get(id))
    .filter((target): target is string => Boolean(target))
    .map((target) => posix.normalize(posix.join('ppt', target)).replace(/^\.\.\//, ''))
}

function collectText(node: unknown, output: string[]): void {
  if (typeof node === 'string' || typeof node === 'number') return
  if (!node || typeof node !== 'object') return
  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    if (key === 't' && (typeof value === 'string' || typeof value === 'number')) {
      output.push(String(value))
    } else if (!key.startsWith('@_')) {
      if (Array.isArray(value)) value.forEach((item) => collectText(item, output))
      else collectText(value, output)
    }
  }
}

function shapePlaceholderType(shape: Record<string, unknown>): string {
  const nvSpPr = shape.nvSpPr as Record<string, unknown> | undefined
  const nvPr = nvSpPr?.nvPr as Record<string, unknown> | undefined
  const ph = nvPr?.ph as Record<string, unknown> | undefined
  return typeof ph?.['@_type'] === 'string' ? String(ph['@_type']) : ''
}

export function extractSpeakerNotes(notesXml: string): string {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    removeNSPrefix: true
  })
  const parsed = parser.parse(notesXml) as Record<string, unknown>
  const notes = parsed.notes as Record<string, unknown> | undefined
  const cSld = notes?.cSld as Record<string, unknown> | undefined
  const spTree = cSld?.spTree as Record<string, unknown> | undefined
  const shapes = asArray(spTree?.sp as Record<string, unknown> | Array<Record<string, unknown>>)
  const paragraphs: string[] = []
  for (const shape of shapes) {
    if (shapePlaceholderType(shape) !== 'body') continue
    const txBody = shape.txBody as Record<string, unknown> | undefined
    for (const paragraph of asArray(txBody?.p)) {
      const text: string[] = []
      collectText(paragraph, text)
      const line = text.join('').replace(/\s+/g, ' ').trim()
      if (line) paragraphs.push(line)
    }
  }
  return paragraphs.join('\n')
}

export function extractSlideTitle(slideXml: string): string {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    removeNSPrefix: true
  })
  const parsed = parser.parse(slideXml) as Record<string, unknown>
  const slide = parsed.sld as Record<string, unknown> | undefined
  const cSld = slide?.cSld as Record<string, unknown> | undefined
  const spTree = cSld?.spTree as Record<string, unknown> | undefined
  const shapes = asArray(spTree?.sp as Record<string, unknown> | Array<Record<string, unknown>>)
  for (const shape of shapes) {
    const type = shapePlaceholderType(shape)
    if (type !== 'title' && type !== 'ctrTitle') continue
    const text: string[] = []
    collectText(shape.txBody, text)
    const title = text.join(' ').replace(/\s+/g, ' ').trim()
    if (title) return title.slice(0, 300)
  }
  return ''
}

async function readPptxEntries(filePath: string): Promise<Map<string, Buffer>> {
  return new Promise((resolve, reject) => {
    yauzl.open(filePath, { lazyEntries: true, validateEntrySizes: true }, (openError, zip) => {
      if (openError || !zip)
        return reject(openError ?? new Error('PPTX archive could not be opened.'))
      const entries = new Map<string, Buffer>()
      let entryCount = 0
      let totalBytes = 0
      const fail = (error: Error): void => {
        zip.close()
        reject(error)
      }
      zip.on('error', fail)
      zip.on('entry', (entry) => {
        entryCount += 1
        if (entryCount > MAX_ZIP_ENTRIES)
          return fail(new Error('PPTX contains too many archive entries.'))
        const name = entry.fileName.replace(/\\/g, '/')
        if (name.includes('../') || name.startsWith('/'))
          return fail(new Error('Unsafe PPTX entry path.'))
        const wanted = name.startsWith('ppt/') && (name.endsWith('.xml') || name.endsWith('.rels'))
        if (!wanted || /\/$/.test(name)) return zip.readEntry()
        if (entry.uncompressedSize > MAX_ENTRY_BYTES)
          return fail(new Error('PPTX XML entry is too large.'))
        totalBytes += entry.uncompressedSize
        if (totalBytes > MAX_TOTAL_XML_BYTES)
          return fail(new Error('PPTX expanded XML exceeds safety limit.'))
        zip.openReadStream(entry, (streamError, stream) => {
          if (streamError || !stream)
            return fail(streamError ?? new Error('PPTX entry could not be read.'))
          const chunks: Buffer[] = []
          stream.on('data', (chunk: Buffer) => chunks.push(chunk))
          stream.on('error', fail)
          stream.on('end', () => {
            entries.set(name, Buffer.concat(chunks))
            zip.readEntry()
          })
        })
      })
      zip.on('end', () => resolve(entries))
      zip.readEntry()
    })
  })
}

async function parsePptx(
  filePath: string
): Promise<Array<{ sourcePath: string; title: string; notes: string }>> {
  const entries = await readPptxEntries(filePath)
  const presentation = entries.get('ppt/presentation.xml')?.toString('utf8') ?? ''
  const relationships = entries.get('ppt/_rels/presentation.xml.rels')?.toString('utf8') ?? ''
  const orderedSlides = getOrderedSlidePaths(presentation, relationships)
  if (orderedSlides.length === 0) throw new Error('PPTX does not contain readable slides.')

  const notesBySlide = new Map<string, string>()
  for (const [name, buffer] of entries) {
    const match = /^ppt\/notesSlides\/(notesSlide\d+\.xml)$/.exec(name)
    if (!match) continue
    const relsName = `ppt/notesSlides/_rels/${match[1]}.rels`
    const rels = entries.get(relsName)?.toString('utf8') ?? ''
    const target = Array.from(relationshipMap(rels).values()).find((value) =>
      value.includes('/slides/')
    )
    if (!target) continue
    const slidePath = posix.normalize(posix.join('ppt/notesSlides', target))
    notesBySlide.set(slidePath, extractSpeakerNotes(buffer.toString('utf8')))
  }

  return orderedSlides.map((sourcePath) => ({
    sourcePath,
    title: extractSlideTitle(entries.get(sourcePath)?.toString('utf8') ?? ''),
    notes: notesBySlide.get(sourcePath) ?? ''
  }))
}

function encodePowerShell(script: string): string {
  return Buffer.from(script, 'utf16le').toString('base64')
}

async function exportWithOfficeCom(
  sourcePath: string,
  pdfPath: string,
  slidesDir: string,
  progId: 'PowerPoint.Application' | 'KWPP.Application'
): Promise<void> {
  const escapedSource = sourcePath.replace(/'/g, "''")
  const escapedPdf = pdfPath.replace(/'/g, "''")
  const escapedSlides = slidesDir.replace(/'/g, "''")
  const script = `$ErrorActionPreference='Stop'; $ppt=$null; $deck=$null; try { $ppt=New-Object -ComObject '${progId}'; $deck=$ppt.Presentations.Open('${escapedSource}', $true, $false, $false); $deck.ExportAsFixedFormat('${escapedPdf}', 2); $deck.Export('${escapedSlides}', 'PNG', 1920, 1080) } finally { if($deck){$deck.Close()}; if($ppt){$ppt.Quit()}; [GC]::Collect(); [GC]::WaitForPendingFinalizers() }`
  await new Promise<void>((resolve, reject) => {
    const child = spawn(
      'powershell.exe',
      [
        '-NoLogo',
        '-NoProfile',
        '-NonInteractive',
        '-ExecutionPolicy',
        'Bypass',
        '-EncodedCommand',
        encodePowerShell(script)
      ],
      { windowsHide: true }
    )
    let errorText = ''
    const timer = setTimeout(() => {
      child.kill()
      reject(new Error('PowerPoint conversion exceeded the 3 minute timeout.'))
    }, 180_000)
    child.stderr.on('data', (chunk: Buffer) => (errorText += chunk.toString()))
    child.once('error', (error) => {
      clearTimeout(timer)
      reject(error)
    })
    child.once('exit', (code) => {
      clearTimeout(timer)
      if (code === 0) resolve()
      else reject(new Error(errorText.trim() || `PowerPoint conversion failed (${code}).`))
    })
  })
}

function findLibreOffice(): string | null {
  const candidates = [
    process.env['PROGRAMFILES']
      ? join(process.env['PROGRAMFILES'], 'LibreOffice', 'program', 'soffice.exe')
      : '',
    process.env['PROGRAMFILES(X86)']
      ? join(process.env['PROGRAMFILES(X86)'], 'LibreOffice', 'program', 'soffice.exe')
      : ''
  ]
  return candidates.find((candidate) => candidate && existsSync(candidate)) ?? null
}

async function hasComProvider(progId: string): Promise<boolean> {
  const script = `$t=[type]::GetTypeFromProgID('${progId}'); if($t){exit 0}else{exit 1}`
  return new Promise((resolve) => {
    const child = spawn(
      'powershell.exe',
      ['-NoLogo', '-NoProfile', '-NonInteractive', '-EncodedCommand', encodePowerShell(script)],
      { windowsHide: true }
    )
    child.once('error', () => resolve(false))
    child.once('exit', (code) => resolve(code === 0))
  })
}

async function selectConversionProvider(): Promise<'powerpoint' | 'wps' | 'libreoffice'> {
  if (await hasComProvider('PowerPoint.Application')) return 'powerpoint'
  if (await hasComProvider('KWPP.Application')) return 'wps'
  if (findLibreOffice()) return 'libreoffice'
  throw new Error(
    'Tidak ada mesin konversi presentasi. Instal Microsoft PowerPoint, WPS Presentation, atau LibreOffice.'
  )
}

async function exportWithLibreOffice(sourcePath: string, pdfPath: string): Promise<void> {
  const executable = findLibreOffice()
  if (!executable) throw new Error('LibreOffice tidak ditemukan.')
  const outputDir = dirname(pdfPath)
  await new Promise<void>((resolve, reject) => {
    const child = spawn(
      executable,
      [
        '--headless',
        '--nologo',
        '--nodefault',
        '--nofirststartwizard',
        '--convert-to',
        'pdf',
        '--outdir',
        outputDir,
        sourcePath
      ],
      { windowsHide: true }
    )
    let errorText = ''
    const timer = setTimeout(() => {
      child.kill()
      reject(new Error('Konversi LibreOffice melewati batas waktu 3 menit.'))
    }, 180_000)
    child.stderr.on('data', (chunk: Buffer) => (errorText += chunk.toString()))
    child.once('error', reject)
    child.once('exit', async (code) => {
      clearTimeout(timer)
      if (code !== 0) return reject(new Error(errorText.trim() || 'Konversi LibreOffice gagal.'))
      const generated = join(outputDir, `${basename(sourcePath, extname(sourcePath))}.pdf`)
      if (!existsSync(generated)) return reject(new Error('LibreOffice tidak menghasilkan PDF.'))
      if (generated !== pdfPath) await rename(generated, pdfPath)
      resolve()
    })
  })
}

export async function createPresentationPackage(
  sourcePath: string,
  requestedOutput: 'auto' | 'pdf' | 'images' = 'auto'
): Promise<PresentationPackageManifest> {
  if (extname(sourcePath).toLowerCase() !== '.pptx')
    throw new Error('Only .pptx presentations are supported.')
  const sourceStat = await stat(sourcePath).catch(() => null)
  if (!sourceStat?.isFile()) throw new Error('PPTX file was not found.')
  if (sourceStat.size > MAX_PPTX_BYTES) throw new Error('PPTX exceeds the 300 MB import limit.')

  const sourceBytes = await readFile(sourcePath)
  const sourceSha256 = createHash('sha256').update(sourceBytes).digest('hex')
  const parsedSlides = await parsePptx(sourcePath)
  const id = randomUUID()
  const root = join(app.getPath('userData'), 'presentation-packages')
  const temporaryDir = join(root, `.importing-${id}`)
  const packageDir = join(root, id)
  const slidesDir = join(temporaryDir, 'slides')
  const pdfPath = join(temporaryDir, 'presentation.pdf')
  await mkdir(slidesDir, { recursive: true })
  try {
    const conversionProvider = await selectConversionProvider()
    const warnings: string[] = []
    if (conversionProvider === 'libreoffice') {
      await exportWithLibreOffice(sourcePath, pdfPath)
      if (requestedOutput === 'images') {
        warnings.push(
          'LibreOffice menghasilkan PDF; mode gambar memerlukan PowerPoint atau WPS Presentation.'
        )
      }
    } else {
      await exportWithOfficeCom(
        sourcePath,
        pdfPath,
        slidesDir,
        conversionProvider === 'powerpoint' ? 'PowerPoint.Application' : 'KWPP.Application'
      )
    }
    if (!existsSync(pdfPath))
      throw new Error('Mesin konversi tidak menghasilkan PDF yang diharapkan.')
    const exportedImages = (await readdir(slidesDir))
      .filter((name) => /^(?:slide)?\d+\.png$/i.test(name))
      .sort((left, right) => {
        const leftNumber = Number(left.match(/\d+/)?.[0] ?? 0)
        const rightNumber = Number(right.match(/\d+/)?.[0] ?? 0)
        return leftNumber - rightNumber
      })
    if (conversionProvider !== 'libreoffice' && exportedImages.length !== parsedSlides.length) {
      throw new Error(
        `PowerPoint exported ${exportedImages.length} slide images; expected ${parsedSlides.length}.`
      )
    }
    const slides = parsedSlides.map((slide, index) => ({
      index,
      sourcePath: slide.sourcePath,
      imagePath: exportedImages[index] ? join(packageDir, 'slides', exportedImages[index]) : '',
      title: slide.title || `Slide ${index + 1}`,
      notes: slide.notes
    }))
    const manifest: PresentationPackageManifest = {
      version: 1,
      id,
      title: basename(sourcePath, extname(sourcePath)),
      sourcePath,
      sourceSha256,
      importedAt: new Date().toISOString(),
      pdfPath: join(packageDir, 'presentation.pdf'),
      slideCount: slides.length,
      conversionProvider,
      outputMode:
        requestedOutput === 'images' && conversionProvider !== 'libreoffice' ? 'images' : 'pdf',
      warnings,
      slides
    }
    await writeFile(join(temporaryDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8')
    await mkdir(dirname(packageDir), { recursive: true })
    await rename(temporaryDir, packageDir)
    return manifest
  } catch (error) {
    await rm(temporaryDir, { recursive: true, force: true })
    throw error
  }
}

export async function readPresentationManifest(
  manifestPath: string
): Promise<PresentationPackageManifest> {
  const parsed = JSON.parse(await readFile(manifestPath, 'utf8')) as PresentationPackageManifest
  if (
    parsed.version !== 1 ||
    !Array.isArray(parsed.slides) ||
    parsed.slideCount !== parsed.slides.length
  ) {
    throw new Error('Presentation package manifest is invalid.')
  }
  return parsed
}
