import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5176,
    open: true,
    proxy: {
      '/v1/traces': 'http://localhost:4318',
    },
  },
});
