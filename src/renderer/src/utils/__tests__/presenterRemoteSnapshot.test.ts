import { describe, expect, it } from 'vitest'
import {
  attachPresenterRemoteVisualDataUrl,
  getPresenterRemotePdfVisualKey,
  summarizePresenterRemoteSlide
} from '../presenterRemoteSnapshot'
import type { SlideData } from '@renderer/types'

describe('summarizePresenterRemoteSlide', () => {
  it('uses the media title from sectionLabel when slide text is empty', () => {
    const slide: SlideData = {
      contentType: 'media',
      songId: null,
      playlistItemId: 1,
      slideIndex: 0,
      text: '',
      sectionLabel: 'KKR H3',
      mediaKind: 'image',
      mediaSourcePath: 'C:\\Media\\H3.png'
    }

    expect(summarizePresenterRemoteSlide(slide, '')).toEqual({
      text: 'KKR H3',
      label: 'Media',
      contentType: 'media',
      mediaKind: 'image',
      mediaSourcePath: 'C:\\Media\\H3.png',
      canPresenterNavigate: false
    })
  })

  it('keeps info body as the main text and title as label', () => {
    const slide: SlideData = {
      contentType: 'custom',
      songId: null,
      playlistItemId: 2,
      slideIndex: 0,
      text: 'Putri Lokobal',
      sectionLabel: 'Doa Buka'
    }

    expect(summarizePresenterRemoteSlide(slide, '')).toEqual({
      text: 'Putri Lokobal',
      label: 'Doa Buka',
      contentType: 'custom',
      canPresenterNavigate: false
    })
  })

  it('adds a PDF visual descriptor from pdfPath', () => {
    const slide: SlideData = {
      contentType: 'media',
      songId: null,
      playlistItemId: 3,
      slideIndex: 1,
      text: '',
      sectionLabel: 'Halaman 2',
      pdfPath: 'C:\\Media\\seminar.pdf',
      mediaKind: 'pdf',
      mediaSourcePath: 'C:\\Media\\seminar.pdf'
    }

    expect(summarizePresenterRemoteSlide(slide, '')).toEqual({
      text: 'Halaman 2',
      label: 'Media',
      visualType: 'pdf',
      visualPath: 'C:\\Media\\seminar.pdf',
      pageNumber: 2,
      contentType: 'media',
      mediaKind: 'pdf',
      mediaSourcePath: 'C:\\Media\\seminar.pdf',
      canPresenterNavigate: true
    })
  })

  it('builds a stable PDF visual key from path and page number', () => {
    const slide: SlideData = {
      contentType: 'custom',
      songId: null,
      playlistItemId: 3,
      slideIndex: 4,
      text: '',
      sectionLabel: 'Halaman 5',
      pdfPath: 'C:\\Media\\seminar.pdf'
    }

    expect(getPresenterRemotePdfVisualKey(slide)).toBe('C:\\Media\\seminar.pdf::5')
  })

  it('attaches rendered PDF image data without losing slide metadata', () => {
    expect(
      attachPresenterRemoteVisualDataUrl(
        {
          text: 'Halaman 2',
          label: 'Media',
          visualType: 'pdf',
          visualPath: 'C:\\Media\\seminar.pdf',
          pageNumber: 2,
          contentType: 'custom',
          canPresenterNavigate: true
        },
        'data:image/jpeg;base64,remote-pdf-page'
      )
    ).toEqual({
      text: 'Halaman 2',
      label: 'Media',
      visualType: 'image',
      visualPath: 'C:\\Media\\seminar.pdf',
      visualDataUrl: 'data:image/jpeg;base64,remote-pdf-page',
      pageNumber: 2,
      contentType: 'custom',
      canPresenterNavigate: true
    })
  })

  it('adds an image visual descriptor from media background config', () => {
    const slide: SlideData = {
      contentType: 'media',
      songId: null,
      playlistItemId: 4,
      slideIndex: 0,
      text: '',
      sectionLabel: 'KKR H3',
      mediaKind: 'image',
      mediaSourcePath: 'C:\\Media\\H3.png'
    }
    const config = JSON.stringify({
      mode: 'image',
      media: { path: 'C:\\Media\\H3.png' }
    })

    expect(summarizePresenterRemoteSlide(slide, config)).toEqual({
      text: 'KKR H3',
      label: 'Media',
      visualType: 'image',
      visualPath: 'C:\\Media\\H3.png',
      contentType: 'media',
      mediaKind: 'image',
      mediaSourcePath: 'C:\\Media\\H3.png',
      canPresenterNavigate: false
    })
  })

  it('prefers imported PPTX slide images over PDF render for presenter clients', () => {
    const slide: SlideData = {
      contentType: 'media',
      songId: null,
      playlistItemId: 5,
      slideIndex: 2,
      text: '',
      sectionLabel: 'Slide 3',
      pdfPath: 'C:\\Media\\deck.pdf',
      visualImagePath: 'C:\\AppData\\presentation-packages\\deck\\slides\\slide3.png',
      mediaKind: 'presentation',
      mediaSourcePath: 'C:\\Media\\deck.pdf'
    }

    expect(summarizePresenterRemoteSlide(slide, '')).toEqual({
      text: 'Slide 3',
      label: 'Media',
      visualType: 'image',
      visualPath: 'C:\\AppData\\presentation-packages\\deck\\slides\\slide3.png',
      pageNumber: 3,
      contentType: 'media',
      mediaKind: 'presentation',
      mediaSourcePath: 'C:\\Media\\deck.pdf',
      canPresenterNavigate: true
    })
  })
})
