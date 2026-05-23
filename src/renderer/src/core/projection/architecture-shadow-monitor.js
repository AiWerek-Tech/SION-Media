#!/usr/bin/env node

/**
 * ARCHITECTURE SHADOW MONITOR
 *
 * Instrumentation-only agent for governance observability.
 * NEVER runs in production runtime - only in dev/debug modes.
 *
 * Purpose: Detect architecture drift without coupling to execution.
 * Method: External monitoring agent, not part of runtime execution path.
 */

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

class ArchitectureShadowMonitor {
  constructor() {
    this.policyHash = this.computePolicyHash()
    this.checkInterval = 30000 // 30 seconds between checks
    this.monitoringActive = false
  }

  /**
   * Compute hash of current policy for drift detection
   */
  computePolicyHash() {
    try {
      const policyPath = path.join(__dirname, 'architecture-policy.json')
      const policyContent = fs.readFileSync(policyPath, 'utf8')
      return crypto.createHash('sha256').update(policyContent).digest('hex')
    } catch (error) {
      return null
    }
  }

  /**
   * Start monitoring (instrumentation-only, not runtime)
   */
  startMonitoring() {
    if (this.monitoringActive) return

    this.monitoringActive = true
    console.log('🔍 [ARCHITECTURE MONITOR] Starting shadow monitoring...')

    // Initial health check
    this.performHealthCheck()

    // Periodic monitoring
    this.monitorInterval = setInterval(() => {
      this.performHealthCheck()
    }, this.checkInterval)
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (!this.monitoringActive) return

    this.monitoringActive = false
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval)
      this.monitorInterval = undefined
    }
    console.log('🔍 [ARCHITECTURE MONITOR] Monitoring stopped')
  }

  /**
   * Perform comprehensive health check
   */
  performHealthCheck() {
    try {
      const health = this.collectHealthMetrics()

      // Check for drift
      this.detectDrift(health)

      // Log status
      this.logHealthStatus(health)

      // Report to monitoring if needed
      this.reportToMonitoring(health)
    } catch (error) {
      console.error('🔍 [ARCHITECTURE MONITOR] Health check failed:', error)
    }
  }

  /**
   * Collect all health metrics
   */
  collectHealthMetrics() {
    return {
      timestamp: new Date().toISOString(),
      policyHash: this.computePolicyHash(),
      compiledRulesExist: this.checkCompiledRulesExist(),
      compiledRulesLoadable: this.checkCompiledRulesLoadable(),
      layerSeparationIntact: this.checkLayerSeparation(),
      lastCheck: Date.now()
    }
  }

  /**
   * Check if compiled rules files exist
   */
  checkCompiledRulesExist() {
    const files = [
      'compiled/eslint-rules.json',
      'compiled/typescript-guards.ts',
      'compiled/compiled-engine.js'
    ]

    return files.every((file) => {
      try {
        fs.accessSync(path.join(__dirname, file))
        return true
      } catch {
        return false
      }
    })
  }

  /**
   * Check if compiled rules can be loaded
   */
  checkCompiledRulesLoadable() {
    try {
      const rulesPath = path.join(__dirname, 'compiled/eslint-rules.json')
      JSON.parse(fs.readFileSync(rulesPath, 'utf8'))
      return true
    } catch {
      return false
    }
  }

  /**
   * Check layer separation integrity
   */
  checkLayerSeparation() {
    // Check that runtime doesn't import from instrumentation/verification
    // This is a basic check - could be expanded
    try {
      const runtimeContent = fs.readFileSync(path.join(__dirname, 'runtime.ts'), 'utf8')
      const hasInstrumentationImport = runtimeContent.includes("from './instrumentation'")
      const hasVerificationImport = runtimeContent.includes("from './verification'")

      return !hasInstrumentationImport && !hasVerificationImport
    } catch {
      return false
    }
  }

  /**
   * Detect policy drift
   */
  detectDrift(health) {
    if (!this.lastPolicyHash) {
      this.lastPolicyHash = health.policyHash
      return
    }

    if (health.policyHash && health.policyHash !== this.lastPolicyHash) {
      console.warn('🚨 [ARCHITECTURE MONITOR] POLICY DRIFT DETECTED!')
      console.warn(`   Previous: ${this.lastPolicyHash.substring(0, 8)}`)
      console.warn(`   Current:  ${health.policyHash.substring(0, 8)}`)
      console.warn('   → Run: npm run compile:policy')
      console.warn('   → Run: npm run ci:verify')

      this.lastPolicyHash = health.policyHash
    }
  }

  /**
   * Log health status
   */
  logHealthStatus(health) {
    const status =
      health.compiledRulesExist && health.compiledRulesLoadable && health.layerSeparationIntact
        ? '✅ HEALTHY'
        : '⚠️  ISSUES'

    console.log(
      `🔍 [ARCHITECTURE MONITOR] ${status} | Policy: ${health.policyHash?.substring(0, 8) || 'N/A'}`
    )
  }

  /**
   * Report to external monitoring
   */
  reportToMonitoring(health) {
    // In production, this could send to:
    // - DataDog, New Relic, Sentry
    // - Internal dashboard
    // - Slack alerts

    try {
      const logPath = path.join(__dirname, 'architecture-monitor-log.jsonl')
      const logEntry =
        JSON.stringify({
          ...health,
          level: health.compiledRulesExist && health.compiledRulesLoadable ? 'info' : 'warning',
          component: 'architecture-shadow-monitor'
        }) + '\n'

      fs.appendFileSync(logPath, logEntry)
    } catch (error) {
      // Silent fail - monitoring should never break the system
    }
  }

  /**
   * Get current health status
   */
  getHealthStatus() {
    return this.collectHealthMetrics()
  }
}

// Export for instrumentation use only
const monitor = new ArchitectureShadowMonitor()

module.exports = {
  ArchitectureShadowMonitor,
  monitor,

  // Convenience functions
  start: () => monitor.startMonitoring(),
  stop: () => monitor.stopMonitoring(),
  health: () => monitor.getHealthStatus()
}

// If run directly, start monitoring and keep running
if (require.main === module) {
  console.log('🔍 Starting Architecture Shadow Monitor...')
  console.log('Press Ctrl+C to stop monitoring')

  monitor.startMonitoring()

  // Keep the process alive
  process.on('SIGINT', () => {
    console.log('\n🔍 Stopping Architecture Shadow Monitor...')
    monitor.stopMonitoring()
    process.exit(0)
  })

  // Prevent exit
  setInterval(() => {
    // Keep alive
  }, 1000)
}
