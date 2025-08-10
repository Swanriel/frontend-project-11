import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  server: {
    fs: {
      strict: false, // Отключает все ограничения
    },
  },
});
