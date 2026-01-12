/**
 * Vitest配置文件
 * 
 * 用于配置单元测试和组件测试
 */

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    // 测试环境
    environment: 'jsdom',
    
    // 全局设置
    globals: true,
    
    // 覆盖率配置
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData',
        '**/types'
      ]
    },
    
    // 设置文件
    setupFiles: ['./src/test/setup.ts'],
    
    // 包含的测试文件
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    
    // 排除的文件
    exclude: ['node_modules', 'dist', '.idea', '.git', '.cache']
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});

