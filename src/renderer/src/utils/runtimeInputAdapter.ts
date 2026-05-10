/**
 * Runtime Input Adapter Architecture
 *
 * Unified interface for all external input sources.
 * Provides: connection lifecycle, command emission, health monitoring, correlation tracking.
 *
 * Architecture:
 *   MIDI / Stream Deck / Remote / WebSocket / Automation
 *            ↓
 *   RuntimeInputAdapter (interface)
 *            ↓
 *   RuntimeCommandBus (execution)
 *            ↓
 *   Event Stream + Inspector
 *
 * @module runtimeInputAdapter
 */

import type { RuntimeCommand, RuntimeCommandType, CommandSource } from './runtimeCommandBus'
import { commandBus } from './runtimeCommandBus'

// ============================================================================
// Input Adapter Types
// ============================================================================

/**
 * Runtime Input Adapter Interface
 *
 * All external input sources must implement this interface.
 * Provides unified lifecycle, health, and command emission.
 */
export interface RuntimeInputAdapter {
  /** Unique adapter identifier */
  id: string

  /** Human-readable name */
  name: string

  /** Command source type this adapter produces */
  source: CommandSource

  /** Connection state */
  isConnected: boolean

  /** Last activity timestamp */
  lastActivity: number | null

  /** Connect to input source */
  connect(): Promise<AdapterConnectionResult>

  /** Disconnect from input source */
  disconnect(): Promise<void>

  /** Get current health status */
  getHealth(): AdapterHealth

  /** Get input mapping configuration */
  getMappings(): InputMapping[]

  /** Update input mapping */
  setMappings(mappings: InputMapping[]): void

  /** Enable/disable adapter */
  setEnabled(enabled: boolean): void

  /** Check if adapter is enabled */
  isEnabled(): boolean

  /** Dispose adapter resources */
  dispose(): void
}

/**
 * Adapter Connection Result
 */
export interface AdapterConnectionResult {
  success: boolean
  error?: string
  metadata?: Record<string, unknown>
}

/**
 * Adapter Health Status
 */
export interface AdapterHealth {
  /** Adapter ID */
  adapterId: string

  /** Connection status */
  connected: boolean

  /** Enabled status */
  enabled: boolean

  /** Latency in milliseconds (if measurable) */
  latencyMs: number | null

  /** Number of commands emitted since connect */
  commandsEmitted: number

  /** Number of commands dropped/rejected */
  commandsDropped: number

  /** Last error message */
  lastError: string | null

  /** Last error timestamp */
  lastErrorTime: number | null

  /** Last successful command timestamp */
  lastSuccessTime: number | null

  /** Device metadata (if applicable) */
  deviceInfo?: {
    name?: string
    manufacturer?: string
    firmware?: string
    serialNumber?: string
  }

  /** Reconnect count */
  reconnectCount: number

  /** Timestamp of last health update */
  timestamp: number
}

/**
 * Input Mapping - Maps physical input to runtime command
 */
export interface InputMapping {
  /** Unique mapping ID */
  id: string

  /** Physical input identifier (device-specific) */
  inputId: string

  /** Human-readable label */
  label: string

  /** Target command type */
  commandType: RuntimeCommandType

  /** Optional payload for command */
  payload?: Record<string, unknown>

  /** Whether this mapping is active */
  enabled: boolean

  /** Modifier conditions (e.g., shift, ctrl) */
  modifiers?: InputModifier[]

  /** Description for UI */
  description?: string
}

/**
 * Input Modifier
 */
export interface InputModifier {
  type: 'shift' | 'ctrl' | 'alt' | 'custom'
  value?: string
}

/**
 * Input Event - Raw input from device
 */
export interface InputEvent {
  /** Source adapter ID */
  adapterId: string

  /** Physical input ID */
  inputId: string

  /** Input type */
  type: 'button' | 'key' | 'note' | 'cc' | 'pitch' | 'trigger'

  /** Input value (velocity, pressure, etc.) */
  value: number

  /** Timestamp */
  timestamp: number

  /** Active modifiers */
  modifiers?: InputModifier[]
}

// ============================================================================
// Base Adapter Implementation
// ============================================================================

/**
 * Base Runtime Input Adapter
 *
 * Provides common functionality for all adapters.
 * Extend this class to implement specific device protocols.
 */
