import { describe, expect, test } from 'vitest'
import { generateSlides } from '../slideEngine'

describe('song lyric presentation formatting', () => {
  test('joins source lyric lines with semicolons into flowing slide text', () => {
    const slides = generateSlides(
      501,
      ['[VERSE 1]', 'Kasih Tuhan tidak berkesudahan', 'Rahmat-Nya selalu baru', 'Setiap pagi'].join(
        '\n'
      ),
      { maxLines: 4, maxChars: 80 }
    )

    expect(slides).toHaveLength(1)
    expect(slides[0].text).toBe(
      'Kasih Tuhan tidak berkesudahan; Rahmat-Nya selalu baru; Setiap pagi'
    )
    expect(slides[0].text).not.toContain('\n')
  })

  test('does not add duplicate semicolons to already formatted lyric lines', () => {
    const slides = generateSlides(502, '[CHORUS]\nHaleluya;\nPuji Tuhan', {
      maxLines: 4,
      maxChars: 80
    })

    expect(slides[0].text).toBe('Haleluya; Puji Tuhan')
  })

  test('keeps slide boundaries and section labels intact', () => {
    const slides = generateSlides(
      503,
      ['[VERSE 1]', 'Baris satu', 'Baris dua', 'Baris tiga'].join('\n'),
      { maxLines: 2, maxChars: 80 }
    )

    expect(slides.map((slide) => slide.text)).toEqual(['Baris satu; Baris dua', 'Baris tiga'])
    expect(slides.every((slide) => slide.sectionLabel === 'VERSE 1')).toBe(true)
  })

  test('does not insert a semicolon at an automatic word-wrap boundary', () => {
    const slides = generateSlides(504, '[VERSE 1]\nKasih Tuhan memenuhi seluruh hidup kita', {
      maxLines: 4,
      maxChars: 18
    })

    expect(slides[0].text).toBe('Kasih Tuhan memenuhi seluruh hidup kita')
  })

  test('never moves half of a singable line to the next slide', () => {
    const slides = generateSlides(
      505,
      '[VERSE 1]\nSatu baris lagu yang sangat panjang dan harus tetap dinyanyikan sebagai satu kalimat; Baris berikutnya',
      { maxLines: 2, maxChars: 18 }
    )

    expect(slides).toHaveLength(2)
    expect(slides[0].text).toBe(
      'Satu baris lagu yang sangat panjang dan harus tetap dinyanyikan sebagai satu kalimat'
    )
    expect(slides[1].text).toBe('Baris berikutnya')
  })
})
