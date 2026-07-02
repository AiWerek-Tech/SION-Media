/**
 * RUNTIME POLICY SHADOW CHECK (DEPRECATED)
 *
 * ⚠️  MOVED TO INSTRUMENTATION LAYER
 *
 * This file is deprecated. Shadow checking has been moved to:
 * → architecture-shadow-monitor.js (instrumentation-only)
 *
 * Runtime should remain pure execution - no governance logic.
 */

console.warn('⚠️  runtime-policy-shadow-check.js is deprecated.');
console.warn('   Use architecture-shadow-monitor.js for instrumentation-only monitoring.');
console.warn('   Runtime should not contain governance logic.');

// Legacy exports for backward compatibility
module.exports = {
  validateImport: () => {
    console.warn('validateImport() is deprecated - moved to instrumentation layer');
  },
  shadowCheck: {
    validateRuntimeImport: () => {
      console.warn('validateRuntimeImport() is deprecated - moved to instrumentation layer');
    },
    healthCheck: () => ({
      deprecated: true,
      message: 'Use architecture-shadow-monitor.js instead'
    })
  }
};

    return violations;
  }

  /**
   * Simple pattern matching for shadow validation
   */
  matchesPattern(target, patterns) {
    if (!Array.isArray(patterns)) patterns = [patterns];

    return patterns.some(pattern => {
      // Simple glob matching for shadow check
      const regex = pattern
        .replace(/\*\*/g, '.*')
        .replace(/\*/g, '[^/]*');
      return new RegExp(regex).test(target);
    });
  }

  /**
   * Report shadow violation (logging only, no enforcement)
   */
  reportShadowViolation(violations, fromFile, importStatement) {
    const policyHash = this.computePolicyHash();

    console.warn('🚨 [POLICY SHADOW CHECK] Runtime violation detected');
    console.warn(`   File: ${fromFile}`);
    console.warn(`   Import: ${importStatement}`);
    console.warn(`   Policy Hash: ${policyHash?.substring(0, 8)}`);
    console.warn('   This indicates potential compiler drift!');
    console.warn('   Run: npm run compile:policy && npm run ci:verify');

    violations.forEach(v => {
      console.warn(`   🚨 ${v.rule}`);
    });

    // Optional: Send to monitoring system
    this.reportToMonitoring({
      type: 'policy-shadow-violation',
      violations,
      fromFile,
      importStatement,
      policyHash,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Report to monitoring (placeholder for actual monitoring integration)
   */
  reportToMonitoring(data) {
    // In production, this could send to:
    // - DataDog, New Relic, Sentry
    // - Internal monitoring dashboard
    // - Slack alerts for architecture team

    // For now, just log to file for analysis
    try {
      const logPath = path.join(__dirname, 'policy-shadow-log.jsonl');
      const logEntry = JSON.stringify({
        ...data,
        level: 'warning',
        component: 'runtime-policy-shadow-check'
      }) + '\n';

      fs.appendFileSync(logPath, logEntry);
    } catch (error) {
      // Silent fail - shadow check should never break runtime
    }
  }

  /**
   * Health check for the shadow validation system
   */
  healthCheck() {
    const status = {
      policyHash: this.computePolicyHash(),
      compiledRulesLoaded: !!this.loadCompiledRules(),
      lastCheck: this.lastCheck,
      sampleRate: this.sampleRate,
      checkInterval: this.checkInterval
    };

    return status;
  }
}

// Global instance for runtime use
const shadowCheck = new RuntimePolicyShadowCheck();

// Export for integration
module.exports = {
  RuntimePolicyShadowCheck,
  shadowCheck,

  // Convenience functions for easy integration
  validateImport: (fromFile, importStatement) => {
    shadowCheck.validateRuntimeImport(fromFile, importStatement);
  },

  healthCheck: () => shadowCheck.healthCheck()
};

// CLI interface
if (require.main === module) {
  const status = shadowCheck.healthCheck();
  console.log('🩺 Runtime Policy Shadow Check Health:');
  console.log(JSON.stringify(status, null, 2));

  // Test with sample data
  console.log('\\n🧪 Testing with sample violation:');
  shadowCheck.validateRuntimeImport(
    'src/runtime.ts',
    'src/verification/run-verification.js'
  );
}