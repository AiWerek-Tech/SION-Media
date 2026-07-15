/**
 * Runtime Command Bus
 *
 * Unified command routing for all runtime operations.
 * Single entry point for: keyboard, UI, MIDI, Stream Deck, remote apps.
 *
 * Capabilities:
 * - Command validation → execution → event emission pipeline
 * - Filtered event subscriptions (onExecuted / onRejected)
 * - Command metadata registry for Command Palette integration
 * - Audit log with configurable retention
 * - Correlation IDs for distributed tracing
 *
 * @module runtimeCommandBus
 */

// ============================================================================
// Command Types
// ============================================================================

/**
 * Runtime Command Type - All possible runtime operations
 */
export type RuntimeCommandType =
  // Navigation Commands
  | 'NAV_NEXT_SLIDE'
  | 'NAV_PREV_SLIDE'
  | 'NAV_GOTO_SLIDE'
  | 'NAV_GOTO_SECTION'
  | 'NAV_GOTO_ADDRESS'
  | 'NAV_CUE_NEXT'
  | 'NAV_CUE_PREV'
  | 'NAV_CUE_GOTO'
  | 'NAV_CUE_GOTO_ADDRESS'
  | 'NAV_LIVE_GOTO'
  | 'NAV_LIVE_GOTO_ADDRESS'
  | 'NAV_QUICK_JUMP'

  // Projection State Commands
  | 'PROJ_TAKE_CUE'
  | 'PROJ_BLACK'
  | 'PROJ_FREEZE'
  | 'PROJ_CLEAR'
  | 'PROJ_LIVE'

  // Timer Commands
  | 'TIMER_START'
  | 'TIMER_STOP'
  | 'TIMER_RESET'

  // Protection Commands
  | 'PROTECTION_UPDATE_LIVE'
  | 'PROTECTION_DISCARD'

  // Next State Commands
  | 'NEXT_LOAD_SONG'
  | 'NEXT_CLEAR'

/**
 * Command Source - Where the command originated
 */
export type CommandSource =
  | 'KEYBOARD'
  | 'UI_BUTTON'
  | 'PRESENTER_REMOTE'
  | 'QUICK_JUMP'
  | 'COMMAND_PALETTE'
  | 'MIDI'
  | 'STREAM_DECK'
  | 'REMOTE_APP'
  | 'WEBSOCKET'
  | 'AUTOMATION'
  | 'MACRO'

/**
 * Runtime Command - Unified command structure
 */
export interface RuntimeCommand {
  /** Command type */
  type: RuntimeCommandType
  /** Command payload (type-dependent) */
  payload?: RuntimeCommandPayload
  /** Where the command came from */
  source: CommandSource
  /** Timestamp when command was issued */
  timestamp: number
  /** Optional correlation ID for tracking */
  correlationId?: string
}

/**
 * Runtime Command Payload - Flexible payload structure
 */
export type RuntimeCommandPayload = Record<string, unknown>

/**
 * Runtime Event - Emitted after command execution
 */
export interface RuntimeEvent {
  id: string
  /** The command that triggered this event */
  command: RuntimeCommand
  status: 'SUCCESS' | 'BLOCKED' | 'ERROR'
  level: 'INFO' | 'WARN' | 'ERROR'
  durationMs?: number
  /** Whether execution succeeded */
  success: boolean
  /** Result data (if any) */
  result?: unknown
  /** Error message (if failed) */
  error?: string
  /** Timestamp when event was emitted */
  timestamp: number
}

/**
 * Handler output (draft) — handlers can omit fields that the bus can derive.
 */
export type RuntimeEventDraft = {
  id?: string
  command?: RuntimeCommand
  status?: RuntimeEvent['status']
  level?: RuntimeEvent['level']
  durationMs?: number
  success: boolean
  result?: unknown
  error?: string
  timestamp?: number
}

/**
 * Command Metadata — Human-readable info for Command Palette and documentation
 */