export abstract class BaseRuntimeInputAdapter implements RuntimeInputAdapter {
  abstract id: string
  abstract name: string
  abstract source: CommandSource

  protected _isConnected: boolean = false
  protected _isEnabled: boolean = true
  protected _lastActivity: number | null = null
  protected _mappings: InputMapping[] = []
  protected _commandsEmitted: number = 0
  protected _commandsDropped: number = 0
  protected _lastError: string | null = null
  protected _lastErrorTime: number | null = null
  protected _lastSuccessTime: number | null = null
  protected _reconnectCount: number = 0
  protected _deviceInfo: AdapterHealth['deviceInfo']

  get isConnected(): boolean {
    return this._isConnected
  }

  get lastActivity(): number | null {
    return this._lastActivity
  }

  abstract connect(): Promise<AdapterConnectionResult>
  abstract disconnect(): Promise<void>

  getHealth(): AdapterHealth {
    return {
      adapterId: this.id,
      connected: this._isConnected,
      enabled: this._isEnabled,
      latencyMs: null, // Override in subclass if measurable
      commandsEmitted: this._commandsEmitted,
      commandsDropped: this._commandsDropped,
      lastError: this._lastError,
      lastErrorTime: this._lastErrorTime,
      lastSuccessTime: this._lastSuccessTime,
      deviceInfo: this._deviceInfo,
      reconnectCount: this._reconnectCount,
      timestamp: Date.now()
    }
  }

  getMappings(): InputMapping[] {
    return [...this._mappings]
  }

  setMappings(mappings: InputMapping[]): void {
    this._mappings = mappings
  }

  setEnabled(enabled: boolean): void {
    this._isEnabled = enabled
  }

  isEnabled(): boolean {
    return this._isEnabled
  }

  dispose(): void {
    this._mappings = []
    this._isConnected = false
  }

  /**
   * Emit a command to the runtime bus
   *
   * This is the core method that all adapters use to send commands.
   * Handles correlation ID propagation and health tracking.
   */
  protected emitCommand(
    commandType: RuntimeCommandType,
    payload?: Record<string, unknown>,
    _inputEvent?: InputEvent // TODO: Use for correlation chain in Inspector
  ): RuntimeCommand {
    const command = commandBus.createCommand(commandType, payload, this.source)

    // Track activity
    this._lastActivity = Date.now()

    // Execute command
    const event = commandBus.execute(command)

    // Track health metrics
    if (event.success) {
      this._commandsEmitted++
      this._lastSuccessTime = Date.now()
    } else {
      this._commandsDropped++
      this._lastError = event.error ?? 'Unknown error'
      this._lastErrorTime = Date.now()
    }

    return command
  }

  /**
   * Process raw input event and emit mapped command
   */
  protected processInput(inputEvent: InputEvent): RuntimeCommand | null {
    if (!this._isEnabled || !this._isConnected) {
      return null
    }

    // Find matching mapping
    const mapping = this.findMapping(inputEvent)
    if (!mapping || !mapping.enabled) {
      return null
    }

    // Check modifiers
    if (mapping.modifiers && !this.checkModifiers(inputEvent, mapping.modifiers)) {
      return null
    }

    // Emit command
    return this.emitCommand(mapping.commandType, mapping.payload, inputEvent)
  }

  /**
   * Find mapping for input event
   */
  protected findMapping(inputEvent: InputEvent): InputMapping | undefined {
    return this._mappings.find((m) => m.inputId === inputEvent.inputId)
  }

  /**
   * Check if modifiers match
   */
  protected checkModifiers(inputEvent: InputEvent, required: InputModifier[]): boolean {
    if (!inputEvent.modifiers) return required.length === 0

    return required.every((req) =>
      inputEvent.modifiers!.some((m) => m.type === req.type && (req.value === undefined || m.value === req.value))
    )
  }

  /**
   * Record error for health tracking
   */
  protected recordError(error: string): void {
    this._lastError = error
    this._lastErrorTime = Date.now()
  }

  /**
   * Record reconnect for health tracking
   */
  protected recordReconnect(): void {
    this._reconnectCount++
  }

  /**
   * Set device info
   */
  protected setDeviceInfo(info: AdapterHealth['deviceInfo']): void {
    this._deviceInfo = info
  }
}

