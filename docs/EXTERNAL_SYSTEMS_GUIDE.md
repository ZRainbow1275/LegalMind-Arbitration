# LegalMind 仲裁平台外部系统集成指南

**文档版本**: Version 2.0  
**更新日期**: 2025年9月3日  
**维护者**: LegalMind开发团队  

## 📋 概述

本文档详细介绍了LegalMind仲裁平台与外部系统的集成架构，包括法院数据系统、公证系统、法律数据库等的对接方案和实现细节。

## 🌐 外部系统架构

### 支持的外部系统
- **法院数据系统**: 案件通知、状态查询、文档提交
- **公证系统**: 公证申请、状态检查、证书下载
- **法律数据库**: 法条搜索、判例研究、法规查询

### 集成架构
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  仲裁平台核心   │───▶│  外部系统管理器  │───▶│   外部系统API   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌──────────────────┐
                       │  监控和日志系统  │
                       └──────────────────┘
```

## 🏛️ 法院数据系统集成

### 系统概述
法院数据系统集成允许仲裁平台与人民法院系统进行数据交换，实现案件信息同步、司法确认申请等功能。

### 配置管理
```typescript
// 法院系统配置
const courtSystemConfig = {
  name: '法院数据系统',
  endpoint: process.env.COURT_SYSTEM_ENDPOINT || 'https://api.court.gov.cn',
  apiKey: process.env.COURT_SYSTEM_API_KEY,
  timeout: 30000,
  retries: 3,
  enabled: !!process.env.COURT_SYSTEM_API_KEY,
};
```

### 支持的操作

#### 1. 案件通知
```typescript
// 向法院通知仲裁案件
const courtNotification = await externalSystemManager.integrateCourtSystem('notify_court', {
  caseId: 'uuid',
  courtName: '北京市第一中级人民法院',
  notificationType: 'case_filing',
  caseDetails: {
    caseNumber: 'CASE2025001',
    title: '合同纠纷案件',
    parties: [
      { name: '申请人', role: 'plaintiff' },
      { name: '被申请人', role: 'defendant' }
    ]
  }
});
```

#### 2. 案件状态查询
```typescript
// 查询法院案件状态
const caseStatus = await externalSystemManager.integrateCourtSystem('query_case', {
  caseNumber: 'COURT2025001',
  courtName: '北京市第一中级人民法院'
});

if (caseStatus.success) {
  const { status, hearingDate, documents } = caseStatus.data;
  console.log('案件状态:', status);
  console.log('开庭时间:', hearingDate);
}
```

#### 3. 文档提交
```typescript
// 向法院提交文档
const documentSubmission = await externalSystemManager.integrateCourtSystem('submit_documents', {
  caseNumber: 'COURT2025001',
  documents: [
    {
      type: '仲裁申请书',
      title: '仲裁申请书',
      filePath: '/documents/arbitration-application.pdf'
    },
    {
      type: '证据材料',
      title: '合同原件',
      filePath: '/documents/contract-original.pdf'
    }
  ]
});
```

### 响应格式
```typescript
interface CourtSystemData {
  caseNumber: string;              // 法院案件编号
  courtName: string;               // 法院名称
  status: string;                  // 案件状态
  filingDate: string;              // 立案日期
  hearingDate?: string;            // 开庭日期
  judgmentDate?: string;           // 判决日期
  parties: Array<{
    name: string;                  // 当事人姓名
    role: 'plaintiff' | 'defendant'; // 角色
    representative?: string;        // 代理人
  }>;
  documents: Array<{
    type: string;                  // 文档类型
    title: string;                 // 文档标题
    uploadDate: string;            // 上传日期
    status: string;                // 文档状态
  }>;
}
```

## 📋 公证系统集成

### 系统概述
公证系统集成支持在线公证申请、公证状态查询、公证书下载等功能，为仲裁协议和调解协议提供公证服务。

### 配置管理
```typescript
// 公证系统配置
const notarySystemConfig = {
  name: '公证系统',
  endpoint: process.env.NOTARY_SYSTEM_ENDPOINT || 'https://api.notary.org.cn',
  apiKey: process.env.NOTARY_SYSTEM_API_KEY,
  timeout: 30000,
  retries: 3,
  enabled: !!process.env.NOTARY_SYSTEM_API_KEY,
};
```

### 支持的操作

#### 1. 申请公证
```typescript
// 申请文档公证
const notaryApplication = await externalSystemManager.integrateNotarySystem('apply_notarization', {
  notaryType: 'document_authentication',
  notaryOffice: '北京市第一公证处',
  documents: [
    {
      name: '调解协议书',
      filePath: '/documents/mediation-agreement.pdf',
      hash: 'sha256_hash_value'
    }
  ],
  applicant: {
    name: '张三',
    idCard: '110101199001011234',
    phone: '13800138000'
  }
});
```

#### 2. 查询公证状态
```typescript
// 查询公证进度
const notaryStatus = await externalSystemManager.integrateNotarySystem('check_notary_status', {
  notaryNumber: 'NOTARY2025001'
});