export interface CommandMetadata {
  /** Human-readable label (e.g. "Black Out") */
  label: string
  /** Short description */
  description: string
  /** Category for grouping in palette */
  category: 'navigation' | 'projection' | 'timer' | 'protection' | 'next' | 'system'
  /** Keyboard shortcut hint (display only) */
  shortcut?: string
  /** Lucide icon name */
  icon?: string
  /** Whether this command is dangerous (affects live output) */
  dangerous?: boolean
  /** Whether to show in command palette */
  paletteVisible?: boolean
}

/**
 * Event Stream Filter
 */
export interface RuntimeEventFilter {
  /** Filter by command type(s) */
  types?: RuntimeCommandType[]
  /** Filter by source(s) */
  sources?: CommandSource[]
  /** Filter by success/failure */
  success?: boolean
}

/**
 * Command Handler - Function that executes a command
 */
type CommandHandler = (command: RuntimeCommand) => RuntimeEventDraft

/**
 * Command Validator - Function that validates a command before execution
 */
type CommandValidator = (command: RuntimeCommand) => {
  valid: boolean
  error?: string
  status?: 'BLOCKED' | 'ERROR'
}

// ============================================================================
// Command Bus Implementation
// ============================================================================

/**
 * Runtime Command Bus
 *
 * Central routing for all runtime commands.
 * Provides: validation, execution, logging, event emission.
 *
 * Enhanced with:
 * - Filtered event subscriptions (onExecuted / onRejected)
 * - Command metadata registry for Command Palette
 * - Dual audit log (commands + events) with configurable retention
 */
class RuntimeCommandBus {
  private handlers: Map<RuntimeCommandType, CommandHandler> = new Map()
  private validators: Map<RuntimeCommandType, CommandValidator> = new Map()
  private eventListeners: Set<(event: RuntimeEvent) => void> = new Set()
  private filteredListeners: Map<(event: RuntimeEvent) => void, RuntimeEventFilter> = new Map()
  private metadataRegistry: Map<RuntimeCommandType, CommandMetadata> = new Map()
  private commandLog: RuntimeCommand[] = []
  private eventLog: RuntimeEvent[] = []
  private maxLogSize = 200

  // Throttling & Locking
  private isExecuting: boolean = false
  private lastExecutionTimes: Map<string, number> = new Map()
  private globalCooldownMs = 50 // Minimum time between any commands
  private perCommandCooldownMs = 150 // Minimum time between same command from same source

  /**
   * Register a handler for a command type
   */
  registerHandler(type: RuntimeCommandType, handler: CommandHandler): void {
    this.handlers.set(type, handler)
  }

  /**
   * Register a validator for a command type
   */
  registerValidator(type: RuntimeCommandType, validator: CommandValidator): void {
    this.validators.set(type, validator)
  }

  /**
   * Subscribe to runtime events (unfiltered)
   */
  subscribe(listener: (event: RuntimeEvent) => void): () => void {
    this.eventListeners.add(listener)
    return () => this.eventListeners.delete(listener)
  }

  /**
   * Subscribe with a filter — only matching events are delivered
   */
  subscribeFiltered(
    listener: (event: RuntimeEvent) => void,
    filter: RuntimeEventFilter
  ): () => void {
    this.filteredListeners.set(listener, filter)
    return () => this.filteredListeners.delete(listener)
  }

  /**
   * Register metadata for a command type (used by Command Palette)
   */
  registerMetadata(type: RuntimeCommandType, metadata: CommandMetadata): void {
    this.metadataRegistry.set(type, metadata)
  }

  /**
   * Get metadata for a command type
   */
  getMetadata(type: RuntimeCommandType): CommandMetadata | undefined {
    return this.metadataRegistry.get(type)
  }

  /**
   * Get all registered command metadata
   */
  getAllMetadata(): Map<RuntimeCommandType, CommandMetadata> {
    return new Map(this.metadataRegistry)
  }

