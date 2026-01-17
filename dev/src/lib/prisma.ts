// dev/src/lib/prisma.ts
// Prisma数据库连接工具

import { Prisma, PrismaClient } from '../generated/prisma';
import { logger } from './logger';

/**
 * 全局Prisma客户端实例
 * 在开发环境中避免热重载时创建多个连接
 */
declare global {
  var __prisma: PrismaClient | undefined;
}

/**
 * 创建Prisma客户端实例
 */
function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    errorFormat: 'pretty',
  });
}

/**
 * 获取Prisma客户端实例
 */
export const prisma = globalThis.__prisma || createPrismaClient();

// 在开发环境中将实例保存到全局变量，避免热重载时重复创建
if (process.env.NODE_ENV === 'development') {
  globalThis.__prisma = prisma;
}

/**
 * 数据库连接测试
 */
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    logger.error({ err: error }, '数据库连接测试失败');
    return false;
  }
}

/**
 * 优雅关闭数据库连接
 */
export async function disconnectDatabase(): Promise<void> {
  try {
    await prisma.$disconnect();
  } catch (error) {
    logger.error({ err: error }, '关闭数据库连接时出错');
  }
}

/**
 * 数据库事务执行器
 */
export async function executeTransaction<T>(
  callback: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  return prisma.$transaction(callback);
}

/**
 * 数据库健康检查
 */
export async function healthCheck(): Promise<{
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  details?: unknown;
}> {
  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const duration = Date.now() - start;
    
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      details: {
        responseTime: `${duration}ms`,
        database: 'PostgreSQL',
      },
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      details: {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}

// 进程退出时自动断开连接
process.on('beforeExit', async () => {
  await disconnectDatabase();
});

process.on('SIGINT', async () => {
  await disconnectDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await disconnectDatabase();
  process.exit(0);
});
