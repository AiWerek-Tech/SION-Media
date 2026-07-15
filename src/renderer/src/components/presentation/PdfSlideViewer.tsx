import React, { useEffect, useRef, useState } from 'react'
import type * as pdfjsLib from 'pdfjs-dist'
import {
  getPdfDocument,
  getCachedPdfPageImage,
  setCachedPdfPageImage,
  prefetchAndCachePdfPage
} from '@renderer/utils/pdfUtils'

interface PdfSlideViewerProps {
  pdfPath: string
  pageNumber: number // 1-based
}

export function PdfSlideViewer({ pdfPath, pageNumber }: PdfSlideViewerProps): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [cachedImage, setCachedImage] = useState<string | null>(() => {
    return getCachedPdfPageImage(pdfPath, pageNumber, 1.5) || null
  })
  const currentRenderTaskRef = useRef<ReturnType<pdfjsLib.PDFPageProxy['render']> | null>(null)

  useEffect(() => {
    let active = true
    let loadingTimeout: ReturnType<typeof setTimeout> | null = null

    // Only set loading timeout if we don't have a cached image to show
    if (!cachedImage) {
      loadingTimeout = setTimeout(() => {
        if (active) {
          setIsLoading(true)
        }
      }, 150)
    }

    const renderPage = async (): Promise<void> => {
      try {
        if (active) {
          setError(null)
        }

        const pdf = await getPdfDocument(pdfPath)
        if (!active) return

        if (pageNumber < 1 || pageNumber > pdf.numPages) {
          throw new Error(`PDF page ${pageNumber} is outside document range.`)
        }

        const page = await pdf.getPage(pageNumber)
        if (!active) return

        // Check if cached version exists (safety check if cached while rendering was triggered)
        const cachedUrl = getCachedPdfPageImage(pdfPath, pageNumber, 1.5)
        if (cachedUrl) {
          if (active) {
            setCachedImage(cachedUrl)
            if (loadingTimeout) clearTimeout(loadingTimeout)
            setIsLoading(false)
          }
          // Prefetch adjacent pages in the background
          prefetchAndCachePdfPage(pdfPath, pageNumber + 1, 1.5).catch(() => {})
          prefetchAndCachePdfPage(pdfPath, pageNumber - 1, 1.5).catch(() => {})
          return
        }

        const canvas = canvasRef.current
        if (!canvas) return

        const context = canvas.getContext('2d')
        if (!context) return

        // Aspect ratio calculations
        const initialViewport = page.getViewport({ scale: 1 })
        const scaleX = 1920 / initialViewport.width
        const scaleY = 1080 / initialViewport.height
        const scale = Math.min(scaleX, scaleY)
        const viewport = page.getViewport({ scale: scale * 1.5 })

        canvas.width = viewport.width
        canvas.height = viewport.height

        if (currentRenderTaskRef.current) {
          try {
            currentRenderTaskRef.current.cancel()
          } catch {
            // Already cancelled or finished
          }
        }

        const renderContext = {
          canvasContext: context,
          viewport: viewport
        }

        const renderTask = page.render(renderContext)
        currentRenderTaskRef.current = renderTask

        await renderTask.promise
        currentRenderTaskRef.current = null

        if (active) {
          if (loadingTimeout) clearTimeout(loadingTimeout)
          setIsLoading(false)

          // Save the rendered page to cache for instantaneous future loads
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
          setCachedPdfPageImage(pdfPath, pageNumber, 1.5, dataUrl)
          setCachedImage(dataUrl)
        }

        // Prefetch adjacent pages in the background
        prefetchAndCachePdfPage(pdfPath, pageNumber + 1, 1.5).catch(() => {})
        prefetchAndCachePdfPage(pdfPath, pageNumber - 1, 1.5).catch(() => {})
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err)
        const name = err instanceof Error ? err.name : ''
        if (name === 'RenderingCancelledException' || message.includes('cancelled')) return
        console.error('Error rendering PDF slide:', err)
        if (active) {
          if (loadingTimeout) clearTimeout(loadingTimeout)
          setError('Gagal memuat halaman presentasi')
          setIsLoading(false)
        }
      }
    }

    renderPage()

    return () => {
      active = false
      if (loadingTimeout) {
        clearTimeout(loadingTimeout)
      }
      if (currentRenderTaskRef.current) {
        try {
          currentRenderTaskRef.current.cancel()
        } catch {
          // Already cancelled
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfPath, pageNumber])

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black">
      {isLoading && !cachedImage && (
        <div className="absolute text-white text-[24px] font-semibold opacity-60">
          Memuat Slide...
        </div>
      )}
      {error && <div className="absolute text-status-error text-[24px] font-semibold">{error}</div>}

      {cachedImage ? (
        <img
          src={cachedImage}
          alt={`PDF Page ${pageNumber}`}
          className="max-w-full max-h-full object-contain w-full h-full"
        />
      ) : (
        <canvas
          ref={canvasRef}
          className="max-w-full max-h-full object-contain"
          style={{ width: '100%', height: '100%' }}
        />
      )}
    </div>
  )
}
