# 🔌 LegalMind仲裁平台 - API参考文档

**版本**：v1.0  
**最后更新**：2025-10-09  
**Base URL**：`https://api.legalmind.com` (生产环境)  
**Base URL**：`http://localhost:3000` (开发环境)

---

## 📋 目录

1. [认证授权](#认证授权)
2. [用户管理](#用户管理)
3. [案件管理](#案件管理)
4. [文档管理](#文档管理)
5. [庭审管理](#庭审管理)
6. [仲裁员管理](#仲裁员管理)
7. [AI服务](#ai服务)
8. [外部系统集成](#外部系统集成)
9. [通用规范](#通用规范)

---

## 认证授权

### POST /api/auth/register
用户注册

**请求体**：
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "name": "张三",
  "phone": "13800138000",
  "userType": "individual" | "enterprise"
}
```

**响应**：
```json
{
  "success": true,
  "data": {
    "userId": "user_123",
    "email": "user@example.com",
    "name": "张三"
  }
}
```

### POST /api/auth/login
用户登录

**请求体**：
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "mfaCode": "123456" // 可选，启用MFA时必填
}
```

**响应**：
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "user_123",
      "email": "user@example.com",
      "name": "张三",
      "role": "applicant"
    }
  }
}
```

### POST /api/auth/logout
用户登出

**Headers**：
```
Authorization: Bearer {accessToken}
```

**响应**：
```json
{
  "success": true,
  "message": "登出成功"
}
```

### GET /api/auth/me
获取当前用户信息

**Headers**：
```
Authorization: Bearer {accessToken}
```

**响应**：
```json
{
  "success": true,
  "data": {
    "id": "user_123",
    "email": "user@example.com",
    "name": "张三",
    "phone": "138****8000",
    "role": "applicant",
    "verified": true,
    "mfaEnabled": false
  }
}
```

### POST /api/auth/verify-identity
实名认证

**请求体**：
```json
{
  "idType": "id_card" | "business_license",
  "idNumber": "110101199001011234",
  "name": "张三",
  "faceImage": "base64_encoded_image" // 可选，人脸识别
}
```

**响应**：
```json
{
  "success": true,
  "data": {
    "verified": true,
    "verificationId": "verify_123"
  }
}
```

---

## 用户管理

### GET /api/users
获取用户列表（管理员）

**Query参数**：
- `page`: 页码（默认1）
- `limit`: 每页数量（默认20）
- `role`: 角色筛选
- `search`: 搜索关键词

**响应**：
```json
{
  "success": true,
  "data": {
    "users": [...],
    "total": 100,
    "page": 1,
    "limit": 20
  }
}
```

### GET /api/users/:id
获取用户详情

**响应**：
```json
{
  "success": true,
  "data": {
    "id": "user_123",
    "email": "user@example.com",
    "name": "张三",
    "phone": "138****8000",
    "role": "applicant",
    "verified": true,
    "createdAt": "2025-10-01T00:00:00Z"
  }
}
```

### PUT /api/users/:id
更新用户信息

**请求体**：
```json
{
  "name": "张三",
  "phone": "13800138000",
  "avatar": "https://..."
}
```

---

## 案件管理

### POST /api/cases
创建案件

**请求体**：
```json
{
  "title": "合同纠纷案",
  "description": "关于XX合同的纠纷",
  "caseType": "contract_dispute",
  "amount": 100000,
  "respondent": {
    "name": "李四",
    "contact": "13900139000"
  },
  "documents": ["doc_123", "doc_456"]
}
```

**响应**：
```json
{
  "success": true,
  "data": {
    "caseId": "case_123",
    "caseNumber": "2025-001",
    "status": "pending",
    "createdAt": "2025-10-09T10:00:00Z"
  }
}
```

### GET /api/cases
获取案件列表

**Query参数**：
- `page`: 页码
- `limit`: 每页数量
- `status`: 状态筛选
- `search`: 搜索关键词

**响应**：
```json
{
  "success": true,
  "data": {
    "cases": [
      {
        "id": "case_123",
        "caseNumber": "2025-001",
        "title": "合同纠纷案",
        "status": "pending",
        "amount": 100000,
        "createdAt": "2025-10-09T10:00:00Z"
      }
    ],
    "total": 50,
    "page": 1,
    "limit": 20
  }
}
```

### GET /api/cases/:id
获取案件详情

**响应**：
```json
{
  "success": true,
  "data": {
    "id": "case_123",
    "caseNumber": "2025-001",
    "title": "合同纠纷案",
    "description": "...",
    "status": "pending",
    "amount": 100000,
    "applicant": {...},
    "respondent": {...},
    "arbitrators": [...],
    "documents": [...],
    "hearings": [...],
    "timeline": [...]
  }
}
```

### PUT /api/cases/:id
更新案件

**请求体**：
```json
{
  "status": "in_progress",
  "description": "更新的描述"
}
```

### DELETE /api/cases/:id
删除案件（管理员）

---

## 文档管理

### POST /api/documents/upload
上传文档

**请求体**（multipart/form-data）：
```
file: File
caseId: string
documentType: string
description: string
```

**响应**：
```json
{
  "success": true,
  "data": {
    "documentId": "doc_123",
    "fileName": "contract.pdf",
    "fileSize": 1024000,
    "fileType": "application/pdf",
    "uploadedAt": "2025-10-09T10:00:00Z"
  }
}
```

### GET /api/documents/:id
获取文档信息

**响应**：
```json
{
  "success": true,
  "data": {
    "id": "doc_123",
    "fileName": "contract.pdf",
    "fileSize": 1024000,
    "fileType": "application/pdf",
    "downloadUrl": "https://...",
    "uploadedBy": "user_123",
    "uploadedAt": "2025-10-09T10:00:00Z"
  }
}
```

### POST /api/documents/ocr
OCR识别

**请求体**：
```json
{
  "documentId": "doc_123",
  "ocrType": "id_card" | "business_license" | "contract"
}
```

**响应**：
```json
{
  "success": true,
  "data": {
    "text": "识别的文本内容",
    "fields": {
      "name": "张三",
      "idNumber": "110101199001011234"
    }
  }
}
```

---

## 庭审管理

### POST /api/hearings
创建庭审

**请求体**：
```json
{
  "caseId": "case_123",
  "scheduledAt": "2025-10-15T14:00:00Z",
  "duration": 120,
  "type": "online" | "offline",
  "participants": ["user_123", "user_456"]
}
```

### GET /api/hearings/:id
获取庭审详情

**响应**：
```json
{
  "success": true,
  "data": {
    "id": "hearing_123",
    "caseId": "case_123",
    "scheduledAt": "2025-10-15T14:00:00Z",
    "status": "scheduled",
    "type": "online",
    "roomUrl": "https://...",
    "participants": [...],
    "recordings": [...]
  }
}
```

### POST /api/hearings/:id/start
开始庭审

### POST /api/hearings/:id/end
结束庭审

---

## AI服务

### POST /api/ai/analyze
案件分析

**请求体**：
```json
{
  "caseId": "case_123",
  "analysisType": "evidence" | "relationship" | "timeline"
}
```

**响应**：
```json
{
  "success": true,
  "data": {
    "analysis": "分析结果",
    "suggestions": ["建议1", "建议2"],
    "confidence": 0.85
  }
}
```

### POST /api/ai/generate
文书生成

**请求体**：
```json
{
  "caseId": "case_123",
  "documentType": "decision" | "notice" | "report",
  "template": "standard"
}
```

---

## 外部系统集成

### POST /api/external/sso/login
SSO登录

**请求体**：
```json
{
  "provider": "wechat" | "alipay" | "dingtalk",
  "code": "authorization_code"
}
```

### POST /api/external/payment
支付接口

**请求体**：
```json
{
  "caseId": "case_123",
  "amount": 10000,
  "paymentMethod": "wechat" | "alipay"
}
```

---

## 通用规范

### 请求头
```
Authorization: Bearer {accessToken}
Content-Type: application/json
X-Request-ID: {unique_request_id}
```

### 响应格式
```json
{
  "success": true | false,
  "data": {...} | null,
  "error": {
    "code": "ERROR_CODE",
    "message": "错误信息"
  } | null
}
```

### 错误码
- `400`: 请求参数错误
- `401`: 未授权
- `403`: 无权限
- `404`: 资源不存在
- `429`: 请求过于频繁
- `500`: 服务器错误

### 分页
```json
{
  "page": 1,
  "limit": 20,
  "total": 100,
  "data": [...]
}
```

---

**文档维护者**：LegalMind开发团队  
**最后更新**：2025-10-09