  /**
   * Get palette-visible commands grouped by category
   */
  getPaletteCommands(): Array<{ type: RuntimeCommandType; meta: CommandMetadata }> {
    const result: Array<{ type: RuntimeCommandType; meta: CommandMetadata }> = []
    this.metadataRegistry.forEach((meta, type) => {
      if (meta.paletteVisible !== false) {
        result.push({ type, meta })
      }
    })
    return result
  }

  /**
   * Execute a runtime command
   *
   * Flow: throttle/lock → validate → execute → emit event → log
   */
  execute(command: RuntimeCommand): RuntimeEvent {
    const start = performance.now()
    const now = Date.now()
    const throttleKey = `${command.type}:${command.source}`

    // 1. Reentrancy Lock (Atomicity)
    if (this.isExecuting) {
      return this.rejectCommand(
        command,
        'BLOCKED',
        'Command bus is currently executing another command (reentrancy blocked)',
        start
      )
    }

    // 2. Throttling / Cooldown (Double trigger protection)
    const lastExecution = this.lastExecutionTimes.get(throttleKey) || 0
    if (now - lastExecution < this.perCommandCooldownMs) {
      return this.rejectCommand(
        command,
        'BLOCKED',
        `Command ${command.type} throttled (cooldown ${this.perCommandCooldownMs}ms)`,
        start
      )
    }

    // 3. Global Cooldown (Flood protection)
    const lastAnyExecution = this.lastExecutionTimes.get('__GLOBAL__') || 0
    if (now - lastAnyExecution < this.globalCooldownMs) {
      return this.rejectCommand(
        command,
        'BLOCKED',
        `Command bus throttled (global cooldown ${this.globalCooldownMs}ms)`,
        start
      )
    }

    // Lock the bus
    this.isExecuting = true
    this.lastExecutionTimes.set(throttleKey, now)
    this.lastExecutionTimes.set('__GLOBAL__', now)

    try {
      // Validate
      const validator = this.validators.get(command.type)
      if (validator) {
        const validation = validator(command)
        if (!validation.valid) {
          return this.rejectCommand(
            command,
            validation.status ?? 'BLOCKED',
            validation.error || 'Validation failed',
            start
          )
        }
      }

      // Execute
      const handler = this.handlers.get(command.type)
      if (!handler) {
        return this.rejectCommand(
          command,
          'ERROR',
          `No handler registered for command: ${command.type}`,
          start
        )
      }
      let rawEvent: RuntimeEventDraft
      try {
        rawEvent = handler(command)
      } catch (err) {
        return this.rejectCommand(
          command,
          'ERROR',
          `Handler execution failed: ${String(err)}`,
          start
        )
      }

      const event: RuntimeEvent = {
        id: rawEvent.id || this.generateEventId(),
        command: rawEvent.command || command,
        status: rawEvent.success ? 'SUCCESS' : rawEvent.status || 'ERROR',
        level:
          rawEvent.level ||
          this.levelFromStatus(rawEvent.success ? 'SUCCESS' : rawEvent.status || 'ERROR'),
        durationMs: rawEvent.durationMs ?? this.roundDuration(performance.now() - start),
        success: rawEvent.success,
        result: rawEvent.result,
        error: rawEvent.error,
        timestamp: rawEvent.timestamp || Date.now()
      }

      // Emit event
      this.emitEvent(event)

      // Log command + event
      this.logCommand(command)
      this.logEvent(event)

      return event
    } finally {
      // Unlock the bus
      this.isExecuting = false
    }
  }

  private rejectCommand(
    command: RuntimeCommand,
    status: 'BLOCKED' | 'ERROR',
    error: string,
    start: number
  ): RuntimeEvent {
    const event: RuntimeEvent = {
      id: this.generateEventId(),
      command,
      status,
      level: this.levelFromStatus(status),
      durationMs: this.roundDuration(performance.now() - start),
      success: false,
      error,
      timestamp: Date.now()
    }
    this.emitEvent(event)
    this.logEvent(event)

    return event
  }

