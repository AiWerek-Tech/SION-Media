/**
 * Phase 3 — TagManagerDialog (MM-014)
 *
 * Manages song taxonomy (Tags & Categories).
 * Extracts unique tags from all songs and provides a UI to view and manage them.
 */

import React, { useMemo, useState } from 'react'
import { Hash, Tag, Edit3, Trash2, Search } from 'lucide-react'
import { Modal, ModalButton } from './Modal'
import { useModalStore } from '../../store/useModalStore'
import { useAppStore } from '../../store/useAppStore'

interface TagItem {
  name: string
  count: number
  type: 'category' | 'tag'
}

export function TagManagerDialog({ id }: { id: string }): React.JSX.Element {
  const songs = useAppStore((s) => s.songs)
  const closeById = useModalStore((s) => s.closeById)
  const showToast = useAppStore((s) => s.showToast)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'all' | 'categories' | 'tags'>('all')

  const taxonomy = useMemo(() => {
    const map = new Map<string, TagItem>()

    songs.forEach((s) => {
      // Categories
      if (s.category) {
        const cat = s.category.trim()
        if (cat) {
          const key = `cat:${cat.toLowerCase()}`
          if (!map.has(key)) map.set(key, { name: cat, count: 0, type: 'category' })
          map.get(key)!.count++
        }
      }

      // Tags
      if (s.tags) {
        const tags = s.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
        tags.forEach((t) => {
          const key = `tag:${t.toLowerCase()}`
          if (!map.has(key)) map.set(key, { name: t, count: 0, type: 'tag' })
          map.get(key)!.count++
        })
      }
    })

    return Array.from(map.values()).sort(
      (a, b) => b.count - a.count || a.name.localeCompare(b.name)
    )
  }, [songs])

  const filtered = useMemo(() => {
    return taxonomy
      .filter(
        (t) =>
          activeTab === 'all' ||
          t.type ===
            activeTab +
              (activeTab === 'categories' ? '' : '').replace('ies', 'y').replace('tags', 'tag')
      ) // simple hack
      .filter((t) => t.name.toLowerCase().includes(searchQuery.toLowerCase()))
  }, [taxonomy, searchQuery, activeTab])

  const handleDelete = (item: TagItem): void => {
    showToast(
      `Penghapusan taksonomi belum diimplementasi (API DB belum siap) untuk ${item.name}`,
      'info'
    )
  }

  const handleEdit = (item: TagItem): void => {
    showToast(`Pengubahan nama taksonomi belum diimplementasi untuk ${item.name}`, 'info')
  }

  return (
    <Modal
      id={id}
      title="Manajemen Taksonomi"
      size="md"
      footer={
        <ModalButton variant="secondary" onClick={() => closeById(id)}>
          Tutup
        </ModalButton>
      }
    >
      <div className="flex flex-col gap-4 h-[400px]">
        {/* Toolbar */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
            />
            <input
              type="text"
              placeholder="Cari kategori atau tag..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-bg-surface border border-border-strong rounded-lg pl-9 pr-3 py-2 text-[13px] text-text-primary focus:outline-none focus:border-brand-primary/50 transition-colors"
            />
          </div>
          <div className="flex items-center bg-white/[0.04] p-1 rounded-lg border border-border-subtle">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 text-[11px] font-semibold rounded-md transition-colors ${activeTab === 'all' ? 'bg-white/10 text-white shadow-sm' : 'text-text-muted hover:text-text-primary'}`}
            >
              Semua
            </button>
            <button
              onClick={() => setActiveTab('categories')}
              className={`px-3 py-1.5 text-[11px] font-semibold rounded-md transition-colors ${activeTab === 'categories' ? 'bg-white/10 text-white shadow-sm' : 'text-text-muted hover:text-text-primary'}`}
            >
              Kategori
            </button>
            <button
              onClick={() => setActiveTab('tags')}
              className={`px-3 py-1.5 text-[11px] font-semibold rounded-md transition-colors ${activeTab === 'tags' ? 'bg-white/10 text-white shadow-sm' : 'text-text-muted hover:text-text-primary'}`}
            >
              Tags
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto border border-border-subtle rounded-xl bg-white/[0.01]">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-text-muted">
              <Hash size={24} className="opacity-40" />
              <span className="text-[12px]">Tidak ada taksonomi ditemukan</span>
            </div>
          ) : (
            <div className="divide-y divide-border-subtle/50">
              {filtered.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 hover:bg-white/[0.03] transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.type === 'category' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-emerald-500/10 text-emerald-400'}`}
                    >
                      {item.type === 'category' ? <Hash size={14} /> : <Tag size={14} />}
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-text-primary">{item.name}</p>
                      <p className="text-[10px] text-text-muted uppercase tracking-wider">
                        {item.type} • Dipakai di {item.count} lagu
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleEdit(item)}
                      className="p-1.5 rounded-md text-text-muted hover:text-brand-primary hover:bg-brand-primary/10 transition-colors"
                      title="Rename"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(item)}
                      className="p-1.5 rounded-md text-text-muted hover:text-danger hover:bg-danger/10 transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
