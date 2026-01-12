import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      // 启用Fast Refresh
      fastRefresh: true,
      // Babel配置
      babel: {
        plugins: [
          // 移除console.log（生产环境）
          process.env.NODE_ENV === 'production' && [
            'transform-remove-console',
            { exclude: ['error', 'warn'] }
          ],
        ].filter(Boolean),
      },
    }),
  ],

  resolve: {
    alias: {
      '@': '/src'
    },
  },

  // 构建优化
  build: {
    // 目标浏览器
    target: 'es2015',

    // 输出目录
    outDir: 'dist',

    // 静态资源目录
    assetsDir: 'assets',

    // 小于此阈值的资源将内联为base64
    assetsInlineLimit: 4096, // 4KB

    // CSS代码分割
    cssCodeSplit: true,

    // 生成sourcemap
    sourcemap: process.env.NODE_ENV !== 'production',

    // Rollup配置
    rollupOptions: {
      output: {
        // 代码分割
        manualChunks: {
          // React核心
          'react-vendor': ['react', 'react-dom'],

          // Plait核心
          'plait-vendor': [
            '@plait/core',
            '@plait/common',
            '@plait/draw',
            '@plait/layouts',
            '@plait-board/react-board',
          ],

          // 状态管理
          'state-vendor': ['zustand'],

          // UI组件
          'ui-vendor': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
          ],

          // 工具库
          'utils-vendor': ['date-fns', 'clsx'],
        },

        // 文件命名
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
      },
    },

    // 压缩配置
    minify: 'terser',
    terserOptions: {
      compress: {
        // 移除console
        drop_console: process.env.NODE_ENV === 'production',
        // 移除debugger
        drop_debugger: true,
        // 移除无用代码
        pure_funcs: process.env.NODE_ENV === 'production'
          ? ['console.log', 'console.info', 'console.debug']
          : [],
      },
      format: {
        // 移除注释
        comments: false,
      },
    },

    // 分块大小警告限制
    chunkSizeWarningLimit: 1000, // 1MB

    // 启用CSS压缩
    cssMinify: true,
  },

  // 开发服务器配置
  server: {
    port: 3001,
    host: true,
    open: false,
    cors: true,

    // HMR配置
    hmr: {
      overlay: true,
    },
  },

  // 预览服务器配置
  preview: {
    port: 4173,
    host: true,
    open: false,
  },

  // 依赖优化
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'zustand',
      '@plait/core',
      '@plait/common',
      '@plait/draw',
      '@plait-board/react-board',
    ],
    exclude: [
      // 排除不需要预构建的依赖
    ],
  },

  // 性能优化
  esbuild: {
    // 移除console和debugger
    drop: process.env.NODE_ENV === 'production'
      ? ['console', 'debugger']
      : [],

    // 压缩标识符
    minifyIdentifiers: true,

    // 压缩语法
    minifySyntax: true,

    // 压缩空白
    minifyWhitespace: true,
  },
})
