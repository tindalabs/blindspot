import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5174,
    open: true,
    proxy: {
      '/v1/traces': 'http://localhost:4318',
    },
  },
});
