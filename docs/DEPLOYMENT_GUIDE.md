# 🚀 LegalMind仲裁平台 - 部署指南

**版本**：v1.0  
**最后更新**：2025-10-09  
**生产就绪度**：90%

---

## 📋 目录

1. [环境要求](#环境要求)
2. [环境配置](#环境配置)
3. [部署流程](#部署流程)
4. [性能优化](#性能优化)
5. [备份恢复](#备份恢复)
6. [应急响应](#应急响应)
7. [监控告警](#监控告警)

---

## 环境要求

### 硬件要求

**开发环境**：
- CPU: 4核心
- 内存: 8GB
- 硬盘: 50GB SSD

**生产环境**：
- CPU: 8核心+
- 内存: 16GB+
- 硬盘: 200GB+ SSD
- 带宽: 100Mbps+

### 软件要求

- **Node.js**: 18.x+
- **PostgreSQL**: 17.x
- **Redis**: 7.x
- **pnpm**: 8.x+
- **Nginx**: 1.24+（可选）

---

## 环境配置

### 1. 环境变量

创建`.env.local`文件：

```env
# 数据库配置
DATABASE_URL=postgresql://postgres:password@localhost:5433/legalmind
REDIS_URL=redis://localhost:6379

# 安全配置
ENCRYPTION_KEY=your-32-character-encryption-key
SESSION_SECRET=your-session-secret-key
CSRF_SECRET=your-csrf-secret-key

# 密码策略
PASSWORD_MIN_LENGTH=8
PASSWORD_REQUIRE_UPPERCASE=true
PASSWORD_REQUIRE_LOWERCASE=true
PASSWORD_REQUIRE_NUMBERS=true
PASSWORD_REQUIRE_SPECIAL=true

# 登录安全
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_DURATION=900
SESSION_TIMEOUT=1800

# MFA配置
MFA_ENABLED=true
MFA_REQUIRED_FOR_ADMIN=true

# 限流配置
RATE_LIMIT_ENABLED=true
RATE_LIMIT_GLOBAL_MAX=100
RATE_LIMIT_LOGIN_MAX=5

# 审计日志
AUDIT_LOG_ENABLED=true
AUDIT_LOG_RETENTION_DAYS=180

# 备份配置
BACKUP_ENABLED=true
BACKUP_SCHEDULE=0 2 * * *
BACKUP_RETENTION_DAYS=30
```

### 2. 数据库初始化

```bash
# 生成Prisma客户端
pnpm prisma generate

# 运行数据库迁移
pnpm prisma migrate deploy

# 填充初始数据（可选）
pnpm prisma db seed
```

### 3. Redis配置

```bash
# 启动Redis
redis-server

# 验证连接
redis-cli ping
```

---

## 部署流程

### 开发环境

```bash
# 1. 克隆项目
git clone <repository-url>
cd LegalMind-Arbitration/dev

# 2. 安装依赖
pnpm install

# 3. 配置环境变量
cp .env.example .env.local
# 编辑.env.local

# 4. 初始化数据库
pnpm prisma generate
pnpm prisma db push

# 5. 启动开发服务器
pnpm dev
```

### 生产环境

```bash
# 1. 构建项目
pnpm build

# 2. 启动生产服务器
pnpm start

# 或使用PM2
pm2 start npm --name "legalmind" -- start
pm2 save
pm2 startup
```

### Docker部署

```dockerfile
# Dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install
COPY . .
RUN pnpm build

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
EXPOSE 3000
CMD ["npm", "start"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/legalmind
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis

  db:
    image: postgres:17
    environment:
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=legalmind
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

---

## 性能优化

### 1. 缓存策略

**Redis缓存配置**：
```typescript
// 缓存配置
const cacheConfig = {
  ttl: {
    short: 5 * 60,      // 5分钟
    medium: 30 * 60,    // 30分钟
    long: 24 * 60 * 60  // 24小时
  },
  keys: {
    user: 'user:',
    case: 'case:',
    document: 'document:'
  }
};
```

### 2. 数据库优化

**连接池配置**：
```env
DATABASE_POOL_MIN=5
DATABASE_POOL_MAX=20
DATABASE_POOL_TIMEOUT=30000
```

**查询优化**：
- 使用索引
- 避免N+1查询
- 使用EXPLAIN ANALYZE分析查询

### 3. CDN配置

```nginx
# Nginx配置
location /static/ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}

location /_next/static/ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

---

## 备份恢复

### 自动备份

```bash
# 备份脚本
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"

# 数据库备份
pg_dump -h localhost -p 5433 -U postgres -F c -b -v \
  -f $BACKUP_DIR/db_$DATE.dump legalmind

# 加密备份
openssl enc -aes-256-cbc -salt \
  -in $BACKUP_DIR/db_$DATE.dump \
  -out $BACKUP_DIR/db_$DATE.dump.enc \
  -k $ENCRYPTION_KEY

# 删除未加密文件
rm $BACKUP_DIR/db_$DATE.dump

# 清理旧备份（保留30天）
find $BACKUP_DIR -name "db_*.dump.enc" -mtime +30 -delete
```

### 恢复流程

```bash
# 1. 解密备份
openssl enc -aes-256-cbc -d \
  -in backup.dump.enc \
  -out backup.dump \
  -k $ENCRYPTION_KEY

# 2. 恢复数据库
pg_restore -h localhost -p 5433 -U postgres \
  -d legalmind -v backup.dump

# 3. 验证数据
psql -h localhost -p 5433 -U postgres -d legalmind \
  -c "SELECT COUNT(*) FROM users;"
```

---

## 应急响应

### 故障分级

**一级故障**：系统瘫痪、大规模数据泄露
- 响应时间：立即
- 处理时间：< 1小时

**二级故障**：部分功能不可用、小规模数据泄露
- 响应时间：< 15分钟
- 处理时间：< 4小时

**三级故障**：性能下降、单个用户数据泄露
- 响应时间：< 1小时
- 处理时间：< 24小时

### 应急流程

1. **发现问题**：监控告警、用户反馈
2. **评估影响**：确定故障级别和影响范围
3. **启动预案**：通知相关人员、隔离受影响系统
4. **实施修复**：根据预案执行修复措施
5. **验证恢复**：确认系统恢复正常
6. **事后分析**：总结经验、改进流程

### 联系方式

- **安全负责人**：[联系方式]
- **技术负责人**：[联系方式]
- **应急热线**：[电话号码]

---

## 监控告警

### 监控指标

**系统指标**：
- CPU使用率
- 内存使用率
- 磁盘使用率
- 网络流量

**应用指标**：
- 请求响应时间
- 错误率
- 并发用户数
- API调用次数

**数据库指标**：
- 连接数
- 查询响应时间
- 慢查询数量
- 死锁数量

### 告警规则

```yaml
# 告警配置
alerts:
  - name: high_cpu_usage
    condition: cpu_usage > 80%
    duration: 5m
    severity: warning

  - name: high_error_rate
    condition: error_rate > 5%
    duration: 1m
    severity: critical

  - name: slow_response
    condition: response_time > 1000ms
    duration: 5m
    severity: warning
```

---

## 相关文档

- [安全指南](SECURITY_GUIDE.md)
- [API参考](API_REFERENCE.md)
- [数据库设计](DATABASE_DESIGN.md)

---

**文档维护者**：LegalMind运维团队  
**最后更新**：2025-10-09

