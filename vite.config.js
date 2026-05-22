import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { visualizer } from 'rollup-plugin-visualizer';
import { fileURLToPath, URL } from 'node:url';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Bundle analyzer — only active when ANALYZE=true
    // Usage: ANALYZE=true npm run build
    // eslint-disable-next-line no-undef
    process.env.ANALYZE === 'true' &&
      visualizer({
        open: true,
        filename: 'dist/stats.html',
        gzipSize: true,
        brotliSize: true,
      }),
  ].filter(Boolean),

  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },

  server: {
    port: 5173,
    strictPort: true, // Gagal jika port sudah dipakai, bukan pindah ke port lain
  },

  build: {
    // Warn if any chunk exceeds 1500KB (exceljs is ~1MB but lazy-loaded)
    chunkSizeWarningLimit: 1500,

    rollupOptions: {
      onwarn(warning, warn) {
        // Suppress "use of direct eval" warning from exceljs
        if (warning.code === 'EVAL' && warning.id && warning.id.includes('exceljs')) {
          return;
        }
        warn(warning);
      },
      output: {
        manualChunks(id) {
          // React core — always needed, cache aggressively
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'vendor-react';
          }
          // Dexie — IndexedDB layer, loaded early but separate from React
          if (id.includes('node_modules/dexie')) {
            return 'vendor-dexie';
          }
          // ExcelJS — heavy, only needed for export (lazy-imported)
          if (id.includes('node_modules/exceljs')) {
            return 'vendor-export';
          }
          // Everything else in node_modules → vendor chunk
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
      },
    },
  },
});
