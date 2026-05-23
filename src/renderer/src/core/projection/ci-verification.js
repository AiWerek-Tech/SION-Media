#!/usr/bin/env node

/**
 * SIMPLIFIED CI VERIFICATION SUITE
 *
 * Uses unified policy engine for all enforcement.
 * No redundant checks - single source of truth.
 */

const { execSync } = require('child_process')
const { UnifiedArchitecturePolicyEngine } = require('./architecture-policy-engine.js')

class SimplifiedCIVerification {
  static async runVerification() {
    console.log('🔬 SIMPLIFIED CI VERIFICATION SUITE')
    console.log('===================================')
    console.log('Unified policy-driven enforcement')

    const results = []
    let shouldFail = false

    try {
      // 1. Unified architecture policy validation
      console.log('\\n🏗️  PHASE 1: Architecture Policy Validation')
      results.push(await this.runArchitecturePolicyCheck())

      // 2. TypeScript compilation (core requirement)
      console.log('\\n📝 PHASE 2: TypeScript Compilation')
      results.push(await this.runTypeScriptCheck())

      // 3. Runtime purity verification
      console.log('\\n🧹 PHASE 3: Runtime Purity')
      results.push(await this.runRuntimePurityCheck())
    } catch (error) {
      console.error(`💥 VERIFICATION SUITE CRASHED: ${error.message}`)
      shouldFail = true
    }

    // Final report
    const passed = results.filter((r) => r.passed).length
    const total = results.length

    console.log('\\n🎯 CI VERIFICATION REPORT')
    console.log('========================')
    console.log(`Checks Passed: ${passed}/${total}`)

    if (passed === total && !shouldFail) {
      console.log('✅ ALL CI GATES PASSED')
      console.log('🔒 Architecture policy enforced')
      console.log('🚀 READY FOR DEPLOYMENT')
      return { passed: true }
    } else {
      console.log('❌ CI GATES FAILED')
      console.log('🔍 Check violations above')
      console.log('\\n🚫 DEPLOYMENT BLOCKED')
      return { passed: false }
    }
  }

  static async runArchitecturePolicyCheck() {
    try {
      const engine = new UnifiedArchitecturePolicyEngine()
      const result = engine.validateArchitecture()
      return { name: 'architecture-policy', passed: result.passed }
    } catch (error) {
      console.log('❌ Architecture policy validation failed')
      return { name: 'architecture-policy', passed: false }
    }
  }

  static async runTypeScriptCheck() {
    try {
      execSync('npm run typecheck:node', { stdio: 'pipe' })
      console.log('✅ TypeScript compilation passed')
      return { name: 'typescript', passed: true }
    } catch (error) {
      console.log('❌ TypeScript compilation failed')
      return { name: 'typescript', passed: false }
    }
  }

  static async runRuntimePurityCheck() {
    try {
      execSync('npm run verify', { stdio: 'inherit' })
      console.log('✅ Runtime purity verified')
      return { name: 'runtime-purity', passed: true }
    } catch (error) {
      console.log('❌ Runtime purity check failed')
      return { name: 'runtime-purity', passed: false }
    }
  }
}

// Run simplified verification
SimplifiedCIVerification.runVerification()
  .then((result) => {
    process.exit(result.passed ? 0 : 1)
  })
  .catch((error) => {
    console.error('CI verification failed:', error)
    process.exit(1)
  })
