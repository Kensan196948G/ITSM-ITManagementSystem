import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'
import { resolve } from 'path'

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    plugins: [
      react({
        // React Refresh for faster development
        fastRefresh: true,
        // Optimize JSX transform
        jsxRuntime: 'automatic',
      }),
      // Bundle analyzer (only in analyze mode)
      ...(env.ANALYZE === 'true' ? [
        visualizer({
          filename: 'dist/stats.html',
          open: true,
          gzipSize: true,
          brotliSize: true,
        })
      ] : []),
    ],
    
    server: {
      port: 3000,
      open: true,
      host: true,
      proxy: {
        '/api': {
          target: env.VITE_API_BASE_URL || 'http://localhost:8000',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api/, '/api/v1'),
        },
      },
    },

    build: {
      // Modern build target for better performance
      target: ['es2020', 'edge88', 'firefox78', 'chrome87', 'safari13.1'],
      outDir: 'dist',
      assetsDir: 'assets',
      // Source maps only in development or when explicitly requested
      sourcemap: command === 'serve' || env.GENERATE_SOURCEMAP === 'true',
      // Enable minification
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: mode === 'production',
          drop_debugger: mode === 'production',
          pure_funcs: mode === 'production' ? ['console.log', 'console.info'] : [],
        },
        mangle: {
          safari10: true,
        },
        format: {
          comments: false,
        },
      },
      // Optimize chunk splitting
      rollupOptions: {
        output: {
          // Manual chunk splitting for better caching
          manualChunks: {
            // React and React DOM
            'react-vendor': ['react', 'react-dom'],
            // Material-UI
            'mui-vendor': [
              '@mui/material',
              '@mui/icons-material',
              '@mui/x-charts',
              '@mui/x-data-grid',
              '@emotion/react',
              '@emotion/styled',
            ],
            // Chart libraries
            'chart-vendor': ['recharts'],
            // Router
            'router-vendor': ['react-router-dom'],
            // HTTP client
            'http-vendor': ['axios'],
          },
          // Optimize asset naming
          assetFileNames: (assetInfo) => {
            const info = assetInfo.name!.split('.')
            const extension = info[info.length - 1]
            
            if (/\.(png|jpe?g|svg|gif|tiff|bmp|ico)$/i.test(assetInfo.name!)) {
              return `images/[name]-[hash].${extension}`
            }
            if (/\.(woff|woff2|eot|ttf|otf)$/i.test(assetInfo.name!)) {
              return `fonts/[name]-[hash].${extension}`
            }
            if (/\.css$/i.test(assetInfo.name!)) {
              return `css/[name]-[hash].${extension}`
            }
            return `assets/[name]-[hash].${extension}`
          },
          chunkFileNames: 'js/[name]-[hash].js',
          entryFileNames: 'js/[name]-[hash].js',
        },
      },
      // Increase chunk size warning limit
      chunkSizeWarningLimit: 1000,
      // Enable CSS code splitting
      cssCodeSplit: true,
    },

    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
        '@components': resolve(__dirname, 'src/components'),
        '@pages': resolve(__dirname, 'src/pages'),
        '@services': resolve(__dirname, 'src/services'),
        '@utils': resolve(__dirname, 'src/utils'),
        '@hooks': resolve(__dirname, 'src/hooks'),
        '@types': resolve(__dirname, 'src/types'),
        '@theme': resolve(__dirname, 'src/theme'),
      },
    },

    // Optimize dependencies
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        '@mui/material',
        '@mui/icons-material',
        'axios',
        'recharts',
      ],
      exclude: [
        // Large libraries that should be loaded on demand
        '@mui/x-data-grid',
        '@mui/x-charts',
      ],
    },

    // Environment variables configuration
    define: {
      __DEV__: command === 'serve',
      __PROD__: command === 'build',
      __VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    },

    // CSS configuration
    css: {
      // Enable CSS modules
      modules: {
        localsConvention: 'camelCase',
      },
      // PostCSS configuration
      postcss: {
        plugins: [
          // Add autoprefixer for better browser compatibility
          // require('autoprefixer')(),
        ],
      },
      // CSS preprocessing options
      preprocessorOptions: {
        scss: {
          additionalData: `@import "@/theme/variables.scss";`,
        },
      },
    },

    // Development-specific optimizations
    ...(command === 'serve' && {
      esbuild: {
        // Enable esbuild for faster builds in development
        jsxDev: true,
      },
    }),

    // Production-specific optimizations
    ...(command === 'build' && {
      esbuild: {
        drop: ['console', 'debugger'],
      },
    }),

    // Test configuration
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      css: true,
    },

    // PWA configuration placeholder
    // Add PWA plugin configuration here if needed
    
    // Performance monitoring
    ...(env.PERFORMANCE_MONITORING === 'true' && {
      // Add performance monitoring plugins
    }),
  }
})