/**
 * BibleStudyInspector — Right panel for Bible study tools.
 *
 * Glass card with tabs: Bandingkan / Catatan Belajar / Aksi Cepat.
 * Includes translation comparison, note/highlight editor, quick action grid.
 */

import React, { useEffect, useState } from 'react'
import {
  Book,
  BookOpen,
  Check,
  Copy,
  FileEdit,
  MessageSquare,
  MonitorPlay,
  Palette,
  Plus,
  Search,
  Share2,
  Sparkles,
  Star
} from 'lucide-react'
import type { BibleVerse, BibleVersion, SelectedVerseRange } from '../../hooks/useBibleReader'
import { usePlaylistStore } from '../../../../store/usePlaylistStore'
import { useProjectionStore } from '../../../../store/useProjectionStore'
import { buildBibleSlidesFromVerses } from '../../utils/buildBibleSlides'

type BibleInspectorTab = 'compare' | 'note' | 'quick'

const HIGHLIGHT_COLORS = [
  { id: 'yellow', label: 'Kuning', ring: 'ring-yellow-500', bg: 'bg-yellow-500' },
  { id: 'green', label: 'Hijau', ring: 'ring-green-500', bg: 'bg-green-500' },
  { id: 'blue', label: 'Biru', ring: 'ring-blue-500', bg: 'bg-blue-500' },
  { id: 'pink', label: 'Pink', ring: 'ring-pink-500', bg: 'bg-pink-500' },
  { id: 'orange', label: 'Oranye', ring: 'ring-orange-500', bg: 'bg-orange-500' },
  { id: 'purple', label: 'Ungu', ring: 'ring-purple-500', bg: 'bg-purple-500' }
]

interface BibleStudyInspectorProps {
  inspectedVerse: BibleVerse | null
  selectedRange: SelectedVerseRange | null
  selectedVersion: BibleVersion | null
  versions: BibleVersion[]
  onNoteSaved?: () => void
  showToast?: (message: string, type: 'success' | 'error' | 'info') => void
}

