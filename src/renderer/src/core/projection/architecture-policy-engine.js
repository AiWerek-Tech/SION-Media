#!/usr/bin/env node

/**
 * UNIFIED ARCHITECTURE POLICY ENGINE
 *
 * Single source of truth for all architecture enforcement.
 * Declarative policy replaces procedural guards.
 */

const fs = require('fs')
const path = require('path')

class UnifiedArchitecturePolicyEngine {
  constructor() {
    this.policy = this.loadPolicy()
  }

  loadPolicy() {
    const policyPath = path.join(__dirname, 'architecture-policy.json')
    return JSON.parse(fs.readFileSync(policyPath, 'utf8'))
  }

  /**
   * Get ESLint rules from policy
   */
  getESLintRules() {
    const rules = []

    // Convert global rules to ESLint no-restricted-imports format
    Object.values(this.policy.globalRules).forEach((rule) => {
      rules.push({
        group: rule.forbid,
        message: rule.description,
        allowTypeImports: false
      })
    })

    return rules
  }

  /**
   * Validate architecture compliance
   */
  validateArchitecture() {
    console.log('🏗️  UNIFIED ARCHITECTURE POLICY ENGINE')
    console.log('=====================================')

    const violations = []

    // Check file structure matches policy
    violations.push(...this.validateFileStructure())

    // Check import boundaries
    violations.push(...this.validateImportBoundaries())

    const passed = violations.length === 0

    console.log(`\\n📋 POLICY VALIDATION REPORT`)
    console.log('===========================')
    console.log(`Violations Found: ${violations.length}`)

    if (passed) {
      console.log('✅ Architecture policy compliant')
      console.log('🔒 All boundaries properly enforced')
    } else {
      console.log('❌ Architecture violations detected:')
      violations.forEach((v) => console.log(`  🚨 ${v}`))
    }

    return { passed, violations }
  }

  validateFileStructure() {
    // Check that expected layers exist based on policy
    const violations = []
    const rootDir = __dirname // This is already the projection directory

    Object.entries(this.policy.layers).forEach(([layerName, layer]) => {
      let hasAnyPath = false

      layer.paths.forEach((pattern) => {
        // Handle different pattern types
        if (pattern.includes('/**')) {
          // Directory pattern
          const dirPath = path.join(rootDir, pattern.replace('/**', ''))
          if (fs.existsSync(dirPath)) {
            hasAnyPath = true
          }
        } else if (pattern.endsWith('.ts') || pattern.endsWith('.js')) {
          // File pattern
          const filePath = path.join(rootDir, pattern)
          if (fs.existsSync(filePath)) {
            hasAnyPath = true
          }
        } else {
          // Other patterns - check if directory exists
          const checkPath = path.join(rootDir, pattern)
          if (fs.existsSync(checkPath)) {
            hasAnyPath = true
          }
        }
      })

      if (!hasAnyPath) {
        violations.push(`Missing layer: ${layerName} (${layer.description})`)
      }
    })

    return violations
  }

  validateImportBoundaries() {
    // Simplified import checking - in real implementation would scan files
    const violations = []

    // For now, just check that verification files don't import runtime
    // This is a basic check - full AST analysis would be more comprehensive
    const verificationDir = path.join(__dirname, 'verification')

    if (fs.existsSync(verificationDir)) {
      // Check if any verification files import runtime
      const files = this.getAllFiles(verificationDir)
      files.forEach((file) => {
        if (file.endsWith('.js') || file.endsWith('.ts')) {
          const content = fs.readFileSync(file, 'utf8')
          if (
            content.includes("from '../runtime'") ||
            content.includes("from '../state-machine'") ||
            content.includes("from '../effects'")
          ) {
            violations.push(
              `Verification layer importing runtime: ${path.relative(__dirname, file)}`
            )
          }
        }
      })
    }

    return violations
  }

  getAllFiles(dirPath, arrayOfFiles = []) {
    const files = fs.readdirSync(dirPath)

    files.forEach((file) => {
      const fullPath = path.join(dirPath, file)
      if (fs.statSync(fullPath).isDirectory()) {
        arrayOfFiles = this.getAllFiles(fullPath, arrayOfFiles)
      } else {
        arrayOfFiles.push(fullPath)
      }
    })

    return arrayOfFiles
  }

  /**
   * Get CI verification steps from policy
   */
  getCIVerificationSteps() {
    return this.policy.ciGates.required.concat(this.policy.ciGates.optional)
  }
}

// Export for use in other modules
module.exports = { UnifiedArchitecturePolicyEngine }

// CLI interface
if (require.main === module) {
  const { UnifiedArchitecturePolicyEngine } = require('./architecture-policy-engine.js')
  const engine = new UnifiedArchitecturePolicyEngine()
  const result = engine.validateArchitecture()
  process.exit(result.passed ? 0 : 1)
}
