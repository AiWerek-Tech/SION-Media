import { describe, expect, it } from 'vitest'
import { doesContentFit, findLargestFittingFontSize } from '../bibleAutoFit'

describe('findLargestFittingFontSize', () => {
  it('keeps the requested size when the complete verse fits', () => {
    expect(findLargestFittingFontSize(96, 32, () => true)).toBe(96)
  })

  it('finds the largest safe size below an oversized operator setting', () => {
    expect(findLargestFittingFontSize(200, 32, (size) => size <= 84)).toBe(84)
  })

  it('never shrinks below the readable minimum', () => {
    expect(findLargestFittingFontSize(200, 32, () => false)).toBe(32)
  })
})

describe('doesContentFit', () => {
  it('accepts content whose 100% width exactly matches its viewport', () => {
    expect(
      doesContentFit({
        contentScrollWidth: 1440,
        contentScrollHeight: 500,
        viewportWidth: 1440,
        viewportHeight: 700
      })
    ).toBe(true)
  })

  it('rejects genuine horizontal or vertical overflow', () => {
    expect(
      doesContentFit({
        contentScrollWidth: 1441,
        contentScrollHeight: 500,
        viewportWidth: 1440,
        viewportHeight: 700
      })
    ).toBe(false)
    expect(
      doesContentFit({
        contentScrollWidth: 1440,
        contentScrollHeight: 701,
        viewportWidth: 1440,
        viewportHeight: 700
      })
    ).toBe(false)
  })
})
