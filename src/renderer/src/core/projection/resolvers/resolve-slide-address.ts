/**
 * Semantic Slide Address Resolver
 *
 * Pure deterministic resolver for semantic slide addresses.
 * Used by projection state machine for canonical address resolution.
 *
 * @module resolvers/resolve-slide-address
 */

import type { SlideData, SlideAddress, SectionIndexMap, ResolvedSlideTarget } from '@renderer/types'
import { resolveSlideAddress as resolveAddress } from '../slideAddressResolver'

/**
 * Resolve a slide address deterministically from snapshot state
 *
 * Pure function: identical inputs → identical output
 * Safe for: state machine reducers, replay engine, deterministic validation
 *
 * @param address - The slide address to resolve
 * @param slides - Current slides array (program slides for live navigation)
 * @param sectionMap - Section name → slide indices mapping
 * @param currentIndex - Current slide index (for relative navigation)
 * @returns Resolved target with slide index and metadata
 */
export function resolveSlideAddressDeterministically(
  address: SlideAddress,
  slides: SlideData[],
  sectionMap: SectionIndexMap,
  currentIndex: number
): ResolvedSlideTarget {
  return resolveAddress(address, slides, sectionMap, currentIndex)
}

/**
 * Validate that a slide address resolves successfully
 *
 * @param address - The slide address to validate
 * @param slides - Current slides array
 * @param sectionMap - Section mapping
 * @param currentIndex - Current slide index
 * @returns true if address resolves to a valid slide index
 */
export function isSlideAddressValid(
  address: SlideAddress,
  slides: SlideData[],
  sectionMap: SectionIndexMap,
  currentIndex: number
): boolean {
  const result = resolveSlideAddressDeterministically(address, slides, sectionMap, currentIndex)
  return result.found && result.slideIndex !== null && result.slideIndex >= 0
}
