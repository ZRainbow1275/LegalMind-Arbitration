# 🗄️ LegalMind仲裁平台 - 数据库设计

**版本**：v2.0  
**最后更新**：2025-10-09  
**数据库**：PostgreSQL 17  
**ORM**：Prisma 6.15.0

---

## 📋 目录

1. [数据库概述](#数据库概述)
2. [核心数据表](#核心数据表)
3. [数据关系](#数据关系)
4. [索引设计](#索引设计)
5. [性能优化](#性能优化)
6. [备份策略](#备份策略)

---

## 数据库概述

### 技术栈

- **数据库**：PostgreSQL 17
- **ORM**：Prisma 6.15.0
- **连接池**：Prisma内置连接池
- **缓存层**：Redis 7.x
- **迁移管理**：Prisma Migrate

### 连接配置

```env
DATABASE_URL="postgresql://postgres:password@localhost:5433/legalmind"
REDIS_URL="redis://localhost:6379"
```

### 数据库特性

- ✅ UUID主键（分布式友好）
- ✅ 时间戳自动管理
- ✅ 软删除支持
- ✅ JSONB字段（灵活扩展）
- ✅ 全文搜索（PostgreSQL FTS）
- ✅ 行级安全（RLS）

---

## 核心数据表

### 1. 用户管理（3个表）

#### users - 用户基础表
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20) UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  user_type VARCHAR(20) NOT NULL, -- individual, enterprise
  status VARCHAR(20) DEFAULT 'active', -- active, inactive, suspended
  email_verified BOOLEAN DEFAULT false,
  phone_verified BOOLEAN DEFAULT false,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB
);
```

**字段说明**：
- `id`: UUID主键
- `email`: 邮箱（唯一）
- `phone`: 手机号（唯一）
- `password_hash`: bcrypt哈希密码
- `user_type`: 用户类型（个人/企业）
- `status`: 用户状态
- `metadata`: 扩展信息（SSO、偏好设置等）

#### user_profiles - 用户档案表
```sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  real_name VARCHAR(100),
  id_card_number VARCHAR(18) UNIQUE,
  business_license VARCHAR(50) UNIQUE,
  avatar VARCHAR(500),
  address VARCHAR(500),
  is_verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### user_roles - 用户角色表
```sql
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL, -- super_admin, admin, arbitrator, secretary, applicant, respondent, observer
  permissions JSONB,
  is_active BOOLEAN DEFAULT true,
  assigned_by UUID REFERENCES users(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2. 案件管理（3个表）

#### cases - 案件表
```sql
CREATE TABLE cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_number VARCHAR(50) UNIQUE NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  case_type VARCHAR(50) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  amount DECIMAL(15, 2),
  applicant_id UUID NOT NULL REFERENCES users(id),
  respondent_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB
);
```

#### case_parties - 案件当事人表
```sql
CREATE TABLE case_parties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  party_type VARCHAR(20) NOT NULL, -- applicant, respondent, third_party
  name VARCHAR(100) NOT NULL,
  contact VARCHAR(100),
  role VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### case_timeline - 案件时间轴表
```sql
CREATE TABLE case_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  occurred_at TIMESTAMPTZ NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB
);
```

### 3. 文档管理（2个表）

#### documents - 文档表
```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  file_name VARCHAR(500) NOT NULL,
  file_size BIGINT NOT NULL,
  file_type VARCHAR(100) NOT NULL,
  file_path VARCHAR(1000) NOT NULL,
  document_type VARCHAR(50) NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES users(id),
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'active',
  metadata JSONB
);
```

#### document_versions - 文档版本表
```sql
CREATE TABLE document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  version_number INT NOT NULL,
  file_path VARCHAR(1000) NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES users(id),
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  changes TEXT
);
```

### 4. 庭审管理（2个表）

#### hearings - 庭审表
```sql
CREATE TABLE hearings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  hearing_number VARCHAR(50) UNIQUE NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration INT, -- 分钟
  type VARCHAR(20) NOT NULL, -- online, offline
  status VARCHAR(20) DEFAULT 'scheduled',
  room_url VARCHAR(500),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB
);
```

#### hearing_participants - 庭审参与者表
```sql
CREATE TABLE hearing_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hearing_id UUID NOT NULL REFERENCES hearings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  role VARCHAR(50) NOT NULL,
  joined_at TIMESTAMPTZ,
  left_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 5. 仲裁员管理（2个表）

#### arbitrators - 仲裁员表
```sql
CREATE TABLE arbitrators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  license_number VARCHAR(50) UNIQUE NOT NULL,
  specialties TEXT[],
  experience_years INT,
  rating DECIMAL(3, 2),
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB
);
```

#### case_arbitrators - 案件仲裁员关联表
```sql
CREATE TABLE case_arbitrators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  arbitrator_id UUID NOT NULL REFERENCES arbitrators(id),
  role VARCHAR(20) NOT NULL, -- chief, member
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'active'
);
```

### 6. 系统管理（3个表）

#### audit_logs - 审计日志表
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id UUID,
  ip_address VARCHAR(45),
  user_agent TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### sessions - 会话表
```sql
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### notifications - 通知表
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  content TEXT,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB
);
```

---

## 数据关系

### ER图概述

```
users (1) ----< (N) cases
users (1) ----< (N) documents
users (1) ----< (N) audit_logs
users (1) ----< (N) sessions
users (1) ----< (N) notifications
users (1) ---- (1) user_profiles
users (1) ----< (N) user_roles
users (1) ---- (1) arbitrators

