export function findLargestFittingFontSize(
  requestedSize: number,
  minimumSize: number,
  fits: (fontSize: number) => boolean
): number {
  const minimum = Math.max(1, Math.floor(minimumSize))
  const requested = Math.max(minimum, Math.floor(requestedSize))
  if (fits(requested)) return requested

  let low = minimum
  let high = requested - 1
  let best = minimum
  while (low <= high) {
    const candidate = Math.floor((low + high) / 2)
    if (fits(candidate)) {
      best = candidate
      low = candidate + 1
    } else {
      high = candidate - 1
    }
  }
  return best
}

interface ContentFitMeasurements {
  contentScrollWidth: number
  contentScrollHeight: number
  viewportWidth: number
  viewportHeight: number
}

export function doesContentFit({
  contentScrollWidth,
  contentScrollHeight,
  viewportWidth,
  viewportHeight
}: ContentFitMeasurements): boolean {
  return contentScrollWidth <= viewportWidth && contentScrollHeight <= viewportHeight
}