export function BibleStudyInspector({
  inspectedVerse,
  selectedRange,
  selectedVersion,
  versions,
  onNoteSaved,
  showToast
}: BibleStudyInspectorProps): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<BibleInspectorTab>('compare')
  const [bibleNote, setBibleNote] = useState('')
  const [bibleColor, setBibleColor] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [comparisons, setComparisons] = useState<Array<{ version: string; text: string }>>([])
  const [loadingComparisons, setLoadingComparisons] = useState(false)

  // Load note/color for inspected verse
  useEffect(() => {
    if (!inspectedVerse) return
    let active = true
    window.api.biblePack
      .getNote(inspectedVerse.book_code, inspectedVerse.chapter, inspectedVerse.verse)
      .then((data) => {
        if (!active) return
        const note = data as { note_text: string; highlight_color: string }
        setBibleNote(note?.note_text || '')
        setBibleColor(note?.highlight_color || '')
      })
      .catch(console.error)
    return () => {
      active = false
    }
  }, [inspectedVerse])

  // Load translation comparisons
  useEffect(() => {
    if (!inspectedVerse || !versions || versions.length === 0) return
    let active = true
    // Loading state intentionally resets when the inspected verse/version changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoadingComparisons(true)
    setComparisons([])

    const fetchAll = async (): Promise<void> => {
      const comparisonVersions = versions.filter(
        (version) => version.versionCode !== selectedVersion?.versionCode
      )
      const resolved = await Promise.all(
        comparisonVersions.map(async (ver): Promise<{ version: string; text: string } | null> => {
          try {
            const res = await window.api.biblePack.getVerseRange(
              ver.versionCode,
              inspectedVerse.book_code,
              inspectedVerse.chapter,
              inspectedVerse.verse,
              inspectedVerse.verse
            )
            if (res && res.length > 0) {
              return { version: ver.shortName || ver.versionCode, text: res[0].text }
            }
          } catch (err) {
            console.error(err)
          }
          return null
        })
      )
      if (active) {
        setComparisons(
          resolved.filter((item): item is { version: string; text: string } => item !== null)
        )
        setLoadingComparisons(false)
      }
    }
    void fetchAll()
    return () => {
      active = false
    }
  }, [inspectedVerse, selectedVersion?.versionCode, versions])

  const handleUpdateColor = async (color: string): Promise<void> => {
    if (!inspectedVerse) return
    const newColor = bibleColor === color ? '' : color
    setBibleColor(newColor)
    try {
      await window.api.biblePack.updateNote(
        inspectedVerse.book_code,
        inspectedVerse.chapter,
        inspectedVerse.verse,
        bibleNote,
        newColor
      )
      onNoteSaved?.()
    } catch (err) {
      console.error(err)
      showToast?.('Gagal menyimpan warna highlight', 'error')
    }
  }

  const handleSaveNote = async (): Promise<void> => {
    if (!inspectedVerse) return
    setSavingNote(true)
    try {
      await window.api.biblePack.updateNote(
        inspectedVerse.book_code,
        inspectedVerse.chapter,
        inspectedVerse.verse,
        bibleNote,
        bibleColor
      )
      onNoteSaved?.()
      showToast?.('Catatan Alkitab berhasil disimpan', 'success')
    } catch (err) {
      console.error(err)
      showToast?.('Gagal menyimpan catatan Alkitab', 'error')
    } finally {
      setSavingNote(false)
    }
  }

  const handleCopyVerse = (): void => {
    if (!inspectedVerse) return
    const refStr = `${inspectedVerse.book_name} ${inspectedVerse.chapter}:${inspectedVerse.verse}`
    navigator.clipboard.writeText(`${refStr}\n${inspectedVerse.text}`).catch(() => {})
    showToast?.('Ayat disalin ke clipboard', 'info')
  }

  const handleProjectBibleRange = (): void => {
    if (!selectedRange || !selectedVersion) return
    const { setSlides, goToSlide } = useProjectionStore.getState()
    const slides = buildBibleSlidesFromVerses({
      verses: selectedRange.verses,
      bookName: selectedRange.bookName,
      chapter: selectedRange.chapter,
      versionShortName: selectedVersion.shortName,
      versionCode: selectedVersion.versionCode,
      copyright: selectedVersion.copyright || '© LAI 1974'
    })
    setSlides(slides)
    goToSlide(0)
    const refLabel = `${selectedRange.bookName} ${selectedRange.chapter}:${selectedRange.verseStart}${selectedRange.verseEnd !== selectedRange.verseStart ? `-${selectedRange.verseEnd}` : ''}`
    showToast?.(`${refLabel} dikirim ke Preview`, 'success')
  }

  const handleAddBibleToPlaylist = async (): Promise<void> => {
    if (!selectedRange || !selectedVersion) return
    const activePl = usePlaylistStore.getState().activePlaylist
    if (!activePl) {
      showToast?.('Pilih playlist rundown terlebih dahulu', 'error')
      return
    }
    try {
      const refStr = `${selectedRange.bookName} ${selectedRange.chapter}:${selectedRange.verseStart}${selectedRange.verseStart !== selectedRange.verseEnd ? `-${selectedRange.verseEnd}` : ''}`
      await window.api.playlists.addBible(activePl.id, {
        bible_version_code: selectedVersion.versionCode,
        bible_version_short_name: selectedVersion.shortName,
        bible_book_code: selectedRange.bookCode,
        bible_book_name: selectedRange.bookName,
        bible_chapter: selectedRange.chapter,
        bible_verse_start: selectedRange.verseStart,
        bible_verse_end: selectedRange.verseEnd,
        bible_reference: `${refStr} · ${selectedVersion.shortName}`,
        bible_text_json: JSON.stringify(selectedRange.verses),
        bible_copyright: selectedVersion.copyright || '© LAI 1974'
      })
      await usePlaylistStore.getState().loadPlaylistItems(activePl.id)
      showToast?.('Ayat Alkitab berhasil ditambahkan ke playlist', 'success')
    } catch (err) {
      console.error(err)
      showToast?.('Gagal menambahkan ke playlist', 'error')
    }
  }

  const handleCopyRange = (): void => {
    if (!selectedRange) return
    const textToCopy = selectedRange.verses.map((v) => `[${v.verse}] ${v.text}`).join('\n')
    const refStr = `${selectedRange.bookName} ${selectedRange.chapter}:${selectedRange.verseStart}${selectedRange.verseStart !== selectedRange.verseEnd ? `-${selectedRange.verseEnd}` : ''}`
    navigator.clipboard.writeText(`${refStr}\n${textToCopy}`).catch(() => {})
    showToast?.('Referensi Alkitab disalin', 'info')
  }

  // ========== EMPTY STATE ==========
  if (!inspectedVerse) {
    return (
      <aside className="bible-inspector">
        <div className="bible-inspector__tabs">
          <button className="is-active">Bandingkan</button>
          <button>Catatan Belajar</button>
          <button>Aksi Cepat</button>
        </div>
        <div className="bible-inspector__empty">
          <div className="bible-inspector__empty-icon">
            <Book size={28} />
          </div>
          <p>Pilih ayat untuk melihat perbandingan, catatan belajar, dan aksi cepat.</p>
        </div>
      </aside>
    )
  }

  // ========== MAIN RENDER ==========
  return (
    <aside className="bible-inspector">
      {/* Tabs */}
      <div className="bible-inspector__tabs">
        <button
          className={activeTab === 'compare' ? 'is-active' : ''}
          onClick={() => setActiveTab('compare')}
        >
          Bandingkan
        </button>
        <button
          className={activeTab === 'note' ? 'is-active' : ''}
          onClick={() => setActiveTab('note')}
        >
          Catatan Belajar
        </button>
        <button
          className={activeTab === 'quick' ? 'is-active' : ''}
          onClick={() => setActiveTab('quick')}
        >
          Aksi Cepat
        </button>
      </div>

      {/* Tab content */}
      <div className="bible-inspector__content">
        {/* ===== TAB: Bandingkan ===== */}
        {activeTab === 'compare' && (
          <div className="bible-inspector__panel">
            {/* Selected verse hero card */}
            <div className="bible-inspector__label">
              <Star size={12} className="text-amber-500" />
              AYAT TERPILIH
            </div>
            <div className="bible-inspector__quote-card">
              <h3 className="bible-inspector__quote-ref">
                {inspectedVerse.book_name} {inspectedVerse.chapter}:{inspectedVerse.verse}
              </h3>
              <p className="bible-inspector__quote-text">&ldquo;{inspectedVerse.text}&rdquo;</p>
            </div>

            {/* Comparisons */}
            <div className="bible-inspector__label">PERBANDINGAN VERSI TERJEMAHAN</div>
            {loadingComparisons ? (
              <div className="bible-inspector__loading">Memuat perbandingan...</div>
            ) : comparisons.length === 0 ? (
              <div className="bible-inspector__loading">Tidak ada versi lain terinstal.</div>
            ) : (
              <div className="bible-inspector__comparisons">
                {comparisons.map((c) => (
                  <div key={c.version} className="bible-inspector__comp-card">
                    <div className="bible-inspector__comp-header">
                      <span className="bible-inspector__comp-badge">{c.version}</span>
                      <span className="bible-inspector__comp-ref">
                        {inspectedVerse.book_name} {inspectedVerse.chapter}:{inspectedVerse.verse}
                      </span>
                    </div>
                    <p className="bible-inspector__comp-text">{c.text}</p>
                  </div>
                ))}
              </div>
            )}

            <button className="bible-inspector__add-version-btn" disabled>
              <Plus size={14} />
              Tambah Versi Lain
            </button>
          </div>
        )}

        {/* ===== TAB: Catatan Belajar ===== */}
        {activeTab === 'note' && (
          <div className="bible-inspector__panel">
            {/* Reference */}
            <div className="bible-inspector__label">
              <Star size={12} className="text-amber-500" />
              AYAT TERPILIH
            </div>
            <div className="bible-inspector__quote-card bible-inspector__quote-card--compact">
              <h3 className="bible-inspector__quote-ref">
                {inspectedVerse.book_name} {inspectedVerse.chapter}:{inspectedVerse.verse}
              </h3>
              <p className="bible-inspector__quote-text">&ldquo;{inspectedVerse.text}&rdquo;</p>
            </div>

            {/* Highlight palette */}
            <div className="bible-inspector__label">
              <Palette size={12} />
              TANDAI AYAT (HIGHLIGHT)
            </div>
            <div className="bible-inspector__palette">
              {HIGHLIGHT_COLORS.map((col) => (
                <button
                  key={col.id}
                  onClick={() => void handleUpdateColor(col.id)}
                  className={`bible-inspector__color-circle ${col.bg} ${bibleColor === col.id ? `ring-2 ${col.ring} ring-offset-2 ring-offset-bg-base` : ''}`}
                  title={col.label}
                >
                  {bibleColor === col.id && <Check size={12} className="text-white" />}
                </button>
              ))}
              {bibleColor && (
                <button
                  onClick={() => void handleUpdateColor('')}
                  className="bible-inspector__color-clear"
                  title="Hapus Highlight"
                >
                  Hapus
                </button>
              )}
            </div>

            {/* Note textarea */}
            <div className="bible-inspector__label">
              <MessageSquare size={12} />
              CATATAN BELAJAR PRIBADI
            </div>
            <textarea
              value={bibleNote}
              onChange={(e) => setBibleNote(e.target.value)}
              placeholder="Ketik catatan belajar atau refleksi teologis mengenai ayat ini..."
              className="bible-inspector__textarea"
            />
            <button
              onClick={() => void handleSaveNote()}
              disabled={savingNote}
              className="bible-inspector__save-btn"
            >
              <FileEdit size={13} className={savingNote ? 'animate-pulse' : ''} />
              {savingNote ? 'Menyimpan...' : 'Simpan Catatan'}
            </button>
          </div>
        )}

        {/* ===== TAB: Aksi Cepat ===== */}
        {activeTab === 'quick' && (
          <div className="bible-inspector__panel">
            <div className="bible-inspector__label">AKSI CEPAT</div>
            <div className="bible-inspector__action-grid">
              <button
                className="bible-inspector__action-card"
                onClick={handleCopyVerse}
                title="Copy Ayat"
              >
                <Copy size={18} />
                <span>Copy Ayat</span>
              </button>
              <button className="bible-inspector__action-card" title="Bagikan">
                <Share2 size={18} />
                <span>Bagikan</span>
              </button>
              <button
                className="bible-inspector__action-card"
                onClick={() => void handleSaveNote()}
                title="Simpan"
              >
                <FileEdit size={18} />
                <span>Simpan</span>
              </button>
              <button
                className="bible-inspector__action-card"
                onClick={() => setActiveTab('note')}
                title="Sorot Ayat"
              >
                <Sparkles size={18} />
                <span>Sorot Ayat</span>
              </button>
              <button
                className="bible-inspector__action-card"
                onClick={() => setActiveTab('note')}
                title="Buat Catatan"
              >
                <MessageSquare size={18} />
                <span>Buat Catatan</span>
              </button>
              <button
                className="bible-inspector__action-card"
                onClick={() => void handleAddBibleToPlaylist()}
                title="Tambah ke Playlist"
              >
                <Plus size={18} />
                <span>Tambah ke Playlist</span>
              </button>
              <button
                className="bible-inspector__action-card"
                onClick={() => setActiveTab('compare')}
                title="Bandingkan Versi"
              >
                <BookOpen size={18} />
                <span>Bandingkan Versi</span>
              </button>
              <button className="bible-inspector__action-card" title="Cari Topik">
                <Search size={18} />
                <span>Cari Topik</span>
              </button>
            </div>

            {/* Range actions */}
            {selectedRange && (
              <div className="bible-inspector__range-actions">
                <div className="bible-inspector__label" style={{ marginTop: 16 }}>
                  AKSI AYAT TERPILIH (
                  {selectedRange.verseStart === selectedRange.verseEnd
                    ? `Ayat ${selectedRange.verseStart}`
                    : `Ayat ${selectedRange.verseStart}-${selectedRange.verseEnd}`}
                  )
                </div>
                <button
                  className="bible-inspector__range-btn bible-inspector__range-btn--primary"
                  onClick={handleProjectBibleRange}
                >
                  <MonitorPlay size={14} />
                  Tayangkan Ayat Terpilih
                </button>
                <button
                  className="bible-inspector__range-btn"
                  onClick={() => void handleAddBibleToPlaylist()}
                >
                  <Plus size={14} />
                  Tambah ke Rundown
                </button>
                <button className="bible-inspector__range-btn" onClick={handleCopyRange}>
                  <Copy size={14} />
                  Salin Teks Range
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  )
}
