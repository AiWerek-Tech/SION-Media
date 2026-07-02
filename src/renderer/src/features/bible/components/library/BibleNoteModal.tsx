/**
 * BibleNoteModal — Premium overlay modal for creating/editing verse notes.
 *
 * Width 640px, rounded-3xl, deep navy glass, gold accent quote card,
 * 6 circular highlight colors, textarea, keyboard support (Escape/Ctrl+Enter).
 */

import React, { useEffect, useState, useRef } from 'react'
import { Check, FileEdit, Sparkles, X } from 'lucide-react'
import type { BibleVerse } from '../../hooks/useBibleReader'

const HIGHLIGHT_COLORS = [
  { id: 'yellow', label: 'Kuning', bg: 'bg-yellow-500', ring: 'ring-yellow-500' },
  { id: 'green', label: 'Hijau', bg: 'bg-green-500', ring: 'ring-green-500' },
  { id: 'blue', label: 'Biru', bg: 'bg-blue-500', ring: 'ring-blue-500' },
  { id: 'pink', label: 'Pink', bg: 'bg-pink-500', ring: 'ring-pink-500' },
  { id: 'orange', label: 'Oranye', bg: 'bg-orange-500', ring: 'ring-orange-500' },
  { id: 'purple', label: 'Ungu', bg: 'bg-purple-500', ring: 'ring-purple-500' }
]

interface BibleNoteModalProps {
  verse: BibleVerse | null
  isOpen: boolean
  onClose: () => void
  onSave: (note: string, color: string) => void
  initialNote: string
  initialColor: string
}

export function BibleNoteModal({
  verse,
  isOpen,
  onClose,
  onSave,
  initialNote,
  initialColor
}: BibleNoteModalProps): React.JSX.Element | null {
  const [note, setNote] = useState(initialNote)
  const [color, setColor] = useState(initialColor)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    // Opening a different verse resets this controlled draft.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNote(initialNote)
    setColor(initialColor)
  }, [initialNote, initialColor])

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => textareaRef.current?.focus(), 100)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        onSave(note, color)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isOpen, note, color, onClose, onSave])

  if (!isOpen || !verse) return null

  const refLabel = `${verse.book_name} ${verse.chapter}:${verse.verse}`

  return (
    <div className="bible-note-modal__overlay" onClick={onClose}>
      <div className="bible-note-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="bible-note-modal__header">
          <div className="bible-note-modal__header-left">
            <Sparkles size={16} className="text-brand-primary" />
            <span>Catatan &amp; Highlight</span>
          </div>
          <button onClick={onClose} className="bible-note-modal__close">
            <X size={16} />
          </button>
        </div>

        {/* Quote card */}
        <div className="bible-note-modal__quote">
          <h4>{refLabel}</h4>
          <p>&ldquo;{verse.text}&rdquo;</p>
        </div>

        {/* Colors */}
        <div className="bible-note-modal__section-label">TANDAI HIGHLIGHT</div>
        <div className="bible-note-modal__palette">
          {HIGHLIGHT_COLORS.map((col) => (
            <button
              key={col.id}
              onClick={() => setColor(color === col.id ? '' : col.id)}
              className={`bible-note-modal__color ${col.bg} ${color === col.id ? `ring-2 ${col.ring} ring-offset-2 ring-offset-[#0d0f17]` : ''}`}
              title={col.label}
            >
              {color === col.id && <Check size={12} className="text-white" />}
            </button>
          ))}
          {color && (
            <button onClick={() => setColor('')} className="bible-note-modal__color-clear">
              Hapus
            </button>
          )}
        </div>

        {/* Textarea */}
        <div className="bible-note-modal__section-label">CATATAN</div>
        <textarea
          ref={textareaRef}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Ketik catatan belajar atau refleksi teologis..."
          className="bible-note-modal__textarea"
        />

        {/* Footer */}
        <div className="bible-note-modal__footer">
          <span className="bible-note-modal__shortcut">Ctrl + Enter untuk menyimpan</span>
          <div className="bible-note-modal__footer-actions">
            <button onClick={onClose} className="bible-note-modal__btn-cancel">
              Batal
            </button>
            <button onClick={() => onSave(note, color)} className="bible-note-modal__btn-save">
              <FileEdit size={13} />
              Simpan Catatan
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
