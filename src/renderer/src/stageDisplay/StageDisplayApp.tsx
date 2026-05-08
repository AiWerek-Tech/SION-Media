import React, { useState, useEffect } from 'react'
import { Clock } from 'lucide-react'

interface SlideData {
  songId: number
  slideIndex: number
  text: string
  sectionLabel: string
  nextSlideText?: string
}

export function StageDisplayApp(): React.JSX.Element {
  const [currentSlide, setCurrentSlide] = useState<SlideData | null>(null)
  const [projectionState, setProjectionState] = useState('CLEAR')
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    // Sync time
    const timer = setInterval(() => setTime(new Date()), 1000)

    // Listen for slide updates
    const unsubscribeSlide = window.api.projection.onSlideUpdate((data) => {
      setCurrentSlide(data as SlideData)
    })

    // Listen for state changes
    const unsubscribeState = window.api.projection.onStateChange((state) => {
      setProjectionState(state)
    })

    return () => {
      clearInterval(timer)
      unsubscribeSlide()
      unsubscribeState()
    }
  }, [])

  const isLive = projectionState === 'LIVE' || projectionState === 'FREEZE'

  return (
    <div className="h-screen w-screen bg-black text-white flex flex-col overflow-hidden font-sans">
      {/* Top Bar: Clock & Status */}
      <div className="h-20 flex items-center justify-between px-10 border-b border-white/10 bg-zinc-900/50">
        <div className="flex items-center gap-4">
          <Clock className="text-brand-accent" size={32} />
          <span className="text-4xl font-bold tracking-tight tabular-nums">
            {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div
            className={`w-4 h-4 rounded-full ${isLive ? 'bg-red-500 animate-pulse' : 'bg-zinc-700'}`}
          />
          <span
            className={`text-2xl font-bold uppercase tracking-widest ${isLive ? 'text-red-500' : 'text-zinc-500'}`}
          >
            {isLive ? 'LIVE' : 'STANDBY'}
          </span>
        </div>
      </div>

      {/* Main Content: Large Lyrics */}
      <div className="flex-1 flex flex-col items-center justify-center px-12 text-center">
        {isLive && currentSlide ? (
          <div className="w-full max-w-6xl space-y-12">
            {/* Current Slide */}
            <div>
              {currentSlide.sectionLabel && (
                <p className="text-brand-accent text-3xl font-black uppercase tracking-[0.3em] mb-6 opacity-80">
                  {currentSlide.sectionLabel}
                </p>
              )}
              <p className="text-7xl lg:text-8xl font-bold leading-tight whitespace-pre-line drop-shadow-2xl">
                {currentSlide.text}
              </p>
            </div>

            {/* Next Slide Preview */}
            {currentSlide.nextSlideText && (
              <div className="pt-8 border-t border-white/10">
                <p className="text-zinc-500 text-xl font-bold uppercase tracking-[0.2em] mb-4">
                  NEXT SLIDE:
                </p>
                <p className="text-4xl text-zinc-400 font-medium leading-relaxed italic line-clamp-2">
                  {currentSlide.nextSlideText}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-zinc-800 text-6xl font-black uppercase tracking-tighter select-none">
            SION MEDIA
          </div>
        )}
      </div>

      {/* Footer: Current Slide Info */}
      <div className="h-16 bg-zinc-900/80 border-t border-white/5 flex items-center px-10">
        {currentSlide && (
          <span className="text-zinc-500 text-xl font-medium">
            Slide {currentSlide.slideIndex + 1}
          </span>
        )}
      </div>
    </div>
  )
}
