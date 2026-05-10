import React from 'react'

interface TimelineItemProps {
  index: number
  label?: string | null
  excerpt: string
  lineCount: number
  isActive: boolean
  onClick: () => void
  thumbnailBg?: string
  thumbnailImage?: string | null
}

export function TimelineItem({
  index,
  label,
  excerpt,
  lineCount,
  isActive,
  onClick,
  thumbnailBg = '#0f0f1a',
  thumbnailImage = null
}: TimelineItemProps): React.JSX.Element {
  return (
    <button
      onClick={onClick}
      className={`
        w-full text-left rounded-2xl
        transition-all duration-200 ease-out
        active:scale-[0.99] group
        ${
          isActive
            ? 'bg-brand-primary/10 shadow-[0_18px_50px_rgba(0,0,0,0.35)] ring-1 ring-brand-primary/25'
            : 'bg-white/[0.03] hover:bg-white/[0.05] ring-1 ring-white/10 hover:ring-white/15'
        }
      `}
    >
      <div className="flex items-center gap-4 px-4 py-3.5">
        <div className="shrink-0 flex items-center gap-3">
          <div
            className={`
              w-8 h-8 rounded-xl flex items-center justify-center
              text-[11px] font-black tabular-nums transition-colors
              ${
                isActive
                  ? 'bg-brand-primary/20 text-brand-primary'
                  : 'bg-black/20 text-text-muted group-hover:text-text-secondary'
              }
            `}
          >
            {index + 1}
          </div>

          <div
            className={`
              relative w-16 aspect-video rounded-lg overflow-hidden
              transition-transform duration-300
              ${isActive ? 'scale-[1.02]' : 'group-hover:scale-[1.02]'}
            `}
          >
            <div className="absolute inset-0 bg-black" />
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundColor: thumbnailBg,
                backgroundImage: thumbnailImage ? `url(${thumbnailImage})` : 'none',
                opacity: 0.55
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/10 to-black/60" />
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex items-center gap-2">
              {label && (
                <span
                  className={`
                    shrink-0 px-2 py-0.5 rounded-md
                    text-[10px] font-bold uppercase tracking-wider
                    transition-colors
                    ${
                      isActive
                        ? 'bg-brand-secondary/15 text-brand-secondary'
                        : 'bg-white/5 text-text-muted'
                    }
                  `}
                >
                  {label}
                </span>
              )}
              <span
                className={`
                  truncate text-[12px] font-semibold transition-colors
                  ${isActive ? 'text-text-primary' : 'text-text-secondary group-hover:text-text-primary'}
                `}
              >
                {excerpt || 'Slide kosong'}
              </span>
            </div>

            <div
              className={`
                shrink-0 text-[10px] font-bold uppercase tracking-wider transition-colors
                ${isActive ? 'text-brand-primary' : 'text-text-disabled'}
              `}
            >
              {lineCount} baris
            </div>
          </div>

          <div className="mt-2 h-px bg-white/5" />
        </div>
      </div>
    </button>
  )
}
