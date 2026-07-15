import React, { useEffect, useState } from 'react'
import { Music, FolderOpen, AlertCircle, CheckCircle } from 'lucide-react'
import { useInstrumentStore } from '@renderer/store/useInstrumentStore'

interface AudioSettingsProps {
  settings: Record<string, string>
  updateSetting: (key: string, value: string) => Promise<void>
}

export function AudioSettings({ settings, updateSetting }: AudioSettingsProps): React.JSX.Element {
  const { scanFolder, instrumentsMap } = useInstrumentStore()
  const [folderPath, setFolderPath] = useState(settings.song_instrument_folder || '')
  const [count, setCount] = useState(Object.keys(instrumentsMap).length)
  const [isScanning, setIsScanning] = useState(false)

  // Rescan if settings load initially
  useEffect(() => {
    const initialFolder = settings.song_instrument_folder || ''
    void Promise.resolve().then(() => {
      setFolderPath(initialFolder)
      if (initialFolder) {
        setIsScanning(true)
        scanFolder(initialFolder)
          .then((n) => setCount(n))
          .finally(() => setIsScanning(false))
      }
    })
  }, [settings.song_instrument_folder, scanFolder])

  const handleSelectFolder = async (): Promise<void> => {
    try {
      const result = (await window.api.file.showOpenDialog({
        title: 'Pilih Folder Instrumen Musik',
        properties: ['openDirectory']
      })) as { canceled: boolean; filePaths: string[] }

      if (result.canceled || result.filePaths.length === 0) return

      const path = result.filePaths[0]
      setFolderPath(path)
      setIsScanning(true)

      // Save to database
      await updateSetting('song_instrument_folder', path)

      // Index folder files
      const numMatched = await scanFolder(path)
      setCount(numMatched)
    } catch (err) {
      console.error('Error selecting folder:', err)
    } finally {
      setIsScanning(false)
    }
  }

  const handleClearFolder = async (): Promise<void> => {
    setFolderPath('')
    setCount(0)
    await updateSetting('song_instrument_folder', '')
    await scanFolder('')
  }

  return (
    <div className="sp-root flex flex-col gap-6">
      <div className="sp-page-header">
        <h2 className="sp-page-title">Musik &amp; Audio</h2>
        <p className="sp-page-subtitle">Konfigurasi musik pengiring instrumen lirik lagu ibadah.</p>
      </div>

      <div className="flex flex-col gap-4 p-5 rounded-xl border border-white/[0.04] bg-white/[0.01]">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-lg bg-brand-primary/10 text-brand-primary flex-shrink-0">
            <Music size={24} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-text-primary">
              Folder Instrumen Musik (*Backing Tracks*)
            </h3>
            <p className="text-xs text-text-disabled mt-1 leading-relaxed">
              Pilih folder lokal di komputer Anda tempat file audio instrumen disimpan. Sistem akan
              memetakan file MP3/WAV secara otomatis ke nomor lagu (misal: KJ 10.mp3 ke Kidung
              Jemaat No. 10).
            </p>
          </div>
        </div>

        {folderPath ? (
          <div className="flex flex-col gap-3.5 p-4 rounded-lg border border-white/[0.06] bg-black/30 mt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-md bg-brand-primary/10 text-brand-primary flex-shrink-0">
                  <FolderOpen size={16} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-text-disabled">
                    Path Folder Aktif
                  </span>
                  <span className="text-xs font-mono text-text-secondary select-all break-all pr-2 mt-0.5">
                    {folderPath}
                  </span>
                </div>
              </div>
              <div className="flex gap-2 self-end sm:self-center flex-shrink-0">
                <button
                  onClick={handleSelectFolder}
                  className="h-8.5 px-3 rounded-lg bg-brand-primary hover:bg-brand-primary-hover active:scale-95 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md"
                >
                  Ubah
                </button>
                <button
                  onClick={handleClearFolder}
                  className="h-8.5 px-3 rounded-lg bg-white/5 hover:bg-white/10 active:scale-95 text-text-secondary hover:text-red-400 hover:bg-red-500/10 text-xs font-semibold transition-all"
                >
                  Hapus
                </button>
              </div>
            </div>

            {/* Scan Status */}
            <div className="pt-2.5 border-t border-white/[0.04] flex items-center gap-2 text-xs">
              {isScanning ? (
                <div className="flex items-center gap-2 text-text-disabled">
                  <div className="w-3.5 h-3.5 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
                  <span>Memindai berkas audio...</span>
                </div>
              ) : count > 0 ? (
                <div className="flex items-center gap-2 text-emerald-400 font-medium">
                  <CheckCircle size={14} className="text-emerald-400" />
                  <span>Berhasil mengindeks {count} file instrumen lagu.</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-amber-400 font-medium">
                  <AlertCircle size={14} className="text-amber-400" />
                  <span>
                    Folder terbaca, tetapi tidak menemukan berkas instrumen musik yang cocok.
                  </span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-6 border border-dashed border-white/[0.12] rounded-lg bg-black/10 text-center gap-3 mt-2">
            <div className="p-3.5 rounded-full bg-white/[0.03] text-text-disabled">
              <FolderOpen size={28} />
            </div>
            <div className="flex flex-col gap-1 max-w-sm">
              <span className="text-xs font-semibold text-text-primary">
                Belum Ada Folder Terpilih
              </span>
              <span className="text-[11px] text-text-disabled leading-normal">
                Pilih folder tempat file minus-one/instrumental diletakkan agar otomatis terdeteksi
                dalam rundown ibadah.
              </span>
            </div>
            <button
              onClick={handleSelectFolder}
              className="h-9 px-4 rounded-lg bg-brand-primary hover:bg-brand-primary-hover active:scale-95 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md mt-1"
            >
              <FolderOpen size={14} />
              <span>Pilih Folder Instrumen</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
