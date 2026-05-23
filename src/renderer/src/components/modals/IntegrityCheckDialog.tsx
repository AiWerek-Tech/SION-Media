import React, { useState, useEffect } from 'react'
import { Modal, ModalButton } from './Modal'
import { useModalStore } from '../../store/useModalStore'
import { logger } from '../../utils/logger'

interface IntegrityCheckDialogProps {
  id: string
}

interface OrphanSong {
  id: number
  number?: string
  title: string
}

interface DuplicateDetail {
  number?: string
  count: number
}

interface TitleDuplicateDetail {
  title: string
  count: number
}

interface HymnalIntegrityReport {
  hymnal_id: number
  hymnal_code: string
  hymnal_name: string
  song_count: number
  duplicate_numbers: number
  duplicate_titles: number
  topDupeNumbers?: DuplicateDetail[]
  topDupeTitles?: TitleDuplicateDetail[]
}

interface IntegrityReport {
  totalHymnals: number
  totalSongs: number
  orphanSongs: number
  orphanSample: OrphanSong[]
  hymnals: HymnalIntegrityReport[]
}

export function IntegrityCheckDialog({ id }: IntegrityCheckDialogProps): React.JSX.Element {
  const close = useModalStore((s) => s.close)
  const [isLoading, setIsLoading] = useState(true)
  const [report, setReport] = useState<IntegrityReport | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    async function fetchReport(): Promise<void> {
      try {
        const data = (await window.api.system.checkMultiHymnalIntegrity()) as IntegrityReport
        if (mounted) {
          setReport(data)
          setIsLoading(false)
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : String(err))
          setIsLoading(false)
        }
      }
    }
    fetchReport().catch(logger.error)
    return () => {
      mounted = false
    }
  }, [])

  return (
    <Modal
      id={id}
      title="Analisis Integritas Database"
      size="lg"
      footer={
        <ModalButton variant="primary" onClick={() => close(id)}>
          Tutup
        </ModalButton>
      }
    >
      <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
        {isLoading && <p className="text-zinc-400">Menganalisis database...</p>}

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg text-sm">
            {error}
          </div>
        )}

        {!isLoading && report && (
          <div className="space-y-6 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-zinc-900 border border-white/10 rounded-lg">
                <h4 className="text-zinc-400 mb-1">Total Hymnal</h4>
                <p className="text-2xl font-semibold text-zinc-100">{report.totalHymnals}</p>
              </div>
              <div className="p-4 bg-zinc-900 border border-white/10 rounded-lg">
                <h4 className="text-zinc-400 mb-1">Total Lagu</h4>
                <p className="text-2xl font-semibold text-zinc-100">{report.totalSongs}</p>
              </div>
            </div>

            {report.orphanSongs > 0 && (
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <h4 className="text-amber-400 font-medium mb-2">
                  Lagu Yatim Piatu (Orphan Songs): {report.orphanSongs}
                </h4>
                <p className="text-zinc-400 mb-2">
                  Lagu-lagu ini tidak memiliki hymnal yang valid:
                </p>
                <ul className="list-disc pl-5 text-zinc-300">
                  {report.orphanSample.map((s) => (
                    <li key={s.id}>
                      [{s.id}] {s.number ? `${s.number} - ` : ''}
                      {s.title}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="space-y-4">
              <h3 className="text-lg font-medium text-zinc-100 border-b border-white/10 pb-2">
                Detail per Hymnal
              </h3>

              {report.hymnals.map((h) => (
                <div
                  key={h.hymnal_id}
                  className="p-4 bg-zinc-900/50 border border-white/5 rounded-lg space-y-3"
                >
                  <div className="flex justify-between items-center">
                    <h4 className="text-zinc-200 font-medium">
                      {h.hymnal_code} - {h.hymnal_name}
                    </h4>
                    <span className="text-zinc-500">{h.song_count} lagu</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-zinc-400 mb-1">
                        Duplikasi Nomor:{' '}
                        <strong
                          className={h.duplicate_numbers > 0 ? 'text-amber-400' : 'text-zinc-300'}
                        >
                          {h.duplicate_numbers}
                        </strong>
                      </p>
                      {h.topDupeNumbers && h.topDupeNumbers.length > 0 && (
                        <ul className="text-xs text-zinc-500 pl-4 list-disc mt-1">
                          {h.topDupeNumbers.map((dn) => (
                            <li key={dn.number}>
                              Nomor {dn.number} ({dn.count}x)
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div>
                      <p className="text-zinc-400 mb-1">
                        Duplikasi Judul:{' '}
                        <strong
                          className={h.duplicate_titles > 0 ? 'text-amber-400' : 'text-zinc-300'}
                        >
                          {h.duplicate_titles}
                        </strong>
                      </p>
                      {h.topDupeTitles && h.topDupeTitles.length > 0 && (
                        <ul className="text-xs text-zinc-500 pl-4 list-disc mt-1">
                          {h.topDupeTitles.map((dt) => (
                            <li key={dt.title}>
                              {dt.title} ({dt.count}x)
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
