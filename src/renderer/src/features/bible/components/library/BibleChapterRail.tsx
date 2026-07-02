/**
 * BibleChapterRail — Horizontal chapter pill selector.
 *
 * Active chapter with blue glow, dark pills for rest,
 * horizontal scroll with gradient fade masks.
 */

import React, { useEffect, useRef } from 'react'
import { Sparkles } from 'lucide-react'

interface BibleChapterRailProps {
  totalChapters: number
  selectedChapter: number
  onSelectChapter: (chapter: number) => void
}

export function BibleChapterRail({
  totalChapters,
  selectedChapter,
  onSelectChapter
}: BibleChapterRailProps): React.JSX.Element {
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll active chapter into view
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const activeBtn = el.querySelector('[data-active="true"]') as HTMLElement | null
    if (activeBtn) {
      activeBtn.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' })
    }
  }, [selectedChapter])

  return (
    <div className="bible-chapter-rail">
      <div className="bible-chapter-rail__icon">
        <Sparkles size={14} />
      </div>
      <div className="bible-chapter-rail__scroll" ref={scrollRef}>
        {Array.from({ length: totalChapters }, (_, i) => i + 1).map((ch) => {
          const active = selectedChapter === ch
          return (
            <button
              key={ch}
              data-active={active ? 'true' : undefined}
              onClick={() => onSelectChapter(ch)}
              className={`bible-chapter-rail__pill ${active ? 'is-active' : ''}`}
              title={`Pasal ${ch}`}
            >
              {ch}
            </button>
          )
        })}
      </div>
      {totalChapters > 20 && (
        <div className="bible-chapter-rail__more" title="Scroll untuk pasal lainnya">
          ···
        </div>
      )}
    </div>
  )
}
