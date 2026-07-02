/**
 * Animation Presets — Foundation System Architecture §1.6.3
 *
 * Standardized Framer Motion animation configurations.
 * Use these instead of inline animation objects for consistency.
 */

/** Fade in/out transition */
export const ANIMATION_FADE = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.2 }
} as const

/** Slide up transition */
export const ANIMATION_SLIDE_UP = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] }
} as const

/** Scale in/out transition */
export const ANIMATION_SCALE = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
  transition: { duration: 0.2 }
} as const

/** Spring physics configuration */
export const ANIMATION_SPRING = {
  type: 'spring' as const,
  stiffness: 400,
  damping: 30
} as const

/** Modal dialog animation */
export const ANIMATION_MODAL = {
  initial: { opacity: 0, scale: 0.96, y: 8 },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] }
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    y: 8,
    transition: { duration: 0.15 }
  }
} as const

/** Backdrop overlay animation */
export const ANIMATION_BACKDROP = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.15 } },
  exit: { opacity: 0, transition: { duration: 0.15 } }
} as const

/** Slide from right (settings/overlays) */
export const ANIMATION_SLIDE_RIGHT = {
  initial: { opacity: 0, x: 100 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 100 },
  transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] }
} as const

/** Slide from bottom (import/export) */
export const ANIMATION_SLIDE_BOTTOM = {
  initial: { opacity: 0, y: 100 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 100 },
  transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] }
} as const

/**
 * Complete animation presets map.
 * Usage: `<motion.div {...ANIMATION_PRESETS.fade} />`
 */
export const ANIMATION_PRESETS = {
  fade: ANIMATION_FADE,
  slideUp: ANIMATION_SLIDE_UP,
  scale: ANIMATION_SCALE,
  spring: ANIMATION_SPRING,
  modal: ANIMATION_MODAL,
  backdrop: ANIMATION_BACKDROP,
  slideRight: ANIMATION_SLIDE_RIGHT,
  slideBottom: ANIMATION_SLIDE_BOTTOM
} as const
