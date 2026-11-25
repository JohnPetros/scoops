import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'

const JOB_TESTS = 'src/**/messaging/**/jobs/tests/**/*.test.ts'

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    coverage: {
      exclude: [
        'src/**/*.test.ts',
        'src/**/fixtures/**',
        'src/**/index.ts',
        'src/**/*.d.ts',
      ],
      include: ['src/**/*.ts'],
      provider: 'v8',
      reporter: [
        'text-summary',
        'json-summary',
        'html',
        ['lcov', { projectRoot: '../..' }],
      ],
      reportOnFailure: true,
      reportsDirectory: './coverage',
      // Baseline floor measured on 2026-08-27. Raise only; project target is 85/80.
      thresholds: {
        autoUpdate: false,
        branches: 52.7,
        functions: 71.6,
        lines: 75.2,
        statements: 71.6,
      },
    },
    environment: 'node',
    fileParallelism: false,
    isolate: false,
    maxWorkers: 1,
    // Distinct group orders keep the two Docker-backed suites from running at once.
    projects: [
      {
        extends: true,
        test: {
          name: 'controllers',
          // Everything outside the job suite, so a new test file is never skipped.
          include: ['src/**/*.test.ts'],
          exclude: [JOB_TESTS],
          testTimeout: 60_000,
          hookTimeout: 60_000,
          sequence: { groupOrder: 0 },
        },
      },
      {
        extends: true,
        test: {
          name: 'jobs',
          include: [JOB_TESTS],
          testTimeout: 120_000,
          hookTimeout: 120_000,
          sequence: { groupOrder: 1 },
        },
      },
    ],
  },
})
