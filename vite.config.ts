import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

// Dos páginas: inicio y proyectos
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        projects: fileURLToPath(new URL('./projects.html', import.meta.url)),
      },
    },
  },
});
