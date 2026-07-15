import { describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({ app: { getPath: () => 'C:\\temp' } }))

import { extractSlideTitle, extractSpeakerNotes, getOrderedSlidePaths } from './pptx-package'

describe('PPTX package parser', () => {
  it('resolves slides using presentation relationship order', () => {
    const presentation =
      '<p:presentation><p:sldIdLst><p:sldId r:id="rId2"/><p:sldId r:id="rId1"/></p:sldIdLst></p:presentation>'
    const relationships =
      '<Relationships><Relationship Id="rId1" Target="slides/slide1.xml"/><Relationship Id="rId2" Target="slides/slide2.xml"/></Relationships>'
    expect(getOrderedSlidePaths(presentation, relationships)).toEqual([
      'ppt/slides/slide2.xml',
      'ppt/slides/slide1.xml'
    ])
  })

  it('extracts only speaker-note body text', () => {
    const xml =
      '<p:notes><p:cSld><p:spTree><p:sp><p:nvSpPr><p:nvPr><p:ph type="body"/></p:nvPr></p:nvSpPr><p:txBody><a:p><a:r><a:t>Baris pertama</a:t></a:r></a:p><a:p><a:r><a:t>Baris kedua</a:t></a:r></a:p></p:txBody></p:sp><p:sp><p:nvSpPr><p:nvPr><p:ph type="sldNum"/></p:nvPr></p:nvSpPr><p:txBody><a:p><a:r><a:t>99</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld></p:notes>'
    expect(extractSpeakerNotes(xml)).toBe('Baris pertama\nBaris kedua')
  })

  it('extracts the title placeholder', () => {
    const xml =
      '<p:sld><p:cSld><p:spTree><p:sp><p:nvSpPr><p:nvPr><p:ph type="title"/></p:nvPr></p:nvSpPr><p:txBody><a:p><a:r><a:t>Iman yang Melangkah</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld></p:sld>'
    expect(extractSlideTitle(xml)).toBe('Iman yang Melangkah')
  })
})
