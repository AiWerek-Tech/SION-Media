/**
 * Phase 3 — SceneConfigDialog (MM-013)
 *
 * Allows users to customize the 4 live projection scene presets (Atmosphere configurations).
 */

import React, { useState } from 'react'
import { MonitorPlay, Save } from 'lucide-react'
import { Modal, ModalButton } from './Modal'
import { useModalStore } from '../../store/useModalStore'
import { useAppStore } from '../../store/useAppStore'
import { useAtmosphereStore } from '../../store/useAtmosphereStore'

export function SceneConfigDialog({ id }: { id: string }): React.JSX.Element {
  const closeById = useModalStore((s) => s.closeById)
  const showToast = useAppStore((s) => s.showToast)
  const scenePresets = useAtmosphereStore((s) => s.scenePresets)
  const [activePresetId, setActivePresetId] = useState(scenePresets[0]?.id || 'scene-1')

  const handleSave = (): void => {
    // Currently UI only, real logic requires setting scenePresets in store and DB
    showToast('Konfigurasi Atmosphere Preset disimpan', 'success')
    closeById(id)
  }

  return (
    <Modal
      id={id}
      title="Scene Presets (Atmosphere)"
      size="md"
      footer={
        <>
          <ModalButton variant="secondary" onClick={() => closeById(id)}>
            Batal
          </ModalButton>
          <ModalButton variant="primary" onClick={handleSave}>
            <Save size={14} className="mr-1.5" />
            Simpan Presets
          </ModalButton>
        </>
      }
    >
      <div className="flex gap-4 h-[300px]">
        {/* Sidebar */}
        <div className="w-[145px] flex flex-col gap-1 border-r border-border-subtle pr-4">
          {scenePresets.map((preset) => (
            <button
              key={preset.id}
              onClick={() => setActivePresetId(preset.id)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-[12px] font-semibold transition-all duration-150 active:scale-[0.97] ${
                activePresetId === preset.id
                  ? 'bg-brand-primary/10 text-brand-primary border border-brand-primary/20'
                  : 'text-text-muted border border-transparent hover:text-text-primary hover:bg-white/[0.04]'
              }`}
              style={{ cursor: 'pointer' }}
            >
              <MonitorPlay size={14} />
              {preset.name}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin">
          {scenePresets.map((preset) => {
            if (preset.id !== activePresetId) return null
            return (
              <div key={preset.id} className="flex flex-col gap-4 animate-in fade-in duration-200">
                <div>
                  <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1.5">
                    Nama Preset
                  </label>
                  <input type="text" defaultValue={preset.name} className="w-full sp-input" />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1.5">
                    Mode Background
                  </label>
                  <div className="sp-select-wrap">
                    <select
                      defaultValue={preset.config.mode}
                      className="sp-select"
                      style={{ cursor: 'pointer' }}
                    >
                      <option value="solid" className="bg-bg-surface text-text-primary">
                        Solid Color
                      </option>
                      <option value="image" className="bg-bg-surface text-text-primary">
                        Image (Picture)
                      </option>
                      <option value="video" className="bg-bg-surface text-text-primary">
                        Video (Motion)
                      </option>
                    </select>
                  </div>
                </div>

                {preset.config.mode === 'solid' && (
                  <div>
                    <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1.5">
                      Warna
                    </label>
                    <input
                      type="color"
                      defaultValue={preset.config.solidColor || '#000000'}
                      className="w-full h-10 rounded-lg cursor-pointer bg-transparent border border-border-strong"
                    />
                  </div>
                )}

                <div className="p-3 mt-2 rounded-lg bg-white/[0.02] border border-border-subtle flex flex-col items-center justify-center text-center">
                  <p className="text-[11px] text-text-muted">
                    Integrasi Atmosphere Store sedang dalam pengembangan. Preset ini akan mengganti
                    background dan overlay layar secara live (FI-002).
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </Modal>
  )
}
