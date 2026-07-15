export interface PlaylistCompositionInput {
  song_id: number | null
  item_type?: string
}

export interface PlaylistComposition {
  songs: number
  bible: number
  info: number
  media: number
}

export function getPlaylistComposition(items: PlaylistCompositionInput[]): PlaylistComposition {
  return items.reduce(
    (summary, item) => {
      if (item.item_type === 'bible') summary.bible += 1
      else if (item.item_type === 'info') summary.info += 1
      else if (item.item_type === 'media') summary.media += 1
      else summary.songs += 1
      return summary
    },
    { songs: 0, bible: 0, info: 0, media: 0 }
  )
}
