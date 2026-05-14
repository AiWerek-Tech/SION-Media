/**
 * Vitest renderer test setup
 *
 * Provides:
 * - @testing-library/jest-dom matchers
 * - Mock window.api (IPC bridge) — all channels return safe defaults
 * - Mock window.electron
 *
 * Usage: imported automatically via vitest.config.ts setupFiles
 */

import '@testing-library/jest-dom'
import { vi, afterEach } from 'vitest'

// ============================================================================
// Mock window.api — complete IPC bridge mock
// All methods return safe defaults. Override per-test with vi.mocked().
// ============================================================================

const mockApi = {
  window: {
    minimize: vi.fn(),
    maximize: vi.fn(),
    close: vi.fn(),
    isMaximized: vi.fn().mockResolvedValue(false),
    onMaximizedChanged: vi.fn().mockReturnValue(() => {})
  },

  appTheme: {
    setMode: vi.fn(),
    onUpdated: vi.fn().mockReturnValue(() => {})
  },

  projection: {
    slideUpdate: vi.fn(),
    stateChange: vi.fn(),
    themeUpdate: vi.fn(),
    show: vi.fn(),
    hide: vi.fn(),
    onSlideUpdate: vi.fn().mockReturnValue(() => {}),
    onStateChange: vi.fn().mockReturnValue(() => {}),
    onThemeUpdate: vi.fn().mockReturnValue(() => {})
  },

  stage: {
    show: vi.fn(),
    hide: vi.fn()
  },

  display: {
    getAll: vi
      .fn()
      .mockResolvedValue([{ id: 1, label: 'Primary', width: 1920, height: 1080, isPrimary: true }]),
    isProjectionVisible: vi.fn().mockResolvedValue(false),
    onDisplayChanged: vi.fn().mockReturnValue(() => {})
  },

  hymnals: {
    getAll: vi.fn().mockResolvedValue([]),
    add: vi.fn().mockResolvedValue({ id: 1, code: 'LS', name: 'Lagu Sion' }),
    update: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue(true)
  },

  songs: {
    getAll: vi.fn().mockResolvedValue([]),
    search: vi.fn().mockResolvedValue([]),
    add: vi.fn().mockResolvedValue({ id: 1 }),
    importJson: vi.fn().mockResolvedValue({
      total: 0,
      inserted: 0,
      skipped: 0,
      conflicts: 0,
      failed: 0,
      errors: []
    }),
    update: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue(true),
    clearLyrics: vi.fn().mockResolvedValue(0),
    bulkAssignBackground: vi.fn().mockResolvedValue(0),
    toggleFavorite: vi.fn().mockResolvedValue({}),
    getRelations: vi.fn().mockResolvedValue([]),
    addRelation: vi.fn().mockResolvedValue({}),
    deleteRelation: vi.fn().mockResolvedValue(true)
  },

  playlists: {
    getAll: vi.fn().mockResolvedValue([]),
    add: vi.fn().mockResolvedValue({
      id: 1,
      name: 'Test',
      service_date: '',
      description: '',
      created_at: '',
      updated_at: ''
    }),
    update: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue(true),
    getItems: vi.fn().mockResolvedValue([]),
    addItem: vi.fn().mockResolvedValue({ id: 1 }),
    updateItem: vi.fn().mockResolvedValue(undefined),
    deleteItem: vi.fn().mockResolvedValue(true),
    reorderItems: vi.fn().mockResolvedValue(undefined)
  },

  settings: {
    getAll: vi.fn().mockResolvedValue({}),
    update: vi.fn().mockResolvedValue(undefined)
  },

  system: {
    logHistory: vi.fn().mockResolvedValue(undefined),
    getRecentSongs: vi.fn().mockResolvedValue([]),
    createBackup: vi.fn().mockResolvedValue('/path/to/backup.db'),
    restoreBackup: vi.fn().mockResolvedValue(true),
    saveSession: vi.fn().mockResolvedValue(undefined),
    getRecoveryState: vi.fn().mockResolvedValue({ needsRecovery: false }),
    markCleanExit: vi.fn().mockResolvedValue(undefined),
    reseed: vi.fn().mockResolvedValue(undefined),
    checkMultiHymnalIntegrity: vi.fn().mockResolvedValue({
      generatedAt: '',
      totalHymnals: 0,
      totalSongs: 0,
      orphanSongs: 0,
      orphanSample: [],
      hymnals: []
    }),
    getMemory: vi.fn().mockResolvedValue({ private: 0, shared: 0 }),
    setMode: vi.fn().mockResolvedValue(undefined)
  },

  file: {
    parseExcel: vi.fn().mockResolvedValue([]),
    showSaveDialog: vi.fn().mockResolvedValue({ canceled: true, filePath: undefined }),
    writeJson: vi.fn().mockResolvedValue({ success: true, path: '' })
  },

  media: {
    getAll: vi.fn().mockResolvedValue([]),
    getCollections: vi.fn().mockResolvedValue([]),
    importAssets: vi.fn().mockResolvedValue([]),
    update: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue(true),
    incrementUsage: vi.fn().mockResolvedValue(undefined),
    addCollection: vi.fn().mockResolvedValue({}),
    updateCollection: vi.fn().mockResolvedValue({}),
    deleteCollection: vi.fn().mockResolvedValue(true),
    addAssetsToCollection: vi.fn().mockResolvedValue({}),
    removeAssetsFromCollection: vi.fn().mockResolvedValue({}),
    reorderCollectionItems: vi.fn().mockResolvedValue({}),
    bulkUpdate: vi.fn().mockResolvedValue(0),
    bulkDelete: vi.fn().mockResolvedValue(0)
  },

  bible: {
    getTranslations: vi.fn().mockResolvedValue([]),
    addTranslation: vi.fn().mockResolvedValue({}),
    deleteTranslation: vi.fn().mockResolvedValue(true),
    getBooks: vi.fn().mockResolvedValue([]),
    addBook: vi.fn().mockResolvedValue({}),
    getVerses: vi.fn().mockResolvedValue([]),
    getVerseRange: vi.fn().mockResolvedValue([]),
    addVerse: vi.fn().mockResolvedValue({}),
    addVersesBatch: vi.fn().mockResolvedValue(undefined),
    searchVerses: vi.fn().mockResolvedValue([])
  },

  slides: {
    getAll: vi.fn().mockResolvedValue([]),
    getByType: vi.fn().mockResolvedValue([]),
    add: vi.fn().mockResolvedValue({}),
    update: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue(true),
    getGroups: vi.fn().mockResolvedValue([]),
    addGroup: vi.fn().mockResolvedValue({}),
    updateGroup: vi.fn().mockResolvedValue({}),
    deleteGroup: vi.fn().mockResolvedValue(true),
    getGroupSlides: vi.fn().mockResolvedValue([]),
    addSlideToGroup: vi.fn().mockResolvedValue({}),
    removeSlideFromGroup: vi.fn().mockResolvedValue({}),
    reorderGroupSlides: vi.fn().mockResolvedValue(undefined)
  },

  health: {
    sendHeartbeat: vi.fn(),
    getStatus: vi.fn().mockResolvedValue([]),
    onStatusUpdate: vi.fn().mockReturnValue(() => {}),
    onHeartbeatAck: vi.fn().mockReturnValue(() => {})
  }
}

// Assign to global window
Object.defineProperty(window, 'api', {
  value: mockApi,
  writable: true,
  configurable: true
})

// Mock window.electron (electron-toolkit)
Object.defineProperty(window, 'electron', {
  value: {
    ipcRenderer: {
      send: vi.fn(),
      invoke: vi.fn(),
      on: vi.fn().mockReturnValue(() => {}),
      removeListener: vi.fn()
    }
  },
  writable: true,
  configurable: true
})

// Reset all mocks between tests
afterEach(() => {
  vi.clearAllMocks()
})
