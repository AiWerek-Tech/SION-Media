/**
 * Invariant Report System
 *
 * Generates comprehensive reports about projection system invariants,
 * violations, and compliance status. Used for CI/CD validation,
 * runtime monitoring, and debugging.
 */

export type InvariantReport = {
  timestamp: number
  duration: number
  severity: 'PASS' | 'WARN' | 'FAIL'
  violations: string[]
  metadata: {
    snapshotCoverage?: any
    replayResults?: any
    purityReport?: any
    mutationReport?: any
  }
  recommendations: string[]
}

export type AuthorityHealthStatus = 'HEALTHY' | 'DEGRADED' | 'CRITICAL' | 'BROKEN'

/**
 * Create a comprehensive invariant report
 */
export function createInvariantReport(
  violations: string[] = [],
  metadata: InvariantReport['metadata'] = {},
  duration: number = 0
): InvariantReport {
  const severity = determineSeverity(violations)
  const recommendations = generateRecommendations(violations, metadata)

  return {
    timestamp: Date.now(),
    duration,
    severity,
    violations,
    metadata,
    recommendations
  }
}

/**
 * Determine severity level based on violations
 */
function determineSeverity(violations: string[]): InvariantReport['severity'] {
  if (violations.length === 0) return 'PASS'

  const criticalViolations = violations.filter(
    (v) =>
      v.includes('AUTHORITY_LEAK') ||
      v.includes('STORE_MUTATION_DETECTED') ||
      v.includes('SNAPSHOT_INCOMPLETE') ||
      v.includes('REPLAY_FAILED')
  )

  const warningViolations = violations.filter(
    (v) => v.includes('COVERAGE_') || v.includes('PERFORMANCE_')
  )

  if (criticalViolations.length > 0) return 'FAIL'
  if (warningViolations.length > 0) return 'WARN'

  return 'WARN'
}

/**
 * Generate actionable recommendations based on violations
 */
function generateRecommendations(
  violations: string[],
  metadata: InvariantReport['metadata']
): string[] {
  const recommendations: string[] = []

  for (const violation of violations) {
    switch (true) {
      case violation.includes('STORE_MUTATION_DETECTED'):
        recommendations.push(
          'Investigate direct store mutations - ensure all state changes go through state machine transitions'
        )
        break

      case violation.includes('COVERAGE_MISSING_FIELD'):
        recommendations.push('Add missing field to snapshot contract and sync layer')
        break

      case violation.includes('REPLAY_FAILED'):
        recommendations.push('Fix non-deterministic behavior in reducers or effects')
        break

      case violation.includes('EFFECT_MUTATED'):
        recommendations.push('Move state-changing logic out of effects into reducers')
        break

      case violation.includes('SNAPSHOT_INEQUALITY'):
        recommendations.push('Ensure snapshot extraction and application are symmetrical')
        break

      case violation.includes('PERFORMANCE_'):
        recommendations.push('Optimize transition execution or effect handling')
        break
    }
  }

  // Add general recommendations based on metadata
  if (metadata.snapshotCoverage && !metadata.snapshotCoverage.ok) {
    recommendations.push('Audit snapshot completeness - some UI state may not be captured')
  }

  if (metadata.replayResults && !metadata.replayResults.ok) {
    recommendations.push('Implement replay testing to ensure deterministic behavior')
  }

  return [...new Set(recommendations)] // Remove duplicates
}

/**
 * Generate overall authority health status
 */
export function assessAuthorityHealth(report: InvariantReport): {
  status: AuthorityHealthStatus
  score: number
  summary: string
} {
  const violationCount = report.violations.length
  const hasCritical = report.violations.some(
    (v) =>
      v.includes('AUTHORITY_LEAK') ||
      v.includes('STORE_MUTATION_DETECTED') ||
      v.includes('REPLAY_FAILED')
  )

  let status: AuthorityHealthStatus
  let score: number
  let summary: string

  if (violationCount === 0) {
    status = 'HEALTHY'
    score = 100
    summary = 'All authority invariants maintained'
  } else if (hasCritical) {
    status = 'BROKEN'
    score = Math.max(0, 100 - violationCount * 20)
    summary = `${violationCount} critical violations detected - authority boundaries compromised`
  } else if (violationCount <= 2) {
    status = 'DEGRADED'
    score = Math.max(50, 100 - violationCount * 10)
    summary = `${violationCount} minor violations - monitor for degradation`
  } else {
    status = 'CRITICAL'
    score = Math.max(20, 100 - violationCount * 15)
    summary = `${violationCount} violations detected - immediate attention required`
  }

  return { status, score, summary }
}

/**
 * Format report for console output
 */
export function formatReportForConsole(report: InvariantReport): string {
  const health = assessAuthorityHealth(report)

  let output = `
🧠 Projection Authority Report
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Status: ${health.status} (${health.score}/100)
Severity: ${report.severity}
Duration: ${report.duration.toFixed(2)}ms
Timestamp: ${new Date(report.timestamp).toISOString()}

${health.summary}

Violations (${report.violations.length}):
${report.violations.length > 0 ? report.violations.map((v) => `❌ ${v}`).join('\n') : '✅ None'}

Recommendations:
${
  report.recommendations.length > 0
    ? report.recommendations.map((r) => `💡 ${r}`).join('\n')
    : '✅ None - system is healthy'
}
`

  return output
}

/**
 * Export report in various formats
 */
export function exportReport(
  report: InvariantReport,
  format: 'json' | 'csv' | 'markdown' = 'json'
): string {
  switch (format) {
    case 'json':
      return JSON.stringify(report, null, 2)

    case 'csv':
      const rows = [
        ['Timestamp', 'Severity', 'Violation Count', 'Duration'],
        [report.timestamp, report.severity, report.violations.length, report.duration],
        ...report.violations.map((v) => ['', '', '', v])
      ]
      return rows.map((row) => row.join(',')).join('\n')

    case 'markdown':
      return `
# Projection Authority Report

- **Timestamp**: ${new Date(report.timestamp).toISOString()}
- **Severity**: ${report.severity}
- **Violations**: ${report.violations.length}
- **Duration**: ${report.duration}ms

## Violations

${report.violations.map((v) => `- ${v}`).join('\n')}

## Recommendations

${report.recommendations.map((r) => `- ${r}`).join('\n')}
`

    default:
      return JSON.stringify(report)
  }
}

/**
 * Aggregate multiple reports for trend analysis
 */
export function aggregateReports(reports: InvariantReport[]): {
  totalReports: number
  averageScore: number
  violationTrends: Record<string, number>
  healthTrend: AuthorityHealthStatus[]
} {
  const totalReports = reports.length
  const scores = reports.map((r) => assessAuthorityHealth(r).score)
  const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length

  const violationTrends: Record<string, number> = {}
  for (const report of reports) {
    for (const violation of report.violations) {
      violationTrends[violation] = (violationTrends[violation] || 0) + 1
    }
  }

  const healthTrend = reports.map((r) => assessAuthorityHealth(r).status)

  return {
    totalReports,
    averageScore,
    violationTrends,
    healthTrend
  }
}