  /**
   * Create a command with auto-generated fields
   */
  createCommand(
    type: RuntimeCommandType,
    payload?: RuntimeCommandPayload,
    source: CommandSource = 'UI_BUTTON'
  ): RuntimeCommand {
    return {
      type,
      payload,
      source,
      timestamp: Date.now(),
      correlationId: this.generateCorrelationId()
    }
  }

  /**
   * Get recent command log
   */
  getCommandLog(limit: number = 20): RuntimeCommand[] {
    return this.commandLog.slice(-limit)
  }

  /**
   * Get recent event log (includes both success and failure)
   */
  getEventLog(limit: number = 50): RuntimeEvent[] {
    return this.eventLog.slice(-limit)
  }

  /**
   * Set max retention for runtime events (and command log) in memory
   */
  setMaxRetention(maxEvents: number): void {
    this.maxLogSize = Math.max(1, Math.floor(maxEvents))
    this.pruneLogs()
  }

  /**
   * Clear all logs
   */
  clearLog(): void {
    this.commandLog = []
    this.eventLog = []
  }

  /**
   * Check if a handler is registered for a command type
   */
  hasHandler(type: RuntimeCommandType): boolean {
    return this.handlers.has(type)
  }

  // Private methods

  private emitEvent(event: RuntimeEvent): void {
    // Emit to unfiltered listeners
    this.eventListeners.forEach((listener) => {
      try {
        listener(event)
      } catch (err) {
        console.error('[CommandBus] Event listener error:', err)
      }
    })

    // Emit to filtered listeners
    this.filteredListeners.forEach((filter, listener) => {
      if (this.matchesFilter(event, filter)) {
        try {
          listener(event)
        } catch (err) {
          console.error('[CommandBus] Filtered listener error:', err)
        }
      }
    })
  }

  private matchesFilter(event: RuntimeEvent, filter: RuntimeEventFilter): boolean {
    if (filter.success !== undefined && event.success !== filter.success) return false
    if (filter.types && !filter.types.includes(event.command.type)) return false
    if (filter.sources && !filter.sources.includes(event.command.source)) return false
    return true
  }

  private logCommand(command: RuntimeCommand): void {
    this.commandLog.push(command)
    this.pruneCommandLog()
  }

  private logEvent(event: RuntimeEvent): void {
    this.eventLog.push(event)
    this.pruneEventLog()
  }

  private pruneLogs(): void {
    this.pruneCommandLog()
    this.pruneEventLog()
  }

  private pruneCommandLog(): void {
    while (this.commandLog.length > this.maxLogSize) this.commandLog.shift()
  }

  private pruneEventLog(): void {
    while (this.eventLog.length > this.maxLogSize) this.eventLog.shift()
  }

  private levelFromStatus(status: RuntimeEvent['status']): RuntimeEvent['level'] {
    switch (status) {
      case 'SUCCESS':
        return 'INFO'
      case 'BLOCKED':
        return 'WARN'
      case 'ERROR':
      default:
        return 'ERROR'
    }
  }

