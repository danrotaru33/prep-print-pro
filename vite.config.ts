
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Configure PDF.js worker handling
  optimizeDeps: {
    include: ['pdfjs-dist'],
  },
  // Ensure PDF.js worker is properly handled in build
  build: {
    rollupOptions: {
      output: {
        // Ensure PDF.js worker is copied to the output
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.includes('pdf.worker')) {
            return 'pdf.worker.[hash].js';
          }
          return 'assets/[name].[hash][extname]';
        },
      },
    },
  },
  // Handle PDF.js worker assets
  assetsInclude: ['**/*.worker.js', '**/*.worker.min.js'],
  // Define global for PDF.js worker
  define: {
    global: 'globalThis',
  },
}));
