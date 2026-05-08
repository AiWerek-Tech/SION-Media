import React from 'react'
import { motion } from 'framer-motion'
import { MonitorPlay, Library, LayoutDashboard, Settings } from 'lucide-react'
import { useModeStore, AppMode } from '../../store/useModeStore'

export function WelcomeModeSelector(): React.JSX.Element {
  const { completeFirstInstall } = useModeStore()

  const handleSelectMode = (mode: AppMode): void => {
    completeFirstInstall(mode)
  }

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-bg-base p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-12 max-w-2xl"
      >
        <div className="flex justify-center mb-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-brand-primary/10 border border-brand-primary/20 shadow-2xl shadow-brand-primary/10">
            <MonitorPlay size={40} className="text-brand-primary" />
          </div>
        </div>
        <h1 className="text-h1 mb-4">Selamat Datang di SION Media</h1>
        <p className="text-text-secondary text-lg">
          Platform Presentasi Ibadah Profesional. Silakan pilih mode operasional yang sesuai dengan
          kebutuhan Anda saat ini.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-6xl">
        {/* PROJECTION MODE */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          onClick={() => handleSelectMode('PROJECTION')}
          className="group relative flex flex-col items-center p-8 rounded-3xl bg-bg-surface/30 border border-border-default hover:border-brand-primary hover:bg-brand-primary/5 transition-all duration-300 text-left overflow-hidden h-full"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-brand-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="h-16 w-16 rounded-2xl bg-bg-elevated flex items-center justify-center mb-6 shadow-inner group-hover:scale-110 group-hover:shadow-brand-primary/20 transition-all duration-300">
            <MonitorPlay size={32} className="text-brand-primary" />
          </div>
          <h3 className="text-h3 mb-3 text-center w-full">Projection Mode</h3>
          <p className="text-sm text-text-muted text-center leading-relaxed">
            Mode standar dengan kontrol dual-screen (Preview/Program) untuk operator LCD ibadah.
          </p>
        </motion.button>

        {/* LIBRARY MODE */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          onClick={() => handleSelectMode('LIBRARY')}
          className="group relative flex flex-col items-center p-8 rounded-3xl bg-bg-surface/30 border border-border-default hover:border-brand-secondary hover:bg-brand-secondary/5 transition-all duration-300 text-left overflow-hidden h-full"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-brand-secondary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="h-16 w-16 rounded-2xl bg-bg-elevated flex items-center justify-center mb-6 shadow-inner group-hover:scale-110 group-hover:shadow-brand-secondary/20 transition-all duration-300">
            <Library size={32} className="text-brand-secondary" />
          </div>
          <h3 className="text-h3 mb-3 text-center w-full">Library Mode</h3>
          <p className="text-sm text-text-muted text-center leading-relaxed">
            Layar tunggal sederhana untuk sekadar mencari lirik atau menyusun daftar lagu tanpa
            menampilkan ke proyektor.
          </p>
        </motion.button>

        {/* BROADCAST MODE */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          onClick={() => handleSelectMode('BROADCAST')}
          className="group relative flex flex-col items-center p-8 rounded-3xl bg-bg-surface/30 border border-border-default hover:border-status-warning hover:bg-status-warning/5 transition-all duration-300 text-left overflow-hidden h-full"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-status-warning/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="h-16 w-16 rounded-2xl bg-bg-elevated flex items-center justify-center mb-6 shadow-inner group-hover:scale-110 group-hover:shadow-status-warning/20 transition-all duration-300">
            <LayoutDashboard size={32} className="text-status-warning" />
          </div>
          <h3 className="text-h3 mb-3 text-center w-full">Broadcast Mode</h3>
          <p className="text-sm text-text-muted text-center leading-relaxed">
            Mode canggih untuk integrasi ke OBS/vMix via NDI & koneksi Stage Display. (Fitur Beta)
          </p>
        </motion.button>

        {/* MANAGEMENT MODE */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          onClick={() => handleSelectMode('MANAGEMENT')}
          className="group relative flex flex-col items-center p-8 rounded-3xl bg-bg-surface/30 border border-border-default hover:border-text-primary hover:bg-text-primary/5 transition-all duration-300 text-left overflow-hidden h-full"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-text-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="h-16 w-16 rounded-2xl bg-bg-elevated flex items-center justify-center mb-6 shadow-inner group-hover:scale-110 transition-all duration-300">
            <Settings size={32} className="text-text-primary" />
          </div>
          <h3 className="text-h3 mb-3 text-center w-full">Content Management</h3>
          <p className="text-sm text-text-muted text-center leading-relaxed">
            Mode administratif untuk mengatur database lagu, sinkronisasi, dan konfigurasi buku
            lagu.
          </p>
        </motion.button>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mt-12 text-xs text-text-disabled"
      >
        Anda dapat mengubah mode ini kapan saja melalui menu Dropdown di Title Bar.
      </motion.div>
    </div>
  )
}