if (notaryStatus.success) {
  const { status, completionDate, certificate } = notaryStatus.data;
  console.log('公证状态:', status);
  if (status === 'completed') {
    console.log('完成日期:', completionDate);
    console.log('公证书编号:', certificate.number);
  }
}
```

#### 3. 下载公证书
```typescript
// 下载公证书
const certificateDownload = await externalSystemManager.integrateNotarySystem('download_certificate', {
  notaryNumber: 'NOTARY2025001',
  certificateNumber: 'CERT2025001'
});

if (certificateDownload.success) {
  // 保存公证书文件
  const certificateData = certificateDownload.data;
  await saveCertificateFile(certificateData);
}
```

### 响应格式
```typescript
interface NotarySystemData {
  notaryNumber: string;            // 公证编号
  notaryOffice: string;            // 公证处名称
  notaryType: string;              // 公证类型
  applicationDate: string;         // 申请日期
  completionDate?: string;         // 完成日期
  status: 'pending' | 'in_progress' | 'completed' | 'rejected';
  documents: Array<{
    name: string;                  // 文档名称
    hash: string;                  // 文档哈希
    timestamp: string;             // 时间戳
  }>;
  certificate?: {
    number: string;                // 公证书编号
    issueDate: string;             // 签发日期
    validUntil: string;            // 有效期至
  };
}
```

## 📚 法律数据库集成

### 系统概述
法律数据库集成提供法条搜索、判例研究、法规查询等功能，为仲裁案件提供法律依据和参考。

### 配置管理
```typescript
// 法律数据库配置
const legalDatabaseConfig = {
  name: '法律数据库',
  endpoint: process.env.LEGAL_DB_ENDPOINT || 'https://api.legaldb.cn',
  apiKey: process.env.LEGAL_DB_API_KEY,
  timeout: 30000,
  retries: 3,
  enabled: !!process.env.LEGAL_DB_API_KEY,
};
```

### 支持的操作

#### 1. 法条搜索
```typescript
// 搜索相关法条
const lawSearch = await externalSystemManager.integrateLegalDatabase('search_laws', {
  keywords: ['合同', '违约', '赔偿'],
  lawType: 'civil',
  effectiveDate: '2021-01-01'
});

if (lawSearch.success) {
  const { laws } = lawSearch.data;
  laws.forEach(law => {
    console.log(`${law.title} ${law.article}: ${law.content}`);
    console.log(`相关性: ${law.relevanceScore}`);
  });
}
```

#### 2. 判例研究
```typescript
// 搜索相似判例
const precedentSearch = await externalSystemManager.integrateLegalDatabase('search_precedents', {
  caseType: 'CONTRACT_DISPUTE',
  keywords: ['软件开发', '合同纠纷'],
  court: '最高人民法院',
  dateRange: {
    start: '2020-01-01',
    end: '2024-12-31'
  }
});

if (precedentSearch.success) {
  const { precedents } = precedentSearch.data;
  precedents.forEach(precedent => {
    console.log(`案件: ${precedent.caseTitle}`);
    console.log(`法院: ${precedent.court}`);
    console.log(`摘要: ${precedent.summary}`);
  });
}
```

#### 3. 综合搜索
```typescript
// 综合法律搜索
const comprehensiveSearch = await externalSystemManager.integrateLegalDatabase('comprehensive_search', {
  query: '合同违约责任',
  includeLaws: true,
  includePrecedents: true,
  includeRegulations: true,
  limit: 20
});

if (comprehensiveSearch.success) {
  const { laws, precedents, regulations } = comprehensiveSearch.data;
  
  // 处理搜索结果
  const searchResults = {
    laws: laws.length,
    precedents: precedents.length,
    regulations: regulations.length
  };
}
```

### 响应格式
```typescript
interface LegalDatabaseData {
  laws: Array<{
    title: string;                 // 法律名称
    article: string;               // 条文编号
    content: string;               // 条文内容
    effectiveDate: string;         // 生效日期
    relevanceScore: number;        // 相关性评分
  }>;
  precedents: Array<{
    caseTitle: string;             // 案件标题
    court: string;                 // 审理法院
    date: string;                  // 判决日期
    summary: string;               // 案件摘要
    relevanceScore: number;        // 相关性评分
    citation: string;              // 案件引用
  }>;
  regulations: Array<{
    title: string;                 // 法规标题
    department: string;            // 发布部门
    number: string;                // 法规编号
    content: string;               // 法规内容
    relevanceScore: number;        // 相关性评分
  }>;
}
```

## 🔄 集成流程示例

### 仲裁案件完整流程
```typescript
// 1. 创建仲裁案件
const arbitrationCase = await createArbitrationCase(caseData);

