import React from 'react'
import { Settings, Database, UploadCloud } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'

export function ManagementMode(): React.JSX.Element {
  const { setScreen } = useAppStore()

  return (
    <div className="h-full w-full bg-bg-base text-text-primary p-8 overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-h2 mb-2">Content Management</h1>
        <p className="text-text-muted mb-8">
          Pusat pengelolaan database lagu, buku lagu, sinkronisasi, dan konfigurasi aplikasi.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <button
            onClick={() => setScreen('song-editor')}
            className="flex flex-col items-center text-center p-8 rounded-2xl bg-bg-surface border border-border-default hover:border-brand-primary hover:bg-bg-elevated transition-all group"
          >
            <div className="h-16 w-16 bg-brand-primary/10 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Database size={32} className="text-brand-primary" />
            </div>
            <h3 className="text-h3 mb-2">Editor Lagu & Buku Lagu</h3>
            <p className="text-sm text-text-muted">
              Tambah, edit, atau hapus lagu dari database. Atur struktur koleksi buku lagu Anda di sini.
            </p>
          </button>

          <button
            onClick={() => setScreen('import-export')}
            className="flex flex-col items-center text-center p-8 rounded-2xl bg-bg-surface border border-border-default hover:border-brand-secondary hover:bg-bg-elevated transition-all group"
          >
            <div className="h-16 w-16 bg-brand-secondary/10 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <UploadCloud size={32} className="text-brand-secondary" />
            </div>
            <h3 className="text-h3 mb-2">Import / Export</h3>
            <p className="text-sm text-text-muted">
              Backup seluruh database Anda atau impor lagu baru dari format JSON maupun Excel.
            </p>
          </button>

          <button
            onClick={() => setScreen('settings')}
            className="flex flex-col items-center text-center p-8 rounded-2xl bg-bg-surface border border-border-default hover:border-text-primary hover:bg-bg-elevated transition-all group md:col-span-2"
          >
            <div className="h-16 w-16 bg-text-primary/5 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Settings size={32} className="text-text-primary" />
            </div>
            <h3 className="text-h3 mb-2">Pengaturan Sistem</h3>
            <p className="text-sm text-text-muted max-w-xl mx-auto">
              Konfigurasi tampilan proyektor, tema font, warna latar, dan preferensi aplikasi SION Media secara umum.
            </p>
          </button>
        </div>
      </div>
    </div>
  )
}
