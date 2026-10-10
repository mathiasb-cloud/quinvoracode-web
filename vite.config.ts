import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

// Paginas: inicio, proyectos, about y las legales (terminos, privacidad, devoluciones y Libro de Reclamaciones)
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        projects: fileURLToPath(new URL('./projects.html', import.meta.url)),
        about: fileURLToPath(new URL('./about.html', import.meta.url)),
        terminos: fileURLToPath(new URL('./terminos.html', import.meta.url)),
        privacidad: fileURLToPath(new URL('./privacidad.html', import.meta.url)),
        devoluciones: fileURLToPath(new URL('./devoluciones.html', import.meta.url)),
        reclamaciones: fileURLToPath(new URL('./libro-reclamaciones.html', import.meta.url)),
      },
    },
  },
});