// 2. 向法院通知案件
const courtNotification = await externalSystemManager.integrateCourtSystem('notify_court', {
  caseId: arbitrationCase.id,
  courtName: '北京市第一中级人民法院',
  notificationType: 'case_filing'
});

// 3. 搜索相关法律依据
const legalResearch = await externalSystemManager.integrateLegalDatabase('comprehensive_search', {
  query: arbitrationCase.description,
  includeAll: true
});

// 4. 如果达成调解协议，申请公证
if (mediationAgreement) {
  const notaryApplication = await externalSystemManager.integrateNotarySystem('apply_notarization', {
    notaryType: 'agreement_notarization',
    documents: [mediationAgreement]
  });
}

// 5. 申请司法确认
if (judicialConfirmationNeeded) {
  const confirmationRequest = await externalSystemManager.integrateCourtSystem('request_confirmation', {
    agreementId: mediationAgreement.id,
    courtName: '北京市第一中级人民法院'
  });
}
```

## 📊 监控和管理

### 系统状态监控
```typescript
// 获取外部系统状态
const systemStatus = externalSystemManager.getSystemStatus();
console.log('法院系统:', systemStatus.courtSystem.enabled ? '在线' : '离线');
console.log('公证系统:', systemStatus.notarySystem.enabled ? '在线' : '离线');
console.log('法律数据库:', systemStatus.legalDatabase.enabled ? '在线' : '离线');

// 测试系统连接
const connectionTests = await externalSystemManager.testConnections();
console.log('连接测试结果:', connectionTests);
```

### 使用统计
```typescript
// 外部系统使用统计
interface ExternalSystemStats {
  courtSystem: {
    requests: number;
    successRate: number;
    avgResponseTime: number;
  };
  notarySystem: {
    requests: number;
    successRate: number;
    avgResponseTime: number;
  };
  legalDatabase: {
    requests: number;
    successRate: number;
    avgResponseTime: number;
  };
}
```

## 🔧 错误处理和降级

### 错误处理策略
```typescript
// 统一错误处理
try {
  const result = await externalSystemManager.integrateCourtSystem(action, params);
  return result;
} catch (error) {
  // 记录错误
  logger.error('外部系统调用失败', { system: 'courtSystem', action, error });
  
  // 返回降级响应
  return {
    success: false,
    error: '外部系统暂时不可用，请稍后重试',
    systemInfo: {
      system: 'courtSystem',
      responseTime: 0,
      error: error.message
    }
  };
}
```

### 降级服务
```typescript
// 当外部系统不可用时的降级处理
private createMockCourtResponse(action: string, params: any): ExternalSystemResponse<CourtSystemData> {
  return {
    success: true,
    data: {
      caseNumber: `MOCK_COURT_${Date.now()}`,
      courtName: '模拟法院',
      status: 'mock_status',
      filingDate: new Date().toISOString(),
      parties: [],
      documents: [],
    },
    systemInfo: {
      system: 'courtSystem',
      responseTime: 100,
      version: 'mock',
    },
  };
}
```

## 🚀 扩展和定制

### 添加新的外部系统
1. 在`ExternalSystemManager`中添加新的配置
2. 实现对应的集成方法
3. 定义响应数据格式
4. 添加错误处理和降级策略
5. 实现监控和统计功能

### 自定义集成逻辑
```typescript
// 自定义外部系统集成
class CustomExternalSystem extends ExternalSystemManager {
  async integrateCustomSystem(action: string, params: any): Promise<ExternalSystemResponse> {
    // 自定义集成逻辑
    const config = this.configs.get('customSystem');
    
    try {
      const response = await this.callCustomAPI(config, action, params);
      return this.processCustomResponse(response);
    } catch (error) {
      return this.handleCustomError(error);
    }
  }
}
```

## 🔐 安全和合规

### API安全
- 使用HTTPS加密传输
- API密钥安全存储
- 请求签名验证
- 访问频率限制

### 数据合规
- 个人信息保护
- 数据传输加密
- 审计日志记录
- 合规性检查

### 权限控制
```typescript
// 外部系统访问权限检查
export class ExternalSystemPermissions {
  static canAccessCourtSystem(user: JWTPayload): boolean {
    return user.roles.includes('ARBITRATOR') || user.roles.includes('ADMIN');
  }

  static canApplyNotarization(user: JWTPayload): boolean {
    return ['APPLICANT', 'AGENT', 'ARBITRATOR', 'ADMIN'].some(role => 
      user.roles.includes(role)
    );
  }

  static canAccessLegalDatabase(user: JWTPayload): boolean {
    return true; // 所有认证用户都可以访问法律数据库
  }
}
```

---

**📚 相关文档**:
- [API设计指南](./API_DESIGN_GUIDE.md)
- [后端开发指南](./BACKEND_DEVELOPMENT_GUIDE.md)
- [AI服务集成指南](./AI_SERVICES_GUIDE.md)
- [SSO认证指南](./SSO_GUIDE.md)
