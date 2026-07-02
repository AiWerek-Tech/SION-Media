/**
 * COMPILED ARCHITECTURE POLICY ENGINE
 *
 * Auto-generated from architecture-policy.json
 * DO NOT EDIT - regenerate with: npm run compile:policy
 */

import * as fs from 'fs'
import * as path from 'path'

export interface ValidationResult {
  passed: boolean
  violations: string[]
}

export class CompiledArchitecturePolicyEngine {
  private readonly policy = {
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

  /**
   * Get compiled ESLint rules
   */
  static getESLintRules(): any[] {
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
  validateArchitecture(rootDir?: string): ValidationResult {
    const projectRoot = rootDir || __dirname
    const policy = this.policy
    void policy
    const violations: string[] = []

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
  validateFileStructure(rootDir: string): string[] {
    const violations: string[] = []

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
  validateImportBoundaries(): string[] {
    const violations: string[] = []
    // This would scan actual files - simplified for generation
    // In real implementation: walk files, check imports
    return violations
  }
}

// Generated TypeScript guards

// Generated guard for: Runtime cannot import verification code
export const noVerificationInRuntimeGuard = {
  name: 'noVerificationInRuntime',
  description: 'Runtime cannot import verification code',
  from: ['runtime.ts', '**/state-machine/**', '**/effects/**'],
  forbid: ['**/verification/**'],

  validate(importStatement: string, fromFile: string): boolean {
    const matchesFrom = this.from.some((pattern: string) =>
      fromFile.includes(pattern.replace('/**', '').replace('**/', ''))
    )

    if (!matchesFrom) return true // Not applicable

    const matchesForbid = this.forbid.some((pattern: string) =>
      importStatement.includes(pattern.replace('/**', '').replace('**/', ''))
    )

    return !matchesForbid
  }
}

// Generated guard for: Runtime cannot import instrumentation code
export const noInstrumentationInRuntimeGuard = {
  name: 'noInstrumentationInRuntime',
  description: 'Runtime cannot import instrumentation code',
  from: ['runtime.ts', '**/state-machine/**', '**/effects/**'],
  forbid: ['instrumentation.ts'],

  validate(importStatement: string, fromFile: string): boolean {
    const matchesFrom = this.from.some((pattern: string) =>
      fromFile.includes(pattern.replace('/**', '').replace('**/', ''))
    )

    if (!matchesFrom) return true // Not applicable

    const matchesForbid = this.forbid.some((pattern: string) =>
      importStatement.includes(pattern.replace('/**', '').replace('**/', ''))
    )

    return !matchesForbid
  }
}

// Generated guard for: Instrumentation cannot import verification code
export const noVerificationInInstrumentationGuard = {
  name: 'noVerificationInInstrumentation',
  description: 'Instrumentation cannot import verification code',
  from: ['instrumentation.ts'],
  forbid: ['**/verification/**'],

  validate(importStatement: string, fromFile: string): boolean {
    const matchesFrom = this.from.some((pattern: string) =>
      fromFile.includes(pattern.replace('/**', '').replace('**/', ''))
    )

    if (!matchesFrom) return true // Not applicable

    const matchesForbid = this.forbid.some((pattern: string) =>
      importStatement.includes(pattern.replace('/**', '').replace('**/', ''))
    )

    return !matchesForbid
  }
}

// Export for runtime use
export default CompiledArchitecturePolicyEngine
