
import { defineConfig } from 'vite';

export default defineConfig({
  define: {
    // Evita errores de "process is not defined" en el navegador
    'process.env': {},
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    // Cambiamos a 'esbuild' que viene integrado en Vite para evitar errores de "terser not found"
    minify: 'esbuild',
  },
  server: {
    port: 3000,
  }
});
