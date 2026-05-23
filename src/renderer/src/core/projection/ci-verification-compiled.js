#!/usr/bin/env node

/**
 * CI ADAPTER (THIN WRAPPER)
 *
 * Uses compiled policy engine for validation.
 * No logic - just calls compiled engine.
 */

const { execSync } = require('child_process')

// Import compiled engine (would be built version)
const enginePath = './compiled/compiled-engine.js'
let CompiledArchitecturePolicyEngine

try {
  CompiledArchitecturePolicyEngine = require(enginePath).CompiledArchitecturePolicyEngine
} catch (error) {
  console.error('❌ Compiled policy engine not found. Run: npm run compile:policy')
  process.exit(1)
}

class CIAdapter {
  static async runVerification() {
    console.log('🔬 CI VERIFICATION ADAPTER')
    console.log('=========================')
    console.log('Using compiled policy engine')

    const results = []

    // 1. Architecture policy validation (compiled)
    console.log('\n🏗️  PHASE 1: Compiled Architecture Validation')
    results.push(await this.runCompiledArchitectureCheck())

    // 2. TypeScript compilation
    console.log('\n📝 PHASE 2: TypeScript Compilation')
    results.push(await this.runTypeScriptCheck())

    // 3. Runtime purity
    console.log('\n🧹 PHASE 3: Runtime Purity')
    results.push(await this.runRuntimePurityCheck())

    // Final report
    const passed = results.filter((r) => r.passed).length
    const total = results.length

    console.log('\n🎯 CI VERIFICATION REPORT')
    console.log('========================')
    console.log(`Checks Passed: ${passed}/${total}`)

    if (passed === total) {
      console.log('✅ ALL CI GATES PASSED')
      console.log('🔒 Architecture policy enforced')
      console.log('🚀 READY FOR DEPLOYMENT')
      return { passed: true }
    } else {
      console.log('❌ CI GATES FAILED')
      console.log('🔍 Check violations above')
      console.log('\n🚫 DEPLOYMENT BLOCKED')
      return { passed: false }
    }
  }

  static async runCompiledArchitectureCheck() {
    try {
      const engine = new CompiledArchitecturePolicyEngine()
      const projectRoot = __dirname // This is the projection directory
      console.log(`Using project root: ${projectRoot}`)
      const result = engine.validateArchitecture(projectRoot)

      if (result.passed) {
        console.log('✅ Architecture policy compliant')
        console.log('🔒 All boundaries properly enforced')
      } else {
        console.log('❌ Architecture violations detected:')
        result.violations.forEach((v) => console.log(`  🚨 ${v}`))
      }

      return { name: 'compiled-architecture', passed: result.passed }
    } catch (error) {
      console.log('❌ Compiled architecture validation failed')
      return { name: 'compiled-architecture', passed: false }
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

// Run CI verification
CIAdapter.runVerification()
  .then((result) => {
    process.exit(result.passed ? 0 : 1)
  })
  .catch((error) => {
    console.error('CI verification failed:', error)
    process.exit(1)
  })
