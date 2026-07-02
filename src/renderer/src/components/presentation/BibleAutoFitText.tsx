import React, { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { doesContentFit, findLargestFittingFontSize } from './bibleAutoFit'

interface BibleAutoFitTextProps {
  text: string
  reference?: string
  copyright?: string
  requestedFontSize: number
  minimumFontSize?: number
  availableHeight: number
  fontFamily: string
  fontWeight: number
  lineHeight: number
  textColor: string
  textAlign: React.CSSProperties['textAlign']
  textShadow: string
  textOutline: boolean
}

export function BibleAutoFitText({
  text,
  reference,
  copyright,
  requestedFontSize,
  minimumFontSize = 32,
  availableHeight,
  fontFamily,
  fontWeight,
  lineHeight,
  textColor,
  textAlign,
  textShadow,
  textOutline
}: BibleAutoFitTextProps): React.JSX.Element {
  const viewportRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const bodyRef = useRef<HTMLParagraphElement>(null)
  const referenceRef = useRef<HTMLDivElement>(null)
  const copyrightRef = useRef<HTMLDivElement>(null)
  const [fittedFontSize, setFittedFontSize] = useState(requestedFontSize)

  const applyMeasuredSize = useCallback((size: number): void => {
    if (bodyRef.current) bodyRef.current.style.fontSize = `${size}px`
    if (referenceRef.current) referenceRef.current.style.fontSize = `${Math.max(18, size * 0.34)}px`
    if (copyrightRef.current) copyrightRef.current.style.fontSize = `${Math.max(14, size * 0.22)}px`
  }, [])

  const fitText = useCallback((): void => {
    const viewport = viewportRef.current
    const content = contentRef.current
    if (!viewport || !content || viewport.clientWidth === 0 || viewport.clientHeight === 0) return

    const fitted = findLargestFittingFontSize(requestedFontSize, minimumFontSize, (candidate) => {
      applyMeasuredSize(candidate)
      return doesContentFit({
        contentScrollWidth: content.scrollWidth,
        contentScrollHeight: content.scrollHeight,
        viewportWidth: viewport.clientWidth,
        viewportHeight: viewport.clientHeight
      })
    })
    applyMeasuredSize(fitted)
    setFittedFontSize(fitted)
  }, [applyMeasuredSize, minimumFontSize, requestedFontSize])

  useLayoutEffect(() => {
    fitText()
    const viewport = viewportRef.current
    if (!viewport) return undefined
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(fitText)
    observer?.observe(viewport)
    document.fonts?.ready.then(fitText).catch(() => {})
    return () => observer?.disconnect()
  }, [fitText, text, reference, copyright])

  return (
    <div
      ref={viewportRef}
      data-testid="bible-auto-fit-viewport"
      data-requested-font-size={Math.round(requestedFontSize)}
      data-fitted-font-size={Math.round(fittedFontSize)}
      style={{
        width: '100%',
        height: availableHeight,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden'
      }}
    >
      <div ref={contentRef} style={{ width: '100%', textAlign }}>
        <p
          ref={bodyRef}
          data-testid="bible-slide-body"
          style={{
            margin: 0,
            color: textColor,
            fontFamily: `var(--font-heading), ${fontFamily}`,
            fontSize: fittedFontSize,
            fontWeight,
            letterSpacing: 0,
            lineHeight,
            whiteSpace: 'pre-line',
            overflowWrap: 'break-word',
            textAlign,
            textShadow,
            WebkitTextStroke: textOutline ? '2px rgba(0,0,0,0.58)' : undefined
          }}
        >
          {text.split(/(\[\d+\])/g).map((part, index) =>
            part.match(/\[\d+\]/) ? (
              <sup key={index} style={{ fontSize: '0.55em', opacity: 0.82, marginRight: '6px' }}>
                {part.replace(/\[|\]/g, '')}
              </sup>
            ) : (
              <span key={index}>{part}</span>
            )
          )}
        </p>

        {reference && (
          <div
            ref={referenceRef}
            data-testid="bible-slide-reference"
            style={{
              marginTop: Math.max(20, fittedFontSize * 0.34),
              color: 'rgba(255,255,255,0.9)',
              fontFamily,
              fontSize: Math.max(18, fittedFontSize * 0.34),
              fontWeight: 800,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              textAlign,
              textShadow
            }}
          >
            — {reference} —
          </div>
        )}

        {copyright && (
          <div
            ref={copyrightRef}
            style={{
              marginTop: 10,
              color: 'rgba(255,255,255,0.42)',
              fontFamily,
              fontSize: Math.max(14, fittedFontSize * 0.22),
              fontWeight: 500,
              textAlign,
              textShadow
            }}
          >
            {copyright}
          </div>
        )}
      </div>
    </div>
  )
}
