import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // Otimizações de build para performance
  build: {
    // Otimizações de chunk
    rollupOptions: {
      output: {
        // Dividir chunks para melhor caching
        manualChunks: {
          // Vendor chunks separados
          'react-vendor': ['react', 'react-dom'],
          'router-vendor': ['react-router-dom'],
          'ui-vendor': ['react-icons', 'lucide-react', '@headlessui/react', '@heroicons/react', '@nextui-org/react'],
          'animations-vendor': ['framer-motion', 'react-parallax-tilt', '@tsparticles/react', '@tsparticles/engine'],
          'charts-vendor': ['chart.js', 'react-chartjs-2'],
          'supabase-vendor': ['@supabase/supabase-js', '@supabase/auth-helpers-react'],
          'stripe-vendor': ['@stripe/react-stripe-js', '@stripe/stripe-js'],
          'utils-vendor': ['axios', 'react-hot-toast', 'qrcode.react', 'socket.io-client', 'react-date-range']
        },
        
        // Nomes de arquivos otimizados
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId ? chunkInfo.facadeModuleId.split('/').pop() : 'chunk';
          return `js/[name]-[hash].js`;
        },
        
        // Nomes de assets otimizados
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
            return `images/[name]-[hash][extname]`;
          }
          if (/css/i.test(ext)) {
            return `css/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        }
      }
    },
    
    // Otimizações de minificação
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log em produção
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug']
      }
    },
    
    // Otimizações de CSS
    cssCodeSplit: true,
    
    // Otimizações de assets
    assetsInlineLimit: 4096, // 4KB
    
    // Source maps para debugging (remover em produção)
    sourcemap: false,
    
    // Otimizações de chunk
    chunkSizeWarningLimit: 1000,
    
    // Otimizações de target
    target: 'es2015'
  },
  
  // Otimizações de desenvolvimento
  server: {
    port: 3001,
    host: true,
    https: {
      key: '../data/ssl/private.key',
      cert: '../data/ssl/certificate.crt'
    }
  },
  
  // Otimizações de preview
  preview: {
    port: 3001,
    host: true,
    https: {
      key: '../data/ssl/private.key',
      cert: '../data/ssl/certificate.crt'
    }
  },
  
  // Resolução de módulos
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@components': resolve(__dirname, 'src/components'),
      '@hooks': resolve(__dirname, 'src/hooks'),
      '@utils': resolve(__dirname, 'src/utils'),
      '@pages': resolve(__dirname, 'src/pages'),
      '@assets': resolve(__dirname, 'src/assets')
    }
  },
  
  // Otimizações de dependências
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'react-icons',
      'lucide-react',
      '@headlessui/react',
      '@heroicons/react',
      '@nextui-org/react',
      'framer-motion',
      'chart.js',
      'react-chartjs-2',
      '@supabase/supabase-js',
      '@supabase/auth-helpers-react',
      'axios',
      'react-hot-toast'
    ],
    exclude: [
      // Excluir dependências que não precisam ser pré-empacotadas
    ]
  },
  
  // Otimizações de define
  define: {
    // Remover React DevTools em produção
    __DEV__: JSON.stringify(process.env.NODE_ENV === 'development'),
    
    // Otimizações globais
    global: 'globalThis'
  }
})
