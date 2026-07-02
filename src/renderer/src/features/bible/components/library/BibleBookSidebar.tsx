/**
 * BibleBookSidebar — Premium sidebar for Bible book navigation.
 *
 * Glassmorphism card, search input, Perjanjian Lama / Baru sections,
 * active glow border, chapter count pills.
 */

import React from 'react'
import { BookOpen, Search, SlidersHorizontal } from 'lucide-react'
import type { BibleBook } from '../../hooks/useBibleReader'

interface BibleBookSidebarProps {
  otBooks: BibleBook[]
  ntBooks: BibleBook[]
  selectedBookCode: string | null
  onSelectBook: (bookCode: string) => void
  bookSearchQuery: string
  onBookSearchChange: (query: string) => void
}

function filterBooks(books: BibleBook[], query: string): BibleBook[] {
  const q = query.toLowerCase().trim()
  if (!q) return books
  return books.filter(
    (book) => book.name.toLowerCase().includes(q) || book.code.toLowerCase().includes(q)
  )
}

export function BibleBookSidebar({
  otBooks,
  ntBooks,
  selectedBookCode,
  onSelectBook,
  bookSearchQuery,
  onBookSearchChange
}: BibleBookSidebarProps): React.JSX.Element {
  const filteredOT = filterBooks(otBooks, bookSearchQuery)
  const filteredNT = filterBooks(ntBooks, bookSearchQuery)

  return (
    <aside className="bible-sidebar">
      {/* Header */}
      <div className="bible-sidebar__header">
        <div className="bible-sidebar__title">
          <BookOpen size={16} className="text-brand-primary" />
          <span>ALKITAB</span>
        </div>
      </div>

      {/* Search */}
      <div className="bible-sidebar__search">
        <div className="bible-sidebar__search-wrap">
          <Search size={14} className="bible-sidebar__search-icon" />
          <input
            type="text"
            value={bookSearchQuery}
            onChange={(e) => onBookSearchChange(e.target.value)}
            placeholder="Cari kitab..."
            className="bible-sidebar__search-input"
          />
          <SlidersHorizontal size={12} className="bible-sidebar__filter-icon" />
        </div>
      </div>

      {/* Book List */}
      <div className="bible-sidebar__list">
        {/* Perjanjian Lama */}
        {filteredOT.length > 0 && (
          <div className="bible-sidebar__section">
            <h4 className="bible-sidebar__section-label">PERJANJIAN LAMA</h4>
            <div className="bible-sidebar__items">
              {filteredOT.map((book) => {
                const active = selectedBookCode === book.code
                return (
                  <button
                    key={book.code}
                    onClick={() => onSelectBook(book.code)}
                    className={`bible-sidebar__book ${active ? 'is-active' : ''}`}
                    title={`${book.name} — ${book.chapters} pasal`}
                  >
                    <span className="bible-sidebar__book-indicator" />
                    <BookOpen size={13} className="bible-sidebar__book-icon" />
                    <span className="bible-sidebar__book-name">{book.name}</span>
                    <span className="bible-sidebar__book-chapters">{book.chapters}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Perjanjian Baru */}
        {filteredNT.length > 0 && (
          <div className="bible-sidebar__section">
            <h4 className="bible-sidebar__section-label">PERJANJIAN BARU</h4>
            <div className="bible-sidebar__items">
              {filteredNT.map((book) => {
                const active = selectedBookCode === book.code
                return (
                  <button
                    key={book.code}
                    onClick={() => onSelectBook(book.code)}
                    className={`bible-sidebar__book ${active ? 'is-active' : ''}`}
                    title={`${book.name} — ${book.chapters} pasal`}
                  >
                    <span className="bible-sidebar__book-indicator" />
                    <BookOpen size={13} className="bible-sidebar__book-icon" />
                    <span className="bible-sidebar__book-name">{book.name}</span>
                    <span className="bible-sidebar__book-chapters">{book.chapters}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {filteredOT.length === 0 && filteredNT.length === 0 && (
          <div className="bible-sidebar__empty">
            <p>Kitab tidak ditemukan.</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bible-sidebar__footer">
        <span>Sion App</span>
        <span className="bible-sidebar__footer-badge">Premium ✦</span>
      </div>
    </aside>
  )
}
