import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      exclude: ['src/**/*.test.ts', 'src/**/fakers/**', 'src/**/index.ts'],
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
      // Baseline floor measured on 2026-11-26. Raise only; project target is 85/80.
      thresholds: {
        autoUpdate: false,
        branches: 79.8,
        functions: 86.8,
        lines: 83.9,
        statements: 82.8,
      },
    },
    globals: true,
  },
})
