import semver from 'semver'

export interface UpdateMetadata {
  version: string
  releaseDate: string
  mandatory: boolean
  downloadUrl: string
  notes: string[]
}

export interface UpdateCheckResult {
  hasUpdate: boolean
  latestVersion: string | null
  metadata: UpdateMetadata | null
  error?: string
}

const UPDATE_URL = 'https://aiwerek-tech.github.io/sion-media-web/latest-version.json'

/**
 * UpdateService — Handles application update checks
 * Fetches metadata from the official portal and compares versions.
 */
export const UpdateService = {
  /**
   * Checks for a new version of SION Media
   * @param currentVersion The version of the current running app
   */
  async checkForUpdate(currentVersion: string): Promise<UpdateCheckResult> {
    try {
      const response = await fetch(UPDATE_URL, {
        cache: 'no-store', // Always get fresh metadata
        headers: {
          Accept: 'application/json'
        },
        signal: AbortSignal.timeout(3000)
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch update metadata: ${response.statusText}`)
      }

      const metadata: UpdateMetadata = await response.json()

      if (!metadata.version) {
        throw new Error('Invalid update metadata: missing version')
      }

      // Compare versions using semver
      const hasUpdate = semver.gt(metadata.version, currentVersion)

      return {
        hasUpdate,
        latestVersion: metadata.version,
        metadata: hasUpdate ? metadata : null
      }
    } catch (error) {
      console.error('[UpdateService] Update check failed:', error)
      return {
        hasUpdate: false,
        latestVersion: null,
        metadata: null,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  },

  /**
   * Opens the download page in the system browser
   * Uses window.api.system.openExternal if available
   */
  openDownloadPage(url?: string): void {
    const downloadUrl = url || 'https://github.com/AiWerek-Tech/SION-Media/releases/latest'
    if (window.api?.system?.openExternal) {
      window.api.system.openExternal(downloadUrl)
    } else {
      window.open(downloadUrl, '_blank')
    }
  }
}