cases (1) ----< (N) case_parties
cases (1) ----< (N) case_timeline
cases (1) ----< (N) documents
cases (1) ----< (N) hearings
cases (1) ----< (N) case_arbitrators

documents (1) ----< (N) document_versions

hearings (1) ----< (N) hearing_participants

arbitrators (1) ----< (N) case_arbitrators
```

---

## 索引设计

### 主要索引

```sql
-- users表
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_created_at ON users(created_at);

-- cases表
CREATE INDEX idx_cases_case_number ON cases(case_number);
CREATE INDEX idx_cases_applicant_id ON cases(applicant_id);
CREATE INDEX idx_cases_respondent_id ON cases(respondent_id);
CREATE INDEX idx_cases_status ON cases(status);
CREATE INDEX idx_cases_created_at ON cases(created_at);

-- documents表
CREATE INDEX idx_documents_case_id ON documents(case_id);
CREATE INDEX idx_documents_uploaded_by ON documents(uploaded_by);
CREATE INDEX idx_documents_uploaded_at ON documents(uploaded_at);

-- hearings表
CREATE INDEX idx_hearings_case_id ON hearings(case_id);
CREATE INDEX idx_hearings_scheduled_at ON hearings(scheduled_at);
CREATE INDEX idx_hearings_status ON hearings(status);

-- audit_logs表
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
```

### 复合索引

```sql
-- 案件查询优化
CREATE INDEX idx_cases_status_created_at ON cases(status, created_at DESC);

-- 文档查询优化
CREATE INDEX idx_documents_case_id_type ON documents(case_id, document_type);

-- 审计日志查询优化
CREATE INDEX idx_audit_logs_user_action ON audit_logs(user_id, action, created_at DESC);
```

---

## 性能优化

### 1. 查询优化

- 使用索引覆盖查询
- 避免SELECT *
- 使用EXPLAIN ANALYZE分析查询
- 合理使用JOIN和子查询

### 2. 缓存策略

- Redis缓存热点数据
- 缓存过期时间：5-30分钟
- 缓存更新策略：写入时失效

### 3. 分区策略

```sql
-- 审计日志按月分区
CREATE TABLE audit_logs_2025_10 PARTITION OF audit_logs
FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');
```

### 4. 连接池配置

```env
DATABASE_POOL_MIN=5
DATABASE_POOL_MAX=20
DATABASE_POOL_TIMEOUT=30000
```

---

## 备份策略

### 备份计划

- **频率**：每日凌晨2点自动备份
- **保留期**：30天
- **加密**：AES-256-GCM
- **存储**：异地存储

### 备份命令

```bash
# 完整备份
pg_dump -h localhost -p 5433 -U postgres -F c -b -v -f backup_$(date +%Y%m%d).dump legalmind

# 恢复
pg_restore -h localhost -p 5433 -U postgres -d legalmind -v backup_20251009.dump
```

---

**文档维护者**：LegalMind开发团队  
**最后更新**：2025-10-09

