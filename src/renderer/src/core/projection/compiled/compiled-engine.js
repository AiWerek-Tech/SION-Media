'use strict'
/**
 * COMPILED ARCHITECTURE POLICY ENGINE
 *
 * Auto-generated from architecture-policy.json
 * DO NOT EDIT - regenerate with: npm run compile:policy
 */
var __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? function (o, m, k, k2) {
        if (k2 === undefined) k2 = k
        var desc = Object.getOwnPropertyDescriptor(m, k)
        if (!desc || ('get' in desc ? !m.__esModule : desc.writable || desc.configurable)) {
          desc = {
            enumerable: true,
            get: function () {
              return m[k]
            }
          }
        }
        Object.defineProperty(o, k2, desc)
      }
    : function (o, m, k, k2) {
        if (k2 === undefined) k2 = k
        o[k2] = m[k]
      })
var __setModuleDefault =
  (this && this.__setModuleDefault) ||
  (Object.create
    ? function (o, v) {
        Object.defineProperty(o, 'default', { enumerable: true, value: v })
      }
    : function (o, v) {
        o['default'] = v
      })
var __importStar =
  (this && this.__importStar) ||
  (function () {
    var ownKeys = function (o) {
      ownKeys =
        Object.getOwnPropertyNames ||
        function (o) {
          var ar = []
          for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k
          return ar
        }
      return ownKeys(o)
    }
    return function (mod) {
      if (mod && mod.__esModule) return mod
      var result = {}
      if (mod != null)
        for (var k = ownKeys(mod), i = 0; i < k.length; i++)
          if (k[i] !== 'default') __createBinding(result, mod, k[i])
      __setModuleDefault(result, mod)
      return result
    }
  })()
Object.defineProperty(exports, '__esModule', { value: true })
exports.noVerificationInInstrumentationGuard =
  exports.noInstrumentationInRuntimeGuard =
  exports.noVerificationInRuntimeGuard =
  exports.CompiledArchitecturePolicyEngine =
    void 0
