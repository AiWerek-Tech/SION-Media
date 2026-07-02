/**
 * Phase 3 — ExportSongDialog
 *
 * Configures export options before exporting songs.
 */

import React, { useState } from 'react'
import { Download } from 'lucide-react'
import { Modal, ModalButton } from './Modal'
import { useModalStore } from '../../store/useModalStore'
import { useAppStore } from '../../store/useAppStore'
import type { Song } from '../../types'

interface ExportSongDialogProps {
  id: string
  /** The songs to export */
  songs: Song[]
}

export function ExportSongDialog({ id, songs }: ExportSongDialogProps): React.JSX.Element {
  const [format, setFormat] = useState<'json' | 'txt'>('json')
  const [loading, setLoading] = useState(false)
  const closeById = useModalStore((s) => s.closeById)
  const showToast = useAppStore((s) => s.showToast)

  const handleExport = async (): Promise<void> => {
    setLoading(true)
    try {
      if (format === 'json') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (window.api.system as any).saveFile(
          JSON.stringify(
            {
              title: `Export ${songs.length} songs`,
              version: 'sion-export-v1',
              exported_at: new Date().toISOString(),
              songs
            },
            null,
            2
          ),
          {
            defaultPath: `sion-export-${songs.length}-songs.json`,
            filters: [{ name: 'JSON', extensions: ['json'] }]
          }
        )
      } else {
        const text = songs
          .map((s) => `=== ${s.number} - ${s.title} ===\n${s.lyrics_raw || ''}`)
          .join('\n\n')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (window.api.system as any).saveFile(text, {
          defaultPath: `sion-export-${songs.length}-songs.txt`,
          filters: [{ name: 'Text File', extensions: ['txt'] }]
        })
      }
      showToast(`${songs.length} lagu berhasil diexport`, 'success')
      closeById(id, true)
    } catch (err) {
      console.error(err)
      showToast('Export gagal', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      id={id}
      title={`Export ${songs.length} Lagu`}
      size="sm"
      dismissible={!loading}
      showClose={!loading}
      footer={
        <>
          <ModalButton variant="secondary" onClick={() => closeById(id, false)} disabled={loading}>
            Batal
          </ModalButton>
          <ModalButton variant="primary" onClick={handleExport} loading={loading}>
            <Download size={14} className="mr-1.5" />
            Export
          </ModalButton>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-[13px] text-text-secondary leading-relaxed">
          Pilih format file untuk mengekspor {songs.length} lagu terpilih. Format JSON dapat diimpor
          kembali ke SION Media.
        </p>
        <div className="flex flex-col gap-2.5">
          <label
            className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all duration-150 active:scale-[0.99] ${
              format === 'json'
                ? 'bg-brand-primary/10 border-brand-primary/30'
                : 'bg-white/[0.01] border-border-subtle hover:bg-white/[0.03]'
            }`}
          >
            <input
              type="radio"
              name="format"
              value="json"
              checked={format === 'json'}
              onChange={() => setFormat('json')}
              className="accent-brand-primary cursor-pointer"
            />
            <div className="flex flex-col">
              <span className="text-[13px] font-bold text-text-primary">SION JSON (.json)</span>
              <span className="text-[11px] text-text-muted mt-0.5">
                Untuk backup dan impor antar device SION.
              </span>
            </div>
          </label>
          <label
            className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all duration-150 active:scale-[0.99] ${
              format === 'txt'
                ? 'bg-brand-primary/10 border-brand-primary/30'
                : 'bg-white/[0.01] border-border-subtle hover:bg-white/[0.03]'
            }`}
          >
            <input
              type="radio"
              name="format"
              value="txt"
              checked={format === 'txt'}
              onChange={() => setFormat('txt')}
              className="accent-brand-primary cursor-pointer"
            />
            <div className="flex flex-col">
              <span className="text-[13px] font-bold text-text-primary">Plain Text (.txt)</span>
              <span className="text-[11px] text-text-muted mt-0.5">
                Hanya teks lirik untuk dibaca atau diprint.
              </span>
            </div>
          </label>
        </div>
      </div>
    </Modal>
  )
}
