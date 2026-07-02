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
