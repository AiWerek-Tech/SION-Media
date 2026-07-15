import * as pdfjsLib from 'pdfjs-dist'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url'

// Set worker path
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker

// Global PDF document cache to prevent redundant loading/parsing
const pdfDocumentCache = new Map<string, Promise<pdfjsLib.PDFDocumentProxy>>()

// Global cache of pre-rendered pages as JPEG Data URLs (key format: `${pdfPath}-${pageNumber}-${scale}`)
const pdfRenderCache = new Map<string, string>()

export function getPdfDocument(filePath: string): Promise<pdfjsLib.PDFDocumentProxy> {
  let cleanPath = filePath
  if (!cleanPath.startsWith('local-media://') && !cleanPath.startsWith('http')) {
    cleanPath = `local-media:///${cleanPath.replace(/\\/g, '/')}`
  }

  let cachedPromise = pdfDocumentCache.get(cleanPath)
  if (!cachedPromise) {
    const loadingTask = pdfjsLib.getDocument({
      url: cleanPath,
      disableRange: false,
      disableAutoFetch: false
    })
    cachedPromise = loadingTask.promise.catch((error: unknown) => {
      // Do not permanently retain a rejected loading task. Files can become
      // available again (for example after a temporary I/O or protocol error).
      pdfDocumentCache.delete(cleanPath)
      throw error
    })
    pdfDocumentCache.set(cleanPath, cachedPromise)
  }

  return cachedPromise
}

export async function getPdfPageCount(filePath: string): Promise<number> {
  const pdf = await getPdfDocument(filePath)
  return pdf.numPages
}

export function getCachedPdfPageImage(
  filePath: string,
  pageNumber: number,
  scale: number
): string | undefined {
  const key = `${filePath}-${pageNumber}-${scale}`
  return pdfRenderCache.get(key)
}

export function setCachedPdfPageImage(
  filePath: string,
  pageNumber: number,
  scale: number,
  dataUrl: string
): void {
  const key = `${filePath}-${pageNumber}-${scale}`
  pdfRenderCache.set(key, dataUrl)
}

// Background pre-renderer for slide prefetching
export async function prefetchAndCachePdfPage(
  filePath: string,
  pageNumber: number,
  scale: number
): Promise<void> {
  const key = `${filePath}-${pageNumber}-${scale}`
  if (pdfRenderCache.has(key)) return

  try {
    const pdf = await getPdfDocument(filePath)
    if (pageNumber < 1 || pageNumber > pdf.numPages) return

    const page = await pdf.getPage(pageNumber)

    // Calculate aspect ratio matching Fit 1920x1080
    const initialViewport = page.getViewport({ scale: 1 })
    const scaleX = 1920 / initialViewport.width
    const scaleY = 1080 / initialViewport.height
    const fitScale = Math.min(scaleX, scaleY)
    const viewport = page.getViewport({ scale: fitScale * scale })

    // Create an offscreen canvas
    const canvas = document.createElement('canvas')
    canvas.width = viewport.width
    canvas.height = viewport.height
    const context = canvas.getContext('2d')
    if (!context) return

    await page.render({
      canvasContext: context,
      viewport: viewport
    }).promise

    // Convert to compressed JPEG data URL for memory efficiency and speed
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
    pdfRenderCache.set(key, dataUrl)
  } catch (err) {
    console.error('Error pre-rendering PDF page in background:', filePath, pageNumber, err)
  }
}
