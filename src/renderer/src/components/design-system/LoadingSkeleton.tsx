import React from 'react'
import { motion } from 'framer-motion'

export type SkeletonVariant =
  | 'default'
  | 'projection'
  | 'library'
  | 'management'
  | 'editor'
  | 'settings'
  | 'import-export'
  | 'bible'
  | 'welcome'

interface LoadingSkeletonProps {
  variant?: SkeletonVariant
  count?: number
  className?: string
}

export function LoadingSkeleton({
  variant = 'default',
  count = 5,
  className
}: LoadingSkeletonProps): React.JSX.Element {
  // 1. High-Fidelity Projection Mode & Broadcast Mode Skeleton (0% Layout Shift)
  if (variant === 'projection') {
    return (
      <div
        className={`h-full w-full overflow-hidden bg-bg-base text-text-primary projection-layout projection-layout-v2 animate-pulse ${className || ''}`}
      >
        {/* Row 1: Aspect Monitor Section */}
        <section className="relative min-h-0 overflow-hidden px-5 pt-3">
          <div className="w-full h-full rounded-2xl bg-bg-surface border border-border-subtle/50 p-4 flex flex-col justify-between">
            <div className="flex justify-between items-center pb-2 border-b border-border-subtle/30">
              <div className="h-4.5 w-40 rounded bg-bg-elevated" />
              <div className="flex gap-2">
                <div className="h-7 w-20 rounded bg-bg-elevated" />
                <div className="h-7 w-16 rounded bg-bg-elevated" />
              </div>
            </div>
            <div className="flex-1 flex gap-4 mt-3 min-h-0">
              {/* Live aspect monitor display */}
              <div className="flex-1 aspect-video max-h-full rounded-xl bg-bg-base border border-border-subtle/50 flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-brand-primary/5 to-transparent" />
                <div className="h-10 w-10 rounded-lg bg-bg-elevated/40 animate-pulse" />
              </div>
              <div className="w-80 shrink-0 rounded-xl bg-bg-base/40 border border-border-subtle/30 p-3 space-y-2">
                <div className="h-4 w-1/2 rounded bg-bg-elevated" />
                <div className="h-3 w-5/6 rounded bg-bg-elevated opacity-60" />
                <div className="h-3 w-2/3 rounded bg-bg-elevated opacity-40" />
              </div>
            </div>
          </div>
        </section>

        {/* Row 2: Bottom workspace */}
        <section className="min-h-0 overflow-hidden px-5 pb-3">
          <div className="projection-bottom-workspace">
            {/* Song Library Panel */}
            <div className="projection-library-panel border border-border-subtle bg-bg-surface rounded-2xl p-4 flex flex-col space-y-4">
              <div className="flex justify-between items-center">
                <div className="h-4.5 w-32 rounded bg-bg-elevated" />
                <div className="h-8 w-8 rounded-lg bg-bg-elevated" />
              </div>
              <div className="h-10 w-full rounded-xl bg-bg-base border border-border-subtle/50" />
              <div className="flex-1 space-y-2.5 overflow-hidden">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-12 w-full rounded-xl bg-bg-base/50 border border-border-subtle/30 px-3 flex items-center justify-between"
                    style={{ opacity: 1 - i * 0.15 }}
                  >
                    <div className="h-4 w-2/3 rounded bg-bg-elevated" />
                    <div className="h-3.5 w-12 rounded bg-bg-elevated" />
                  </div>
                ))}
              </div>
            </div>

            {/* Playlist Panel */}
            <div className="border border-border-subtle bg-bg-surface rounded-2xl p-4 flex flex-col space-y-4">
              <div className="flex justify-between items-center">
                <div className="h-4.5 w-24 rounded bg-bg-elevated" />
                <div className="h-8 w-16 rounded-xl bg-bg-elevated" />
              </div>
              <div className="flex-1 space-y-2.5 overflow-hidden">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-12 w-full rounded-xl bg-bg-base/30 border border-border-subtle/30 px-3 flex items-center gap-3"
                    style={{ opacity: 1 - i * 0.15 }}
                  >
                    <div className="h-5 w-5 rounded bg-bg-elevated" />
                    <div className="h-4 w-1/2 rounded bg-bg-elevated" />
                  </div>
                ))}
              </div>
            </div>

            {/* Tabbed Operator Container */}
            <div className="border border-border-subtle bg-bg-surface rounded-2xl p-4 flex flex-col space-y-4">
              <div className="flex items-center gap-2 border-b border-border-subtle/50 pb-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-6 w-12 rounded bg-bg-elevated"
                    style={{ opacity: 1 - i * 0.15 }}
                  />
                ))}
              </div>
              <div className="flex-1 space-y-4">
                <div className="h-4.5 w-28 rounded bg-bg-elevated" />
                <div className="space-y-2">
                  <div className="h-3.5 w-full rounded bg-bg-elevated/60" />
                  <div className="h-3.5 w-5/6 rounded bg-bg-elevated/40" />
                  <div className="h-3.5 w-2/3 rounded bg-bg-elevated/20" />
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    )
  }

  // 2. High-Fidelity Library Mode Skeleton (0% Layout Shift)
  if (variant === 'library') {
    return (
      <div className={`library-pro-shell animate-pulse ${className || ''}`}>
        <div className="library-pro-ambient" />

        {/* Left Sidebar */}
        <aside className="library-pro-sidebar">
          <div className="library-pro-brand">
            <div className="library-pro-brand__mark h-6 w-6 rounded bg-bg-elevated" />
            <div className="space-y-1">
              <div className="h-4 w-20 rounded bg-bg-elevated" />
              <div className="h-3 w-12 rounded bg-bg-elevated opacity-60" />
            </div>
          </div>

          <nav className="library-pro-nav space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <section key={i} className="space-y-2">
                <div className="h-3 w-16 rounded bg-bg-elevated opacity-40 ml-2" />
                <div className="space-y-1.5">
                  {Array.from({ length: 3 }).map((_, j) => (
                    <div
                      key={j}
                      className="h-9 w-full rounded bg-bg-elevated/40"
                      style={{ opacity: 1 - j * 0.2 }}
                    />
                  ))}
                </div>
              </section>
            ))}
          </nav>

          <div className="library-pro-sidebar__footer">
            <div className="library-pro-operator">
              <div className="h-6 w-6 rounded-full bg-bg-elevated" />
              <div className="space-y-1 flex-grow">
                <div className="h-3.5 w-16 rounded bg-bg-elevated" />
                <div className="h-2.5 w-24 rounded bg-bg-elevated opacity-60" />
              </div>
            </div>
            <div className="library-pro-db-status">
              <div className="h-3 w-12 rounded bg-bg-elevated opacity-50" />
              <div className="h-3.5 w-16 rounded bg-bg-elevated" />
            </div>
          </div>
        </aside>

        {/* Main Panel */}
        <main className="library-pro-main">
          <header className="library-pro-command-bar flex items-center justify-between">
            <div className="library-pro-mode-pill h-7 w-28 bg-bg-elevated rounded-full" />
            <div className="library-pro-search flex-1 max-w-md h-10 rounded-xl bg-bg-elevated border border-border-subtle/50" />
            <div className="library-pro-command-actions flex gap-2">
              <div className="h-9 w-20 rounded-xl bg-bg-elevated" />
              <div className="h-9 w-24 rounded-xl bg-bg-elevated" />
              <div className="h-9 w-20 rounded-xl bg-bg-elevated" />
            </div>
          </header>

          <section className="library-pro-overview mt-6">
            <div className="library-pro-heading flex justify-between items-center mb-4">
              <div className="h-6 w-36 rounded bg-bg-elevated" />
              <div className="h-4 w-28 rounded bg-bg-elevated opacity-60" />
            </div>
            <div className="library-pro-stat-grid grid grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="library-pro-stat-card h-24 rounded-2xl bg-bg-surface border border-border-subtle p-4 flex flex-col justify-between"
                  style={{ opacity: 1 - i * 0.15 }}
                >
                  <div className="h-3 w-16 rounded bg-bg-elevated" />
                  <div className="h-8 w-12 rounded bg-bg-elevated" />
                </div>
              ))}
            </div>
          </section>

          <section className="library-pro-content mt-6 flex-grow flex gap-4 overflow-hidden">
            <div className="library-pro-browser flex-grow flex flex-col">
              <div className="library-pro-browser__header flex justify-between items-center pb-4 border-b border-border-subtle/50">
                <div className="space-y-1">
                  <div className="h-6 w-28 rounded bg-bg-elevated" />
                  <div className="h-3 w-40 rounded bg-bg-elevated opacity-60" />
                </div>
                <div className="library-pro-browser__tools flex items-center gap-3">
                  <div className="h-9 w-32 bg-bg-elevated rounded-xl" />
                  <div className="library-pro-tabs flex gap-1 h-9 rounded-xl bg-bg-elevated p-1" />
                </div>
              </div>

              {/* Number workspace grid */}
              <div className="library-pro-number-workspace mt-4 flex-grow flex flex-col">
                <div className="library-pro-number-grid grid grid-cols-8 gap-3 flex-grow">
                  {Array.from({ length: 24 }).map((_, i) => (
                    <div
                      key={i}
                      className="library-pro-number-tile h-12 rounded-xl bg-bg-surface border border-border-subtle/50 flex items-center justify-center"
                      style={{ opacity: 1 - Math.floor(i / 8) * 0.25 }}
                    >
                      <div className="h-4 w-6 bg-bg-elevated rounded" />
                    </div>
                  ))}
                </div>
                <div className="library-pro-pagination flex justify-between items-center mt-4 pt-4 border-t border-border-subtle/50">
                  <div className="h-4 w-48 rounded bg-bg-elevated" />
                  <div className="flex gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="h-8 w-8 rounded-lg bg-bg-elevated" />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Inspector aside */}
            <aside className="library-pro-inspector w-80 shrink-0 border border-border-subtle bg-bg-surface/50 rounded-3xl p-4 flex flex-col space-y-4">
              <div className="library-pro-panel-tabs h-9 bg-bg-elevated rounded-xl p-1" />
              <div className="library-pro-inspector__content space-y-6">
                <div className="library-pro-artwork aspect-video w-full rounded-2xl bg-bg-base flex items-center justify-center border border-border-subtle/50" />
                <div className="space-y-2">
                  <div className="h-5 w-48 rounded bg-bg-elevated" />
                  <div className="h-3.5 w-32 rounded bg-bg-elevated opacity-60" />
                </div>
                <div className="library-pro-meta-table space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className="flex justify-between items-center h-8 px-2 border-b border-border-subtle/30"
                    >
                      <div className="h-3 w-16 bg-bg-elevated rounded" />
                      <div className="h-3 w-20 bg-bg-elevated rounded" />
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          </section>
        </main>
      </div>
    )
  }

  // 3. High-Fidelity Management Mode Skeleton (0% Layout Shift)
  if (variant === 'management') {
    return (
      <div
        className={`management-studio animate-pulse bg-bg-base overflow-hidden flex flex-col h-full w-full ${className || ''}`}
      >
        <div className="management-studio__shell flex-grow flex flex-col p-6 space-y-6">
          {/* Header */}
          <header className="management-studio__header flex justify-between items-center">
            <div className="management-studio__heading space-y-1">
              <div className="management-studio__eyebrow flex items-center gap-1.5 text-xs text-text-muted">
                <div className="h-3.5 w-3.5 rounded bg-bg-elevated" />
                <div className="h-3.5 w-44 rounded bg-bg-elevated" />
              </div>
              <div className="h-8 w-32 rounded bg-bg-elevated mt-1" />
              <div className="h-4.5 w-96 rounded bg-bg-elevated opacity-60" />
            </div>

            <div className="management-studio__actions flex gap-2">
              <div className="h-9 w-24 rounded-lg bg-bg-elevated" />
              <div className="h-9 w-28 rounded-lg bg-bg-elevated" />
              <div className="h-9 w-28 rounded-lg bg-bg-elevated" />
              <div className="h-9 w-28 rounded-lg bg-bg-elevated" />
            </div>
          </header>

          {/* Summary Grid */}
          <section className="management-summary-grid grid grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="management-summary-card h-28 rounded-2xl bg-bg-surface border border-border-subtle p-4 flex flex-col justify-between"
                style={{ opacity: 1 - i * 0.1 }}
              >
                <div className="management-summary-card__top flex justify-between items-center">
                  <div className="management-summary-card__icon h-8 w-8 rounded-lg bg-bg-elevated" />
                </div>
                <div className="management-summary-card__label h-3 w-16 rounded bg-bg-elevated opacity-60" />
                <div className="management-summary-card__value-row flex items-center justify-between">
                  <div className="management-summary-card__value h-6 w-12 rounded bg-bg-elevated" />
                </div>
                <div className="management-summary-card__meta h-3 w-20 rounded bg-bg-elevated opacity-40" />
              </div>
            ))}
          </section>

          {/* Workspace Grid */}
          <main className="management-workspace-grid flex-grow flex gap-4 min-h-0">
            {/* Left Workspace Stack: Command bar + Browser list */}
            <section className="flex-grow flex flex-col gap-4 min-h-0">
              <div className="management-command-bar h-12 rounded-xl bg-bg-surface border border-border-subtle p-3 flex justify-between items-center">
                <div className="h-6 w-32 rounded bg-bg-elevated" />
                <div className="flex gap-2">
                  <div className="h-6 w-24 rounded bg-bg-elevated" />
                  <div className="h-6 w-28 rounded bg-bg-elevated" />
                </div>
              </div>

              <div className="management-browser flex-grow border border-border-subtle bg-bg-surface rounded-2xl p-4 flex flex-col space-y-4">
                <div className="management-browser__header flex justify-between items-center pb-2 border-b border-border-subtle/50">
                  <div className="space-y-1">
                    <div className="h-5 w-24 rounded bg-bg-elevated" />
                    <div className="h-3 w-32 rounded bg-bg-elevated opacity-60" />
                  </div>
                  <div className="h-8 w-32 rounded-lg bg-bg-elevated" />
                </div>

                <div className="management-browser__viewport flex-grow space-y-3 overflow-hidden">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-12 w-full rounded-xl bg-bg-base/40 border border-border-subtle/30 px-4 flex items-center gap-4"
                      style={{ opacity: 1 - i * 0.15 }}
                    >
                      <div className="h-5 w-5 rounded bg-bg-elevated" />
                      <div className="h-4 w-8 rounded bg-bg-elevated opacity-60" />
                      <div className="h-4 w-40 rounded bg-bg-elevated" />
                      <div className="h-4.5 w-16 rounded bg-bg-elevated/45 ml-auto" />
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Right Inspector Aside (380px) */}
            <aside className="w-[380px] shrink-0 flex flex-col gap-4 min-h-0">
              <div className="management-inspector flex-grow border border-border-subtle bg-bg-surface rounded-2xl p-4 flex flex-col space-y-4">
                <div className="management-inspector__header flex justify-between items-center pb-2 border-b border-border-subtle/50">
                  <div className="space-y-1">
                    <div className="h-5 w-24 rounded bg-bg-elevated" />
                    <div className="h-3 w-32 rounded bg-bg-elevated opacity-60" />
                  </div>
                </div>
                <div className="management-inspector__body space-y-6 flex-grow overflow-hidden">
                  <div className="management-inspector__hero flex gap-4">
                    <div className="management-inspector__artwork h-16 w-16 rounded-xl bg-bg-elevated flex items-center justify-center" />
                    <div className="management-inspector__title-block space-y-2 flex-grow">
                      <div className="h-5 w-40 rounded bg-bg-elevated" />
                      <div className="h-3.5 w-24 rounded bg-bg-elevated opacity-60" />
                      <div className="h-5.5 w-16 rounded bg-bg-elevated" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div
                        key={i}
                        className="flex justify-between items-center h-8 border-b border-border-subtle/30 px-1"
                        style={{ opacity: 1 - i * 0.15 }}
                      >
                        <div className="h-3.5 w-20 rounded bg-bg-elevated" />
                        <div className="h-3.5 w-32 rounded bg-bg-elevated" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </aside>
          </main>
        </div>
      </div>
    )
  }

  // 4. High-Fidelity Song Editor Screen Skeleton (0% Layout Shift)
  if (variant === 'editor') {
    return (
      <div
        className={`song-studio h-full w-full bg-bg-base overflow-hidden flex flex-col animate-pulse ${className || ''}`}
      >
        {/* Topbar */}
        <header className="song-studio__topbar flex items-center justify-between px-6 py-3 border-b border-border-subtle bg-bg-surface/50">
          <div className="song-studio__title-group flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-bg-elevated" />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="h-5 w-24 rounded bg-bg-elevated" />
                <div className="h-4.5 w-16 rounded bg-bg-elevated opacity-60" />
              </div>
              <div className="song-studio__breadcrumb flex gap-2">
                <div className="h-3 w-8 rounded bg-bg-elevated opacity-50" />
                <div className="h-3 w-12 rounded bg-bg-elevated opacity-50" />
                <div className="h-3 w-32 rounded bg-bg-elevated opacity-50" />
              </div>
            </div>
          </div>

          <div className="song-studio__broadcast-rack gap-4">
            <div className="h-7 w-28 rounded bg-bg-elevated" />
            <div className="h-7 w-28 rounded bg-bg-elevated" />
            <div className="h-7 w-20 rounded bg-bg-elevated" />
          </div>

          <div className="song-studio__status-cluster gap-3">
            <div className="h-8 w-16 rounded bg-bg-elevated opacity-50" />
            <div className="h-8 w-32 rounded bg-bg-elevated" />
          </div>
        </header>

        {/* Workspace Panels (split 28%, 45%, 27% widths for 0px shift) */}
        <div className="flex-1 flex min-h-0 overflow-hidden divide-x divide-border-subtle bg-bg-base">
          {/* Left Panel: 28% */}
          <aside className="w-[28%] shrink-0 song-studio__left-panel song-studio__panel flex flex-col p-4 space-y-6">
            {/* Informasi Dasar */}
            <div className="song-studio__section space-y-4">
              <div className="song-studio__section-heading pb-2 border-b border-border-subtle/50">
                <div className="space-y-1">
                  <div className="h-4 w-32 rounded bg-bg-elevated" />
                  <div className="h-3 w-48 rounded bg-bg-elevated opacity-60" />
                </div>
              </div>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <div className="h-3 w-16 rounded bg-bg-elevated opacity-50" />
                  <div className="h-10 w-full rounded bg-bg-surface border border-border-subtle/50" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <div className="h-3 w-12 rounded bg-bg-elevated opacity-50" />
                    <div className="h-10 w-full rounded bg-bg-surface border border-border-subtle/50" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="h-3 w-12 rounded bg-bg-elevated opacity-50" />
                    <div className="h-10 w-full rounded bg-bg-surface border border-border-subtle/50" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="h-3 w-20 rounded bg-bg-elevated opacity-50" />
                  <div className="h-10 w-full rounded bg-bg-surface border border-border-subtle/50" />
                </div>
              </div>
            </div>

            {/* Lirik & Struktur */}
            <div className="song-studio__section song-studio__lyrics-section flex-grow flex flex-col space-y-4 min-h-0">
              <div className="song-studio__section-heading pb-2 border-b border-border-subtle/50">
                <div className="space-y-1">
                  <div className="h-4 w-28 rounded bg-bg-elevated" />
                  <div className="h-3 w-40 rounded bg-bg-elevated opacity-60" />
                </div>
              </div>
              <div className="song-studio__chip-group flex gap-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-6 w-14 rounded-full bg-bg-elevated" />
                ))}
              </div>
              <div className="flex-grow w-full rounded bg-bg-surface border border-border-subtle/50 p-3" />
            </div>
          </aside>

          {/* Center Panel: 45% */}
          <section className="w-[45%] shrink-0 song-studio__center-panel song-studio__panel flex flex-col p-4">
            <div className="song-studio__panel-header pb-3 border-b border-border-subtle/50 flex justify-between items-center">
              <div className="space-y-1">
                <div className="h-4 w-24 rounded bg-bg-elevated" />
                <div className="h-3 w-56 rounded bg-bg-elevated opacity-60" />
              </div>
              <div className="flex gap-2">
                <div className="h-8 w-24 rounded bg-bg-elevated" />
                <div className="h-8 w-20 rounded bg-bg-elevated" />
              </div>
            </div>

            <div className="song-studio__slide-stack flex-grow overflow-hidden space-y-3 mt-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-16 w-full rounded-xl border border-border-subtle/50 bg-bg-surface/50 p-4 flex items-center justify-between"
                  style={{ opacity: 1 - i * 0.2 }}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-6 w-6 rounded bg-bg-elevated" />
                    <div className="h-4 w-32 bg-bg-elevated rounded" />
                    <div className="h-4 w-48 bg-bg-elevated rounded opacity-60" />
                  </div>
                  <div className="h-4 w-12 bg-bg-elevated rounded" />
                </div>
              ))}
            </div>
          </section>

          {/* Right Panel: 27% */}
          <aside className="w-[27%] shrink-0 song-studio__right-panel song-studio__panel flex flex-col p-4 space-y-6">
            <div className="song-studio__panel-header compact pb-2 border-b border-border-subtle/50">
              <div className="space-y-1">
                <div className="h-4 w-36 rounded bg-bg-elevated" />
                <div className="h-3 w-48 rounded bg-bg-elevated opacity-60" />
              </div>
            </div>

            <div className="song-studio__tabs flex border-b border-border-subtle/50">
              <div className="h-8 flex-grow bg-bg-elevated" />
              <div className="h-8 flex-grow bg-bg-surface" />
            </div>

            <div className="song-studio__preview-frame aspect-video w-full rounded-2xl bg-bg-surface border border-border-subtle/50 flex flex-col justify-between p-4 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-brand-primary/5 to-transparent" />
              <div className="h-4 w-20 rounded bg-bg-elevated" />
              <div className="space-y-2 py-4 flex flex-col items-center">
                <div className="h-4 w-2/3 rounded bg-bg-elevated" />
                <div className="h-4 w-1/2 rounded bg-bg-elevated" />
              </div>
              <div className="h-3 w-12 rounded bg-bg-elevated self-end opacity-50" />
            </div>

            <div className="flex-grow space-y-4">
              <div className="h-4 w-24 rounded bg-bg-elevated" />
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <div className="h-4.5 w-1/3 rounded bg-bg-elevated" />
                    <div className="h-4.5 w-1/4 rounded bg-bg-elevated" />
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    )
  }

  // 5. High-Fidelity Settings Screen Skeleton (0% Layout Shift)
  if (variant === 'settings') {
    return (
      <div
        className={`settings-shell animate-pulse bg-bg-base overflow-hidden flex flex-col h-full w-full ${className || ''}`}
      >
        <div className="settings-shell__ambient" />

        {/* Header */}
        <header className="settings-header flex items-center justify-between px-6 py-4 border-b border-border-subtle bg-bg-surface/50">
          <div className="settings-header__left flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-bg-elevated" />
            <div className="space-y-1">
              <div className="h-5 w-32 rounded bg-bg-elevated" />
              <div className="h-3 w-48 rounded bg-bg-elevated opacity-60" />
            </div>
          </div>
          <div className="settings-header__breadcrumb flex gap-2 items-center">
            <div className="h-3.5 w-24 rounded bg-bg-elevated opacity-50" />
            <div className="h-3 w-3 rounded bg-bg-elevated opacity-30" />
            <div className="h-3.5 w-16 rounded bg-bg-elevated" />
          </div>
        </header>

        {/* Body */}
        <div className="settings-body flex flex-1 min-h-0 overflow-hidden divide-x divide-border-subtle">
          {/* Sidebar nav */}
          <aside className="settings-sidebar w-80 shrink-0 p-4 flex flex-col space-y-4">
            <div className="settings-sidebar__search-wrap h-10 rounded-xl bg-bg-elevated/40 border border-border-subtle/50 flex items-center px-3" />
            <nav className="settings-sidebar__nav flex-grow space-y-2 mt-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-14 w-full rounded-xl bg-bg-surface/50 border border-border-subtle/30 p-3 flex items-center gap-3"
                  style={{ opacity: 1 - i * 0.12 }}
                >
                  <div className="h-6 w-6 rounded bg-bg-elevated" />
                  <div className="space-y-1 flex-grow">
                    <div className="h-4 w-20 rounded bg-bg-elevated" />
                    <div className="h-3 w-28 rounded bg-bg-elevated opacity-60" />
                  </div>
                </div>
              ))}
            </nav>
          </aside>

          {/* Content panel */}
          <main className="settings-content flex-grow p-6 overflow-hidden">
            <div className="settings-content__inner max-w-4xl space-y-6">
              <div className="space-y-2">
                <div className="h-6 w-40 rounded bg-bg-elevated" />
                <div className="h-4.5 w-72 rounded bg-bg-elevated opacity-60" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-32 rounded-2xl border border-border-subtle/50 bg-bg-surface p-4 flex flex-col justify-between"
                    style={{ opacity: 1 - i * 0.15 }}
                  >
                    <div className="h-4 w-24 rounded bg-bg-elevated" />
                    <div className="space-y-2">
                      <div className="h-8 w-full rounded bg-bg-elevated/60" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </main>
        </div>
      </div>
    )
  }

  // 6. High-Fidelity Import/Export Screen Skeleton (0% Layout Shift)
  if (variant === 'import-export') {
    return (
      <div
        className={`h-full w-full flex flex-col bg-bg-base overflow-hidden animate-pulse ${className || ''}`}
      >
        {/* Header */}
        <div className="h-14 flex items-center justify-between px-6 border-b border-border-default bg-bg-surface/50">
          <div className="flex items-center gap-4">
            <div className="h-8 w-8 rounded bg-bg-elevated" />
            <div className="h-5 w-40 rounded bg-bg-elevated" />
          </div>
        </div>

        {/* Content Cards */}
        <div className="flex-1 flex flex-col max-w-4xl w-full mx-auto p-8 justify-center">
          <div className="flex gap-8 h-80 items-center justify-center">
            {/* Import Box */}
            <div className="flex-grow bg-bg-surface rounded-xl border-2 border-dashed border-border-default p-10 flex flex-col items-center justify-center text-center h-80 space-y-4">
              <div className="h-12 w-12 rounded-full bg-bg-elevated" />
              <div className="h-6 w-36 rounded bg-bg-elevated" />
              <div className="h-4 w-48 rounded bg-bg-elevated opacity-60" />
            </div>

            {/* Export Box */}
            <div className="flex-grow bg-bg-surface rounded-xl border border-border-default p-10 flex flex-col items-center justify-center text-center h-80 space-y-4">
              <div className="h-12 w-12 rounded-full bg-bg-elevated" />
              <div className="h-6 w-32 rounded bg-bg-elevated" />
              <div className="h-4 w-48 rounded bg-bg-elevated opacity-60" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 7. High-Fidelity Bible Screen Skeleton (0% Layout Shift)
  if (variant === 'bible') {
    return (
      <div
        className={`flex h-full flex-col bg-bg-base overflow-hidden animate-pulse ${className || ''}`}
      >
        {/* Header */}
        <header className="flex items-center justify-between border-b border-border-default bg-bg-surface px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded bg-bg-elevated" />
            <div className="h-5 w-24 rounded bg-bg-elevated" />
          </div>
          <div className="h-9 w-32 rounded bg-bg-elevated" />
        </header>

        {/* Main Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Book Sidebar */}
          <aside className="w-48 border-r border-border-default bg-bg-surface overflow-y-auto p-2 space-y-4">
            <div className="h-3 w-24 rounded bg-bg-elevated opacity-50 ml-2" />
            <div className="space-y-1.5">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="h-8 w-full rounded bg-bg-elevated/40"
                  style={{ opacity: 1 - i * 0.1 }}
                />
              ))}
            </div>
          </aside>

          {/* Chapter & Verse Area */}
          <main className="flex-grow flex flex-col overflow-hidden">
            {/* Search Bar */}
            <div className="border-b border-border-default p-3">
              <div className="h-10 w-full rounded-md bg-bg-elevated" />
            </div>

            {/* Chapter Navigation */}
            <div className="flex items-center gap-2 border-b border-border-default bg-bg-surface px-4 py-2 justify-between">
              <div className="h-4.5 w-20 rounded bg-bg-elevated" />
              <div className="h-8 w-24 rounded bg-bg-elevated" />
            </div>

            {/* Verses Area */}
            <div className="flex-grow overflow-y-auto p-4 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-2" style={{ opacity: 1 - i * 0.15 }}>
                  <div className="h-4.5 w-full rounded bg-bg-elevated" />
                  <div className="h-4.5 w-5/6 rounded bg-bg-elevated opacity-60" />
                </div>
              ))}
            </div>
          </main>
        </div>
      </div>
    )
  }

  // 8. High-Fidelity Welcome/Onboarding Screen Loader (0% Layout Shift)
  if (variant === 'welcome') {
    return (
      <div
        className={`drag-area relative flex h-full w-full flex-col items-center justify-center overflow-hidden px-6 bg-bg-base text-text-primary animate-pulse ${className || ''}`}
      >
        {/* Volumetric glow volumetric behind logo placeholder */}
        <div className="absolute top-[22%] left-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 bg-[radial-gradient(circle,rgba(59,130,246,0.18),transparent_55%)] blur-[60px]" />

        <div className="no-drag-area relative z-10 flex flex-col items-center text-center gap-10">
          <div className="flex flex-col items-center gap-3">
            <div className="relative flex h-[96px] w-[96px] items-center justify-center bg-white/[0.03] border border-white/[0.06] rounded-2xl">
              <div className="h-12 w-12 rounded bg-bg-elevated" />
            </div>
            <div className="h-14 w-64 rounded bg-bg-elevated mt-4" />
            <div className="h-5 w-48 rounded bg-bg-elevated opacity-60" />
          </div>

          <div className="flex items-center gap-3 rounded-full bg-white/[0.04] px-5 py-2.5 backdrop-blur-sm ring-1 ring-white/[0.06] h-10 w-96 justify-center" />

          {/* Progress bar placeholder */}
          <div className="h-[3px] w-[200px] rounded-full bg-white/[0.06] overflow-hidden">
            <div className="h-full w-1/3 bg-brand-primary" />
          </div>
        </div>
      </div>
    )
  }

  // 9. Standard beautiful rounded item list loader for modal dialog tables (Fallback)
  return (
    <div className={`space-y-4 bg-bg-base p-4 ${className || ''}`}>
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="flex h-16 w-full items-center gap-4 rounded-xl border border-border-subtle bg-bg-surface p-4"
        >
          <div className="h-10 w-10 shrink-0 animate-pulse rounded-lg bg-bg-elevated" />
          <div className="flex-grow space-y-2">
            <div className="h-4 w-1/3 animate-pulse rounded bg-bg-elevated" />
            <div className="h-3 w-1/4 animate-pulse rounded bg-bg-elevated opacity-60" />
          </div>
          <div className="h-4 w-12 animate-pulse rounded bg-bg-elevated" />
        </motion.div>
      ))}
    </div>
  )
}