  private generateCorrelationId(): string {
    return `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private roundDuration(durationMs: number): number {
    return Math.round(durationMs * 1000) / 1000
  }
}

// Singleton instance
export const commandBus = new RuntimeCommandBus()

// ============================================================================
// Runtime Event Store — Stable API (Read-only consumers)
// ============================================================================

export const DEFAULT_MAX_RUNTIME_EVENTS = 200

export function setRuntimeEventRetention(maxEvents: number): void {
  commandBus.setMaxRetention(maxEvents)
}

export function getRuntimeEvents(): RuntimeEvent[] {
  return commandBus.getEventLog(DEFAULT_MAX_RUNTIME_EVENTS)
}

export function getRecentRuntimeEvents(limit: number = 50): RuntimeEvent[] {
  return commandBus.getEventLog(limit)
}

export function getRuntimeEventsBySource(
  source: CommandSource,
  limit: number = 50
): RuntimeEvent[] {
  return commandBus
    .getEventLog(DEFAULT_MAX_RUNTIME_EVENTS)
    .filter((e) => e.command.source === source)
    .slice(-limit)
}

export function getRuntimeEventsByStatus(
  status: RuntimeEvent['status'],
  limit: number = 50
): RuntimeEvent[] {
  return commandBus
    .getEventLog(DEFAULT_MAX_RUNTIME_EVENTS)
    .filter((e) => e.status === status)
    .slice(-limit)
}

export function getLastRejectedEvent(): RuntimeEvent | null {
  const events = commandBus.getEventLog(DEFAULT_MAX_RUNTIME_EVENTS)
  for (let i = events.length - 1; i >= 0; i--) {
    if (!events[i].success) return events[i]
  }
  return null
}

export function getLastSuccessfulEvent(): RuntimeEvent | null {
  const events = commandBus.getEventLog(DEFAULT_MAX_RUNTIME_EVENTS)
  for (let i = events.length - 1; i >= 0; i--) {
    if (events[i].success) return events[i]
  }
  return null
}

export function getRuntimeErrorCount(): number {
  return commandBus.getEventLog(DEFAULT_MAX_RUNTIME_EVENTS).filter((e) => e.status === 'ERROR')
    .length
}

export function clearRuntimeEvents(): void {
  commandBus.clearLog()
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Execute a command with auto-generated structure
 */
export function executeRuntimeCommand(
  type: RuntimeCommandType,
  payload?: RuntimeCommandPayload,
  source: CommandSource = 'UI_BUTTON'
): RuntimeEvent {
  const command = commandBus.createCommand(type, payload, source)
  return commandBus.execute(command)
}

/**
 * Create a command without executing
 */
export function createRuntimeCommand(
  type: RuntimeCommandType,
  payload?: RuntimeCommandPayload,
  source: CommandSource = 'UI_BUTTON'
): RuntimeCommand {
  return commandBus.createCommand(type, payload, source)
}

/**
 * Subscribe to all runtime events
 */
export function subscribeToRuntimeEvents(listener: (event: RuntimeEvent) => void): () => void {
  return commandBus.subscribe(listener)
}

/**
 * Subscribe only to successfully executed commands
 */
export function onRuntimeCommandExecuted(listener: (event: RuntimeEvent) => void): () => void {
  return commandBus.subscribeFiltered(listener, { success: true })
}

/**
 * Subscribe only to rejected/failed commands
 */
export function onRuntimeCommandRejected(listener: (event: RuntimeEvent) => void): () => void {
  return commandBus.subscribeFiltered(listener, { success: false })
}

/**
 * Subscribe to specific command type events
 */
export function onRuntimeCommand(
  types: RuntimeCommandType | RuntimeCommandType[],
  listener: (event: RuntimeEvent) => void
): () => void {
  const typeArray = Array.isArray(types) ? types : [types]
  return commandBus.subscribeFiltered(listener, { types: typeArray })
}

/**
 * Get palette-visible commands for Command Palette integration
 */
export function getPaletteCommands(): Array<{
  type: RuntimeCommandType
  meta: CommandMetadata
}> {
  return commandBus.getPaletteCommands()
}

/**
 * Get recent event log for audit/debug
 */
export function getEventLog(limit?: number): RuntimeEvent[] {
  return commandBus.getEventLog(limit)
}

// ============================================================================
// Pre-built Command Factories
// ============================================================================

export const commands = {
  // Navigation
  quickJump: (source: CommandSource = 'UI_BUTTON') =>
    createRuntimeCommand('NAV_QUICK_JUMP', undefined, source),

  nextSlide: (source: CommandSource = 'UI_BUTTON') =>
    createRuntimeCommand('NAV_NEXT_SLIDE', undefined, source),

  prevSlide: (source: CommandSource = 'UI_BUTTON') =>
    createRuntimeCommand('NAV_PREV_SLIDE', undefined, source),

  goToSlide: (slideIndex: number, source: CommandSource = 'UI_BUTTON') =>
    createRuntimeCommand('NAV_GOTO_SLIDE', { slideIndex }, source),

  goToSection: (section: string, source: CommandSource = 'UI_BUTTON') =>
    createRuntimeCommand('NAV_GOTO_SECTION', { section }, source),

  cueNext: (source: CommandSource = 'UI_BUTTON') =>
    createRuntimeCommand('NAV_CUE_NEXT', undefined, source),

  cuePrev: (source: CommandSource = 'UI_BUTTON') =>
    createRuntimeCommand('NAV_CUE_PREV', undefined, source),

  cueGoToAddress: (address: unknown, source: CommandSource = 'UI_BUTTON') =>
    createRuntimeCommand('NAV_CUE_GOTO_ADDRESS', { address }, source),

  liveGoTo: (slideIndex: number, source: CommandSource = 'UI_BUTTON') =>
    createRuntimeCommand('NAV_LIVE_GOTO', { slideIndex }, source),

  liveGoToAddress: (address: unknown, source: CommandSource = 'UI_BUTTON') =>
    createRuntimeCommand('NAV_LIVE_GOTO_ADDRESS', { address }, source),

  // Projection
  takeCue: (source: CommandSource = 'UI_BUTTON') =>
    createRuntimeCommand('PROJ_TAKE_CUE', undefined, source),

  black: (source: CommandSource = 'UI_BUTTON') =>
    createRuntimeCommand('PROJ_BLACK', undefined, source),

  freeze: (source: CommandSource = 'UI_BUTTON') =>
    createRuntimeCommand('PROJ_FREEZE', undefined, source),

  clear: (source: CommandSource = 'UI_BUTTON') =>
    createRuntimeCommand('PROJ_CLEAR', undefined, source),

  live: (source: CommandSource = 'UI_BUTTON') =>
    createRuntimeCommand('PROJ_LIVE', undefined, source),

  // Timer
  timerStart: (source: CommandSource = 'UI_BUTTON') =>
    createRuntimeCommand('TIMER_START', undefined, source),

  timerStop: (source: CommandSource = 'UI_BUTTON') =>
    createRuntimeCommand('TIMER_STOP', undefined, source),

  timerReset: (source: CommandSource = 'UI_BUTTON') =>
    createRuntimeCommand('TIMER_RESET', undefined, source)
}

// ============================================================================
// Command Metadata Registry — Powers the Command Palette
// ============================================================================

/**
 * Register all command metadata.
 * Called once during app initialization alongside handler registration.
 */
export function registerCommandMetadata(): void {
  const meta: Array<[RuntimeCommandType, CommandMetadata]> = [
    // ── Navigation ──
    [
      'NAV_NEXT_SLIDE',
      {
        label: 'Next Slide (Live)',
        description: 'Advance to the next slide on live output',
        category: 'navigation',
        shortcut: '→',
        icon: 'ChevronRight',
        dangerous: true,
        paletteVisible: true
      }
    ],
    [
      'NAV_PREV_SLIDE',
      {
        label: 'Previous Slide (Live)',
        description: 'Go back to the previous slide on live output',
        category: 'navigation',
        shortcut: '←',
        icon: 'ChevronLeft',
        dangerous: true,
        paletteVisible: true
      }
    ],
    [
      'NAV_CUE_NEXT',
      {
        label: 'Cue Next',
        description: 'Advance the preview cue to the next slide',
        category: 'navigation',
        shortcut: 'Shift+→',
        icon: 'SkipForward',
        paletteVisible: true
      }
    ],
    [
      'NAV_CUE_PREV',
      {
        label: 'Cue Previous',
        description: 'Move the preview cue to the previous slide',
        category: 'navigation',
        shortcut: 'Shift+←',
        icon: 'SkipBack',
        paletteVisible: true
      }
    ],
    [
      'NAV_GOTO_SLIDE',
      {
        label: 'Go to Slide…',
        description: 'Jump live output to a specific slide number',
        category: 'navigation',
        icon: 'Hash',
        dangerous: true,
        paletteVisible: false
      }
    ],
    [
      'NAV_GOTO_SECTION',
      {
        label: 'Go to Section…',
        description: 'Jump live output to a named section',
        category: 'navigation',
        icon: 'Music',
        dangerous: true,
        paletteVisible: false
      }
    ],
    [
      'NAV_QUICK_JUMP',
      {
        label: 'Quick Jump',
        description: 'Open the Quick Jump navigation overlay',
        category: 'navigation',
        shortcut: 'Ctrl+G',
        icon: 'Navigation',
        paletteVisible: true
      }
    ],

    // ── Projection ──
    [
      'PROJ_TAKE_CUE',
      {
        label: 'Take',
        description: 'Send current preview cue to live output',
        category: 'projection',
        shortcut: 'Space',
        icon: 'Zap',
        dangerous: true,
        paletteVisible: true
      }
    ],
    [
      'PROJ_BLACK',
      {
        label: 'Black Out',
        description: 'Toggle black screen on live output',
        category: 'projection',
        shortcut: 'B',
        icon: 'Square',
        dangerous: true,
        paletteVisible: true
      }
    ],
    [
      'PROJ_FREEZE',
      {
        label: 'Freeze',
        description: 'Toggle freeze on live output',
        category: 'projection',
        shortcut: 'F',
        icon: 'Snowflake',
        dangerous: true,
        paletteVisible: true
      }
    ],
    [
      'PROJ_CLEAR',
      {
        label: 'Clear Output',
        description: 'Clear all content from live output',
        category: 'projection',
        shortcut: 'Esc',
        icon: 'XCircle',
        dangerous: true,
        paletteVisible: true
      }
    ],
    [
      'PROJ_LIVE',
      {
        label: 'Go Live',
        description: 'Resume live output with current program slide',
        category: 'projection',
        icon: 'Radio',
        dangerous: true,
        paletteVisible: true
      }
    ],

    // ── Timer ──
    [
      'TIMER_START',
      {
        label: 'Timer Start',
        description: 'Start the confidence monitor timer',
        category: 'timer',
        icon: 'Play',
        paletteVisible: true
      }
    ],
    [
      'TIMER_STOP',
      {
        label: 'Timer Stop',
        description: 'Stop the confidence monitor timer',
        category: 'timer',
        icon: 'Pause',
        paletteVisible: true
      }
    ],
    [
      'TIMER_RESET',
      {
        label: 'Timer Reset',
        description: 'Reset the confidence monitor timer to zero',
        category: 'timer',
        icon: 'RotateCcw',
        paletteVisible: true
      }
    ],

    // ── Protection ──
    [
      'PROTECTION_UPDATE_LIVE',
      {
        label: 'Update Live',
        description: 'Apply pending changes to live output',
        category: 'protection',
        shortcut: 'Ctrl+Enter',
        icon: 'RefreshCw',
        dangerous: true,
        paletteVisible: true
      }
    ],
    [
      'PROTECTION_DISCARD',
      {
        label: 'Discard Changes',
        description: 'Discard pending changes and revert to live state',
        category: 'protection',
        shortcut: 'Ctrl+Esc',
        icon: 'Undo2',
        paletteVisible: true
      }
    ],

    // ── Next State ──
    [
      'NEXT_LOAD_SONG',
      {
        label: 'Load Next Song',
        description: 'Pre-load a song into the next queue',
        category: 'next',
        icon: 'ListPlus',
        paletteVisible: false
      }
    ],
    [
      'NEXT_CLEAR',
      {
        label: 'Clear Next Queue',
        description: 'Remove the queued next song',
        category: 'next',
        icon: 'ListX',
        paletteVisible: true
      }
    ]
  ]

  meta.forEach(([type, metadata]) => {
    commandBus.registerMetadata(type, metadata)
  })
}