const fs = __importStar(require('fs'))
const path = __importStar(require('path'))
class CompiledArchitecturePolicyEngine {
  constructor() {
    this.policy = {
      name: 'SION Media Projection Architecture Policy',
      version: '1.0.0',
      description: 'Declarative architecture enforcement rules for clean layer separation',
      layers: {
        runtime: {
          description: 'Pure production execution layer',
          paths: ['runtime.ts', 'state-machine/**', 'effects/**'],
          forbiddenImports: ['**/verification/**', '**/instrumentation.ts']
        },
        instrumentation: {
          description: 'Development-only debugging and observation',
          paths: ['instrumentation.ts'],
          forbiddenImports: ['**/verification/**']
        },
        verification: {
          description: 'CI-only testing and validation',
          paths: ['verification/**'],
          forbiddenImports: []
        }
      },
      globalRules: {
        noVerificationInRuntime: {
          description: 'Runtime cannot import verification code',
          from: ['runtime.ts', '**/state-machine/**', '**/effects/**'],
          forbid: ['**/verification/**']
        },
        noInstrumentationInRuntime: {
          description: 'Runtime cannot import instrumentation code',
          from: ['runtime.ts', '**/state-machine/**', '**/effects/**'],
          forbid: ['instrumentation.ts']
        },
        noVerificationInInstrumentation: {
          description: 'Instrumentation cannot import verification code',
          from: ['instrumentation.ts'],
          forbid: ['**/verification/**']
        }
      },
      ciGates: {
        required: ['architectureCompliance', 'typeScriptCompilation', 'runtimePurity'],
        optional: ['buildSuccess', 'bundlePurity']
      },
      enforcement: {
        eslint: {
          enabled: true,
          rules: ['no-restricted-imports']
        },
        ci: {
          enabled: true,
          command: 'npm run ci:verify'
        },
        buildTime: {
          enabled: false,
          description: 'No runtime architecture checks - keep execution pure'
        }
      }
    }
  }
  /**
   * Get compiled ESLint rules
   */
  static getESLintRules() {
    return [
      {
        group: ['**/verification/**'],
        message: 'Runtime cannot import verification code',
        allowTypeImports: false
      },
      {
        group: ['instrumentation.ts'],
        message: 'Runtime cannot import instrumentation code',
        allowTypeImports: false
      },
      {
        group: ['**/verification/**'],
        message: 'Instrumentation cannot import verification code',
        allowTypeImports: false
      }
    ]
  }
  /**
   * Validate architecture compliance
   */
  validateArchitecture(rootDir) {
    const projectRoot = rootDir || __dirname
    const violations = []
    // File structure validation
    violations.push(...this.validateFileStructure(projectRoot))
    // Import boundary validation
    violations.push(...this.validateImportBoundaries())
    return {
      passed: violations.length === 0,
      violations
    }
  }
  // Generated file structure validation
  validateFileStructure(rootDir) {
    const violations = []
    // Pure production execution layer
    const runtimeExists =
      fs.existsSync(path.join(rootDir, 'runtime.ts')) ||
      fs.existsSync(path.join(rootDir, 'state-machine')) ||
      fs.existsSync(path.join(rootDir, 'effects'))
    if (!runtimeExists) {
      violations.push('Missing layer: runtime (Pure production execution layer)')
    }
    // Development-only debugging and observation
    const instrumentationExists = fs.existsSync(path.join(rootDir, 'instrumentation.ts'))
    if (!instrumentationExists) {
      violations.push('Missing layer: instrumentation (Development-only debugging and observation)')
    }
    // CI-only testing and validation
    const verificationExists = fs.existsSync(path.join(rootDir, 'verification'))
    if (!verificationExists) {
      violations.push('Missing layer: verification (CI-only testing and validation)')
    }
    return violations
  }
  // Generated import boundary validation
  validateImportBoundaries() {
    const violations = []
    // This would scan actual files - simplified for generation
    // In real implementation: walk files, check imports
    return violations
  }
}
exports.CompiledArchitecturePolicyEngine = CompiledArchitecturePolicyEngine
// Generated TypeScript guards
// Generated guard for: Runtime cannot import verification code
exports.noVerificationInRuntimeGuard = {
  name: 'noVerificationInRuntime',
  description: 'Runtime cannot import verification code',
  from: ['runtime.ts', '**/state-machine/**', '**/effects/**'],
  forbid: ['**/verification/**'],
  validate(importStatement, fromFile) {
    const matchesFrom = this.from.some((pattern) =>
      fromFile.includes(pattern.replace('/**', '').replace('**/', ''))
    )
    if (!matchesFrom) return true // Not applicable
    const matchesForbid = this.forbid.some((pattern) =>
      importStatement.includes(pattern.replace('/**', '').replace('**/', ''))
    )
    return !matchesForbid
  }
}
// Generated guard for: Runtime cannot import instrumentation code
exports.noInstrumentationInRuntimeGuard = {
  name: 'noInstrumentationInRuntime',
  description: 'Runtime cannot import instrumentation code',
  from: ['runtime.ts', '**/state-machine/**', '**/effects/**'],
  forbid: ['instrumentation.ts'],
  validate(importStatement, fromFile) {
    const matchesFrom = this.from.some((pattern) =>
      fromFile.includes(pattern.replace('/**', '').replace('**/', ''))
    )
    if (!matchesFrom) return true // Not applicable
    const matchesForbid = this.forbid.some((pattern) =>
      importStatement.includes(pattern.replace('/**', '').replace('**/', ''))
    )
    return !matchesForbid
  }
}
// Generated guard for: Instrumentation cannot import verification code
exports.noVerificationInInstrumentationGuard = {
  name: 'noVerificationInInstrumentation',
  description: 'Instrumentation cannot import verification code',
  from: ['instrumentation.ts'],
  forbid: ['**/verification/**'],
  validate(importStatement, fromFile) {
    const matchesFrom = this.from.some((pattern) =>
      fromFile.includes(pattern.replace('/**', '').replace('**/', ''))
    )
    if (!matchesFrom) return true // Not applicable
    const matchesForbid = this.forbid.some((pattern) =>
      importStatement.includes(pattern.replace('/**', '').replace('**/', ''))
    )
    return !matchesForbid
  }
}
// Export for runtime use
exports.default = CompiledArchitecturePolicyEngine
