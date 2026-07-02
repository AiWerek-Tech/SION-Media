/* eslint-disable react/prop-types */
/**
 * ModalRegistry — Phase 3 Full Implementation
 *
 * Renders the active modal stack from useModalStore.
 * Replaces the Phase 2 stub.
 *
 * Modal type → component mapping:
 *   'confirm'          → ConfirmDialog
 *   'create-playlist'  → CreatePlaylistDialog
 *   'crash-recovery'   → CrashRecoveryDialog
 *   'playlist-picker'  → PlaylistPickerDialog
 *
 * @see implementation-master-order-v1.md §3.4 Phase 3
 */

import React, { useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useModalStore } from '../../store/useModalStore'
import { ConfirmDialog } from './ConfirmDialog'
import { CreatePlaylistDialog } from './CreatePlaylistDialog'
import { CrashRecoveryDialog } from './CrashRecoveryDialog'
import { PlaylistPickerDialog } from './PlaylistPickerDialog'
import { SongRelationsModal } from './SongRelationsModal'
import { ExportSongDialog } from './ExportSongDialog'
import { TagManagerDialog } from './TagManagerDialog'
import { SceneConfigDialog } from './SceneConfigDialog'
import { ImportProgressDialog } from './ImportProgressDialog'
import { DuplicateSongDialog } from './DuplicateSongDialog'
import { IntegrityCheckDialog } from './IntegrityCheckDialog'
import type { RecoveryState, Playlist, Song } from '../../types'

/** Render the correct modal component based on entry.type */
function ModalRenderer({
  entry
}: {
  entry: { id: string; type: string; props?: Record<string, unknown> }
}): React.JSX.Element | null {
  const { id, type, props = {} } = entry

  switch (type) {
    case 'confirm':
      return (
        <ConfirmDialog
          id={id}
          title={(props.title as string) ?? 'Konfirmasi'}
          description={props.description as string | undefined}
          confirmLabel={props.confirmLabel as string | undefined}
          cancelLabel={props.cancelLabel as string | undefined}
          danger={(props.danger as boolean) ?? false}
          onConfirm={props.onConfirm as (() => Promise<void>) | undefined}
        />
      )

    case 'create-playlist':
      return <CreatePlaylistDialog id={id} />

    case 'crash-recovery':
      return (
        <CrashRecoveryDialog
          id={id}
          recoveryState={props.recoveryState as RecoveryState}
          onRestore={props.onRestore as () => void}
          onDismiss={props.onDismiss as () => void}
        />
      )

    case 'playlist-picker':
      return (
        <PlaylistPickerDialog
          id={id}
          onSelect={props.onSelect as ((playlist: Playlist) => void) | undefined}
        />
      )

    case 'song-relations':
      return <SongRelationsModal id={id} />

    case 'export-song':
      return <ExportSongDialog id={id} songs={props.songs as Song[]} />

    case 'tag-manager':
      return <TagManagerDialog id={id} />

    case 'scene-config':
      return <SceneConfigDialog id={id} />

    case 'import-progress':
      return (
        <ImportProgressDialog
          id={id}
          rawText={props.rawText as string}
          targetHymnalId={props.targetHymnalId as number}
        />
      )

    case 'duplicate-song':
      return <DuplicateSongDialog id={id} song={props.song as Song} />

    case 'integrity-check':
      return <IntegrityCheckDialog id={id} />

    default:
      return null
  }
}

export function ModalRegistry(): React.JSX.Element | null {
  const stack = useModalStore((s) => s.stack)

  // Listen for sion:create-playlist custom event (from TitleBarMenu DUI-002)
  useEffect(() => {
    const handler = (): void => {
      const store = useModalStore.getState()
      if (!store.isOpen('create-playlist')) {
        store.open('create-playlist', 'create-playlist')
      }
    }
    document.addEventListener('sion:create-playlist', handler)
    return () => document.removeEventListener('sion:create-playlist', handler)
  }, [])

  if (stack.length === 0) return null

  return (
    <AnimatePresence mode="sync">
      {stack.map((entry) => (
        <ModalRenderer key={entry.id} entry={entry} />
      ))}
    </AnimatePresence>
  )
}
