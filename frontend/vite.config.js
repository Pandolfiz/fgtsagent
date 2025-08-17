import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import fs from 'fs'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  // Otimizações de build
  build: {
    // Otimizar bundle splitting
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks para cache a longo prazo
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          ui: ['@headlessui/react', '@heroicons/react', '@nextui-org/react'],
          animations: ['framer-motion', 'react-parallax-tilt'],
          charts: ['chart.js', 'react-chartjs-2'],
          supabase: ['@supabase/supabase-js', '@supabase/auth-helpers-react'],
          icons: ['react-icons', 'lucide-react'],
          utils: ['socket.io-client', 'react-hot-toast', 'qrcode.react', 'axios']
        }
      }
    },

    // Configurações de compressão
    target: 'es2020',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log em produção
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug']
      },
      mangle: {
        safari10: true
      }
    },

    // Limite de chunk size
    chunkSizeWarningLimit: 1000,

    // Configurações de assets
    assetsDir: 'assets',
    assetsInlineLimit: 4096, // Inline assets menores que 4kb

    // Source maps apenas em desenvolvimento
    sourcemap: process.env.NODE_ENV === 'development'
  },

  // Otimizações de servidor de desenvolvimento
  server: {
    host: 'localhost', // Usar apenas localhost para evitar problemas de CORS
    port: process.env.FRONTEND_PORT || 5173,
    open: false,

    // Configuração HTTPS para compatibilidade com Facebook SDK
    https: (() => {
      try {
        const certPath = resolve(__dirname, 'certs/cert.pem');
        const keyPath = resolve(__dirname, 'certs/key.pem');

        if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
          console.log('🔐 Usando certificados SSL personalizados');
          return {
            key: fs.readFileSync(keyPath),
            cert: fs.readFileSync(certPath)
          };
        } else {
          console.log('⚠️ Certificados SSL não encontrados, usando HTTP');
          return false;
        }
      } catch (error) {
        console.log('⚠️ Erro ao carregar certificados SSL, usando HTTP');
        return false;
      }
    })(),

    // Configurações de proxy para desenvolvimento
    proxy: {
      '/api': {
        target: process.env.BACKEND_URL || 'http://localhost:3000',
        changeOrigin: true,
        secure: false
      }
    }
  },

  // Preview server configurações
  preview: {
    port: 4173,
    host: 'localhost', // Usar apenas localhost para evitar problemas de CORS
  },

  // Configurações de alias
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@components': resolve(__dirname, './src/components'),
      '@pages': resolve(__dirname, './src/pages'),
      '@services': resolve(__dirname, './src/services'),
      '@utils': resolve(__dirname, './src/utilities'),
      '@assets': resolve(__dirname, './src/assets'),
      '@styles': resolve(__dirname, './src/styles')
    }
  },

  // Otimizações de dependências
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'framer-motion',
      '@supabase/supabase-js',
      'lucide-react',
      'axios'
    ],
    exclude: [
      // Excluir dependências que não precisam de pré-bundling
    ]
  },

  // Configurações de CSS
  css: {
    devSourcemap: process.env.NODE_ENV === 'development',
    preprocessorOptions: {
      // Configurações específicas do preprocessor se necessário
    }
  },

  // Configurações de definições globais
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString())
  },

  // Configurações de PWA (se for implementar no futuro)
  // Deixar preparado para Service Worker
  manifest: false, // Será configurado quando implementar PWA

  // Configurações de workers
  worker: {
    format: 'es'
  }
})
