
import { defineConfig } from 'vite';

export default defineConfig({
  define: {
    // Evita errores de "process is not defined" en el navegador para librerías antiguas
    'process.env': {},
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',
  },
  server: {
    port: 3000,
  }
});
