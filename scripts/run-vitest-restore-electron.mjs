import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/* eslint-disable @typescript-eslint/explicit-function-return-type */

const npmCli =
  process.env.npm_execpath ||
  join(dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js')
const vitestEntry = fileURLToPath(new URL('../node_modules/vitest/vitest.mjs', import.meta.url))
const vitestArgs = ['run', ...process.argv.slice(2)]
const nodeRebuildArgs = ['run', 'rebuild:node-native']
const electronRebuildArgs = ['run', 'rebuild:electron-native']

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'inherit',
    shell: false
  })
  if (result.error) {
    console.error(`[test-runner] Failed to start ${command}:`, result.error.message)
  }
  return result
}

let exitCode = 0

try {
  const nodeRebuild = run(process.execPath, [npmCli, ...nodeRebuildArgs])
  if (nodeRebuild.status !== 0) {
    exitCode = nodeRebuild.status ?? 1
  } else {
    const testRun = run(process.execPath, [vitestEntry, ...vitestArgs])
    exitCode = testRun.status ?? 1
  }
} finally {
  const electronRebuild = run(process.execPath, [npmCli, ...electronRebuildArgs])
  if (exitCode === 0 && electronRebuild.status !== 0) {
    exitCode = electronRebuild.status ?? 1
  }
}

process.exit(exitCode)
