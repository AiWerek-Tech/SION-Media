export type StageTextFit = 'hero' | 'comfortable' | 'compact' | 'dense'

export function getStageTextFit(text: string): StageTextFit {
  const score = text.trim().length + Math.max(0, text.split(/\n|;/).length - 1) * 24
  if (score <= 72) return 'hero'
  if (score <= 150) return 'comfortable'
  if (score <= 260) return 'compact'
  return 'dense'
}

export function cleanStageBibleText(text: string): string {
  return text.replace(/^\s*\[\d+\]\s*/, '').trim()
}

export function stageTextFitClass(fit: StageTextFit): string {
  switch (fit) {
    case 'hero':
      return 'text-[clamp(48px,6.4vw,112px)] leading-[1.04]'
    case 'comfortable':
      return 'text-[clamp(42px,5.2vw,88px)] leading-[1.08]'
    case 'compact':
      return 'text-[clamp(34px,4.2vw,68px)] leading-[1.12]'
    case 'dense':
      return 'text-[clamp(27px,3.25vw,52px)] leading-[1.16]'
  }
}
