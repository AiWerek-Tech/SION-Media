import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BiblePanel } from '../BiblePanel'

describe('BiblePanel Electron layout', () => {
  beforeEach(() => {
    vi.mocked(window.api.biblePack.getVersions).mockResolvedValue([
      {
        versionCode: 'tb',
        name: 'Terjemahan Baru',
        shortName: 'TB',
        language: 'id',
        publisher: 'LAI',
        copyright: '© LAI 1974',
        booksCount: 66,
        chaptersCount: 1189,
        versesCount: 31102,
        fts5Created: true,
        packId: 'tb',
        isDefault: true
      }
    ])
    vi.mocked(window.api.biblePack.getBooks).mockResolvedValue([
      {
        code: 'GEN',
        osis_id: 'Gen',
        name: 'Kejadian',
        chapters: 1,
        testament: 'OT',
        order: 1
      },
      {
        code: 'MAT',
        osis_id: 'Matt',
        name: 'Matius',
        chapters: 1,
        testament: 'NT',
        order: 40
      }
    ])
    vi.mocked(window.api.biblePack.getChapter).mockResolvedValue([
      {
        book_code: 'GEN',
        book_name: 'Kejadian',
        chapter: 1,
        verse: 1,
        text: 'Pada mulanya Allah menciptakan langit dan bumi.'
      }
    ])
  })

  it('uses one compact control bar and a dedicated scroll viewport for every mode', async () => {
    const user = userEvent.setup()
    const { container } = render(<BiblePanel />)

    await screen.findByRole('button', { name: 'Pilih versi Alkitab, TB' })
    expect(screen.queryByText('Mini Alkitab', { exact: false })).not.toBeInTheDocument()
    expect(container.querySelector('.projection-bible-panel__control-bar')).toBeInTheDocument()
    expect(
      container.querySelector('.projection-bible-panel__mode-scroll--search')
    ).toBeInTheDocument()

    expect(screen.queryByRole('button', { name: 'Manual' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Pilih Ayat' }))
    expect(
      container.querySelector('.projection-bible-panel__mode-scroll--browse')
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Kitab' })).not.toBeInTheDocument()
  })

  it('provides a vertically scrollable verse viewport without clipping panel controls', async () => {
    const user = userEvent.setup()
    const { container } = render(<BiblePanel />)

    expect(container.querySelector('.projection-bible-panel')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Pilih Ayat' }))
    await user.click(await screen.findByRole('button', { name: 'Kejadian' }))
    expect(screen.getByRole('button', { name: 'Kitab' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '1' }))
    await screen.findByText('Pada mulanya Allah menciptakan langit dan bumi.')

    await waitFor(() => {
      expect(container.querySelector('.projection-bible-panel__verse-scroll')).toBeInTheDocument()
    })
  })

  it('keeps history collapsed until requested and gives its list an isolated scroll viewport', async () => {
    const user = userEvent.setup()
    const { container } = render(<BiblePanel />)

    await user.click(screen.getByRole('button', { name: 'Pilih Ayat' }))
    await user.click(await screen.findByRole('button', { name: 'Kejadian' }))
    await user.click(screen.getByRole('button', { name: '1' }))
    await user.click(await screen.findByText('Pada mulanya Allah menciptakan langit dan bumi.'))
    await user.click(screen.getByRole('button', { name: 'Preview' }))

    const historyToggle = await screen.findByRole('button', { name: 'Riwayat, 1 item' })
    expect(historyToggle).toHaveAttribute('aria-expanded', 'false')
    expect(container.querySelector('.projection-bible-panel__history-list')).not.toBeInTheDocument()

    await user.click(historyToggle)
    expect(historyToggle).toHaveAttribute('aria-expanded', 'true')
    expect(container.querySelector('.projection-bible-panel__history-list')).toBeInTheDocument()

    await user.click(screen.getByText('Kejadian 1:1'))
    expect(historyToggle).toHaveAttribute('aria-expanded', 'false')
    expect(container.querySelector('.projection-bible-panel__history-list')).not.toBeInTheDocument()
  })

  it('filters browse books by Old and New Testament toggles', async () => {
    const user = userEvent.setup()
    render(<BiblePanel />)

    await user.click(await screen.findByRole('button', { name: 'Pilih Ayat' }))
    expect(await screen.findByRole('button', { name: 'Kejadian' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Matius' })).toBeInTheDocument()

    await user.click(screen.getByRole('checkbox', { name: 'PL' }))
    expect(screen.queryByRole('button', { name: 'Kejadian' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Matius' })).toBeInTheDocument()

    await user.click(screen.getByRole('checkbox', { name: 'PB' }))
    await user.click(screen.getByRole('checkbox', { name: 'PL' }))
    expect(screen.getByRole('button', { name: 'Kejadian' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Matius' })).not.toBeInTheDocument()
  })
})
