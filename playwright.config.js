import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30000, // Увеличиваем общий таймаут
  retries: 1,
  workers: 1,
  use: {
    baseURL: 'http://localhost:5175/',
    headless: true,
    viewport: { width: 1280, height: 720 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
});