// ============================================================================
// Adapter Registry
// ============================================================================

/**
 * Runtime Input Adapter Registry
 *
 * Manages all registered input adapters.
 * Provides unified health monitoring and lifecycle management.
 */
class InputAdapterRegistry {
  private adapters: Map<string, RuntimeInputAdapter> = new Map()

  /**
   * Register an adapter
   */
  register(adapter: RuntimeInputAdapter): void {
    if (this.adapters.has(adapter.id)) {
      console.warn(`[InputAdapterRegistry] Adapter ${adapter.id} already registered, replacing`)
    }
    this.adapters.set(adapter.id, adapter)
  }

  /**
   * Unregister an adapter
   */
  unregister(adapterId: string): void {
    const adapter = this.adapters.get(adapterId)
    if (adapter) {
      adapter.dispose()
      this.adapters.delete(adapterId)
    }
  }

  /**
   * Get adapter by ID
   */
  get(adapterId: string): RuntimeInputAdapter | undefined {
    return this.adapters.get(adapterId)
  }

  /**
   * Get all adapters
   */
  getAll(): RuntimeInputAdapter[] {
    return Array.from(this.adapters.values())
  }

  /**
   * Get all enabled adapters
   */
  getEnabled(): RuntimeInputAdapter[] {
    return this.getAll().filter((a) => a.isEnabled())
  }

  /**
   * Get all connected adapters
   */
  getConnected(): RuntimeInputAdapter[] {
    return this.getAll().filter((a) => a.isConnected)
  }

  /**
   * Get health status for all adapters
   */
  getAllHealth(): AdapterHealth[] {
    return this.getAll().map((a) => a.getHealth())
  }

  /**
   * Connect all registered adapters
   */
  async connectAll(): Promise<Map<string, AdapterConnectionResult>> {
    const results = new Map<string, AdapterConnectionResult>()

    for (const adapter of this.adapters.values()) {
      try {
        const result = await adapter.connect()
        results.set(adapter.id, result)
      } catch (error) {
        results.set(adapter.id, {
          success: false,
          error: String(error)
        })
      }
    }

    return results
  }

  /**
   * Disconnect all adapters
   */
  async disconnectAll(): Promise<void> {
    await Promise.all(
      Array.from(this.adapters.values()).map(async (adapter) => {
        try {
          await adapter.disconnect()
        } catch (error) {
          console.error(`[InputAdapterRegistry] Error disconnecting ${adapter.id}:`, error)
        }
      })
    )
  }

  /**
   * Dispose all adapters
   */
  disposeAll(): void {
    this.adapters.forEach((adapter) => adapter.dispose())
    this.adapters.clear()
  }

  /**
   * Get aggregate metrics
   */
  getAggregateMetrics(): {
    totalAdapters: number
    connectedCount: number
    enabledCount: number
    totalCommandsEmitted: number
    totalCommandsDropped: number
    totalReconnects: number
  } {
    const healths = this.getAllHealth()

    return {
      totalAdapters: healths.length,
      connectedCount: healths.filter((h) => h.connected).length,
      enabledCount: healths.filter((h) => h.enabled).length,
      totalCommandsEmitted: healths.reduce((sum, h) => sum + h.commandsEmitted, 0),
      totalCommandsDropped: healths.reduce((sum, h) => sum + h.commandsDropped, 0),
      totalReconnects: healths.reduce((sum, h) => sum + h.reconnectCount, 0)
    }
  }
}

// Singleton registry
export const inputAdapterRegistry = new InputAdapterRegistry()

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Get health status for Inspector integration
 */
export function getInputAdapterHealth(): AdapterHealth[] {
  return inputAdapterRegistry.getAllHealth()
}

/**
 * Get aggregate metrics for Inspector integration
 */
export function getInputAdapterMetrics(): ReturnType<InputAdapterRegistry['getAggregateMetrics']> {
  return inputAdapterRegistry.getAggregateMetrics()
}

/**
 * Register an input adapter
 */
export function registerInputAdapter(adapter: RuntimeInputAdapter): void {
  inputAdapterRegistry.register(adapter)
}

/**
 * Unregister an input adapter
 */
export function unregisterInputAdapter(adapterId: string): void {
  inputAdapterRegistry.unregister(adapterId)
}
