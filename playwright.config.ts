import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  // Cap at 2 workers — the Next.js dev server can't handle more concurrent
  // browser instances without timing out under JIT compilation pressure.
  workers: 2,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
    // Required for MapLibre's WebGL canvas (and feature queries on click)
    // to work in headless Chromium.
    launchOptions: { args: ['--use-gl=angle', '--use-angle=swiftshader'] },
  },
  // MapLibre WebGL init is slow under CPU contention with 2 parallel workers.
  // 5s (Playwright default) is too tight; 15s covers even the slow CI path.
  expect: { timeout: 15000 },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
