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
      <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 scrollbar-thin">
        {isLoading && <p className="text-text-muted">Menganalisis database...</p>}

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-sm">
            {error}
          </div>
        )}

        {!isLoading && report && (
          <div className="space-y-6 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div className="sp-modal-card">
                <h4 className="text-text-muted text-xs font-semibold mb-1">Total Hymnal</h4>
                <p className="text-2xl font-bold text-text-primary">{report.totalHymnals}</p>
              </div>
              <div className="sp-modal-card">
                <h4 className="text-text-muted text-xs font-semibold mb-1">Total Lagu</h4>
                <p className="text-2xl font-bold text-text-primary">{report.totalSongs}</p>
              </div>
            </div>

            {report.orphanSongs > 0 && (
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                <h4 className="text-amber-400 font-bold mb-2">
                  Lagu Yatim Piatu (Orphan Songs): {report.orphanSongs}
                </h4>
                <p className="text-text-secondary mb-2 text-xs">
                  Lagu-lagu ini tidak memiliki hymnal yang valid:
                </p>
                <ul className="list-disc pl-5 text-text-primary text-xs space-y-1">
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
              <h3 className="text-[14px] font-bold text-text-primary border-b border-border-subtle pb-2 uppercase tracking-wider">
                Detail per Hymnal
              </h3>

              {report.hymnals.map((h) => (
                <div key={h.hymnal_id} className="sp-modal-card space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="text-text-primary font-bold">
                      {h.hymnal_code} - {h.hymnal_name}
                    </h4>
                    <span className="text-text-muted text-xs font-semibold">
                      {h.song_count} lagu
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-text-secondary text-xs mb-1">
                        Duplikasi Nomor:{' '}
                        <strong
                          className={
                            h.duplicate_numbers > 0
                              ? 'text-amber-400 font-bold'
                              : 'text-text-primary font-semibold'
                          }
                        >
                          {h.duplicate_numbers}
                        </strong>
                      </p>
                      {h.topDupeNumbers && h.topDupeNumbers.length > 0 && (
                        <ul className="text-[11px] text-text-muted pl-4 list-disc mt-1 space-y-0.5">
                          {h.topDupeNumbers.map((dn) => (
                            <li key={dn.number}>
                              Nomor {dn.number} ({dn.count}x)
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div>
                      <p className="text-text-secondary text-xs mb-1">
                        Duplikasi Judul:{' '}
                        <strong
                          className={
                            h.duplicate_titles > 0
                              ? 'text-amber-400 font-bold'
                              : 'text-text-primary font-semibold'
                          }
                        >
                          {h.duplicate_titles}
                        </strong>
                      </p>
                      {h.topDupeTitles && h.topDupeTitles.length > 0 && (
                        <ul className="text-[11px] text-text-muted pl-4 list-disc mt-1 space-y-0.5">
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
