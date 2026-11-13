import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  retries: process.env['CI'] ? 1 : 0,
  timeout: 20_000,
  // CI uploads the HTML report when a run fails; the trace from the retry is
  // the only way to see what the page did on a runner nobody can watch.
  reporter: process.env['CI'] ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    headless: true,
    trace: 'on-first-retry',
  },
  projects: [
    // ── Chrome (primary) ───────────────────────────────────────────────────────
    {
      name: 'react',
      testMatch: 'react.spec.ts',
      use: { ...devices['Desktop Chrome'], baseURL: 'http://localhost:5175' },
    },
    {
      name: 'vue',
      testMatch: 'vue.spec.ts',
      use: { ...devices['Desktop Chrome'], baseURL: 'http://localhost:5176' },
    },
    {
      name: 'next',
      testMatch: 'next.spec.ts',
      // Next.js dev compiles routes on first request; allow extra time.
      timeout: 45_000,
      use: { ...devices['Desktop Chrome'], baseURL: 'http://localhost:3002' },
    },
    // ── Firefox ────────────────────────────────────────────────────────────────
    // Run the React spec against Firefox — same SDK, covers a second engine.
    // Vue and Next are omitted to keep the matrix fast; Firefox divergence would
    // appear in the shared SDK code, which the React spec exercises fully.
    {
      name: 'react-firefox',
      testMatch: 'react.spec.ts',
      use: { ...devices['Desktop Firefox'], baseURL: 'http://localhost:5175' },
    },
    // ── WebKit (Safari engine) ─────────────────────────────────────────────────
    // Playwright WebKit on Linux cannot reach Vite dev servers ("internal error"),
    // so this project exists only on macOS, where CI runs it in its own job.
    ...(process.platform === 'darwin' ? [{
      name: 'react-webkit',
      testMatch: 'react.spec.ts',
      use: { ...devices['Desktop Safari'], baseURL: 'http://127.0.0.1:5175' },
    }] : []),
  ],
  webServer: [
    {
      command: 'pnpm --filter @tindalabs/blindspot-example-react-basic dev',
      port: 5175,
      reuseExistingServer: !process.env['CI'],
      timeout: 60_000,
    },
    {
      command: 'pnpm --filter @tindalabs/blindspot-example-vue-basic dev',
      port: 5176,
      reuseExistingServer: !process.env['CI'],
      timeout: 60_000,
    },
    {
      command: 'pnpm --filter @tindalabs/blindspot-example-next-app-router dev',
      port: 3002,
      reuseExistingServer: !process.env['CI'],
      timeout: 120_000,
    },
  ],
});
