import type { BaseScraperProvider } from './providers/BaseScraperProvider'
import type {
  ScraperProviderDefinition,
  ProviderValidationDiagnostics,
  ProviderHealthStatus
} from './types'
import { AlkitabAppProvider } from './providers/AlkitabAppProvider'
import { LaguSionProvider } from './providers/LaguSionProvider'

const providers: BaseScraperProvider[] = [new AlkitabAppProvider(), new LaguSionProvider()]

// Provider health state (in-memory, could be persisted later)
const providerHealth: Map<
  string,
  {
    status: ProviderHealthStatus
    lastValidatedAt?: string
    lastFailureReason?: string
    consecutiveFailures: number
    diagnostics?: ProviderValidationDiagnostics
  }
> = new Map()

// Initialize health state for all providers
for (const p of providers) {
  providerHealth.set(p.id, {
    status: 'UNKNOWN',
    consecutiveFailures: 0
  })
}

export function getScraperProviders(): BaseScraperProvider[] {
  return providers.slice()
}

export function getProviderById(providerId: string): BaseScraperProvider {
  const p = providers.find((x) => x.id === providerId)
  if (!p) throw new Error(`Unknown provider: ${providerId}`)
  return p
}

/**
 * Get extended provider definition with health and configuration
 */
export function getProviderDefinition(providerId: string): ScraperProviderDefinition {
  const provider = getProviderById(providerId)
  const health = providerHealth.get(providerId) ?? {
    status: 'UNKNOWN' as ProviderHealthStatus,
    consecutiveFailures: 0
  }

  return {
    id: provider.id,
    name: provider.label,
    version: provider.version,
    capabilities: provider.getCapabilities(),
    transport: provider.getTransport(),
    selectors: provider.getSelectors(),
    normalization: provider.getNormalization(),
    health: {
      status: health.status,
      lastValidatedAt: health.lastValidatedAt,
      lastFailureReason: health.lastFailureReason,
      consecutiveFailures: health.consecutiveFailures,
      diagnostics: health.diagnostics
    }
  }
}

/**
 * Get all provider definitions with health status
 */
export function getAllProviderDefinitions(): ScraperProviderDefinition[] {
  return providers.map((p) => getProviderDefinition(p.id))
}

/**
 * Validate a provider and update its health status
 */
export async function validateProvider(
  providerId: string,
  baseUrl?: string
): Promise<ProviderValidationDiagnostics> {
  const provider = getProviderById(providerId)

  try {
    const diagnostics = await provider.validateWithDiagnostics(baseUrl)

    // Update health state
    const health = providerHealth.get(providerId) ?? { status: 'UNKNOWN', consecutiveFailures: 0 }
    health.status = diagnostics.overallStatus
    health.lastValidatedAt = diagnostics.timestamp
    health.diagnostics = diagnostics

    if (diagnostics.overallStatus === 'OK') {
      health.consecutiveFailures = 0
      health.lastFailureReason = undefined
    } else if (diagnostics.errors.length > 0) {
      health.consecutiveFailures++
      health.lastFailureReason = diagnostics.errors[0]
    }

    providerHealth.set(providerId, health)

    return diagnostics
  } catch (err) {
    // Handle unexpected validation errors
    const health = providerHealth.get(providerId) ?? { status: 'UNKNOWN', consecutiveFailures: 0 }
    health.status = 'BROKEN'
    health.lastValidatedAt = new Date().toISOString()
    health.consecutiveFailures++
    health.lastFailureReason = err instanceof Error ? err.message : String(err)
    providerHealth.set(providerId, health)

    return {
      providerId,
      timestamp: new Date().toISOString(),
      overallStatus: 'BROKEN',
      selectorResults: [],
      fetchLatencyMs: 0,
      htmlSize: 0,
      warnings: [],
      errors: [health.lastFailureReason]
    }
  }
}

/**
 * Get provider health status
 */
export function getProviderHealth(providerId: string): ProviderHealthStatus {
  return providerHealth.get(providerId)?.status ?? 'UNKNOWN'
}

/**
 * Check if provider is healthy enough for use
 */
export function isProviderHealthy(providerId: string): boolean {
  const status = getProviderHealth(providerId)
  return status === 'OK' || status === 'DEGRADED'
}
