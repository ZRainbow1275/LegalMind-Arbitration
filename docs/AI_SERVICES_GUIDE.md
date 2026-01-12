# LegalMind 仲裁平台 AI 服务集成指南

**文档版本**: Version 2.0  
**更新日期**: 2025年9月3日  
**维护者**: LegalMind开发团队  

## 📋 概述

本文档详细介绍了LegalMind仲裁平台的AI服务集成架构，包括OCR文档识别、语音转文字、NLP文本分析、智能推荐等功能的实现和使用方法。

## 🤖 AI服务架构

### 支持的AI服务
- **OCR文档识别**: 腾讯云OCR
- **语音转文字**: 讯飞语音识别
- **NLP文本分析**: OpenAI GPT
- **智能推荐**: 自研推荐算法 + OpenAI

### 技术架构
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   前端应用      │───▶│   AI服务管理器   │───▶│   外部AI服务    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌──────────────────┐
                       │   缓存和监控     │
                       └──────────────────┘
```

## 🔧 AI服务管理器

### 核心类结构
```typescript
// lib/ai-services.ts
class AIServiceManager {
  private configs: Map<string, AIServiceConfig>;
  
  // OCR文档识别
  async performOCR(imageData: Buffer, options?: OCROptions): Promise<AIServiceResponse<OCRResult>>;
  
  // 语音转文字
  async speechToText(audioData: Buffer, options?: ASROptions): Promise<AIServiceResponse<SpeechToTextResult>>;
  
  // NLP文本分析
  async analyzeText(text: string, options?: NLPOptions): Promise<AIServiceResponse<NLPAnalysisResult>>;
  
  // 智能推荐
  async getRecommendations(context: RecommendationContext): Promise<AIServiceResponse<RecommendationResult>>;
}
```

### 配置管理
```typescript
interface AIServiceConfig {
  provider: string;
  apiKey: string;
  endpoint: string;
  model?: string;
  timeout?: number;
  retries?: number;
}

// 环境变量配置
const configs = {
  tencent_ocr: {
    provider: 'tencent',
    apiKey: process.env.TENCENT_OCR_SECRET_KEY,
    endpoint: 'https://ocr.tencentcloudapi.com',
    timeout: 30000,
    retries: 3,
  },
  xfyun_asr: {
    provider: 'xfyun',
    apiKey: process.env.XFYUN_API_SECRET,
    endpoint: 'https://iat-api.xfyun.cn/v2/iat',
    timeout: 60000,
    retries: 3,
  },
  openai_nlp: {
    provider: 'openai',
    apiKey: process.env.OPENAI_API_KEY,
    endpoint: 'https://api.openai.com/v1',
    model: 'gpt-3.5-turbo',
    timeout: 30000,
    retries: 3,
  }
};
```

## 📄 OCR文档识别

### 功能特性
- 多语言文档识别（中文、英文等）
- 文档方向自动检测
- 区域识别和置信度评估
- 支持PDF、图片等多种格式

### 使用示例
```typescript
// API调用示例
const aiService = getAIServiceManager();

// 识别上传的文档
const ocrResult = await aiService.performOCR(imageBuffer, {
  language: 'zh-CN',
  detectOrientation: true
});

if (ocrResult.success) {
  const { text, confidence, regions } = ocrResult.data;
  console.log('识别文本:', text);
  console.log('置信度:', confidence);
  console.log('区域信息:', regions);
}
```

### 响应格式
```typescript
interface OCRResult {
  text: string;                    // 识别的完整文本
  confidence: number;              // 整体置信度 (0-1)
  regions: Array<{
    text: string;                  // 区域文本
    confidence: number;            // 区域置信度
    boundingBox: {                 // 边界框
      x: number;
      y: number;
      width: number;
      height: number;
    };
  }>;
  language: string;                // 检测到的语言
}
```

### 集成到案件管理
```typescript
// 在文档上传时自动OCR识别
export async function POST(request: NextRequest) {
  // ... 文档上传逻辑
  
  // 如果是图片或PDF，进行OCR识别
  if (isImageOrPDF(file.mimeType)) {
    const ocrResult = await aiService.performOCR(fileBuffer);
    
    if (ocrResult.success) {
      // 将识别结果存储到数据库
      await prisma.caseDocument.update({
        where: { id: document.id },
        data: {
          metadata: {
            ...document.metadata,
            ocr: {
              text: ocrResult.data.text,
              confidence: ocrResult.data.confidence,
              processedAt: new Date().toISOString()
            }
          }
        }
      });
    }
  }
}
```

## 🎤 语音转文字

### 功能特性
- 实时语音识别
- 分段识别和时间戳
- 多种音频格式支持
- 语音质量评估

### 使用示例
```typescript
// 庭审录音转文字
const asrResult = await aiService.speechToText(audioBuffer, {
  language: 'zh-CN',
  sampleRate: 16000,
  format: 'wav'
});

if (asrResult.success) {
  const { text, segments, confidence } = asrResult.data;
  
  // 保存转录结果
  await prisma.hearing.update({
    where: { id: hearingId },
    data: {
      metadata: {
        ...hearing.metadata,
        transcript: {
          text,
          segments,
          confidence,
          processedAt: new Date().toISOString()
        }
      }
    }
  });
}
```

### 响应格式
```typescript
interface SpeechToTextResult {
  text: string;                    // 完整转录文本
  confidence: number;              // 整体置信度
  segments: Array<{
    text: string;                  // 分段文本
    start: number;                 // 开始时间(秒)
    end: number;                   // 结束时间(秒)
    confidence: number;            // 分段置信度
  }>;
  language: string;                // 识别语言
  duration: number;                // 音频时长
}
```

## 🧠 NLP文本分析

### 功能特性
- 情感分析
- 实体识别
- 关键词提取
- 智能摘要
- 主题分类

### 使用示例
```typescript
// 案件描述分析
const nlpResult = await aiService.analyzeText(caseDescription, {
  includeSentiment: true,
  includeEntities: true,
  includeKeywords: true,
  includeSummary: true,
  includeTopics: true
});

if (nlpResult.success) {
  const analysis = nlpResult.data;
  
  // 更新案件分析结果
  await prisma.arbitrationCase.update({
    where: { id: caseId },
    data: {
      metadata: {
        ...case.metadata,
        aiAnalysis: {
          sentiment: analysis.sentiment,
          entities: analysis.entities,
          keywords: analysis.keywords,
          summary: analysis.summary,
          topics: analysis.topics,
          analyzedAt: new Date().toISOString()
        }
      }
    }
  });
}
```

### 响应格式
```typescript
interface NLPAnalysisResult {
  sentiment: {
    label: 'positive' | 'negative' | 'neutral';
    score: number;                 // 情感强度 (-1 到 1)
  };
  entities: Array<{
    text: string;                  // 实体文本
    label: string;                 // 实体类型
    confidence: number;            // 置信度
    start: number;                 // 开始位置
    end: number;                   // 结束位置
  }>;
  keywords: Array<{
    text: string;                  // 关键词
    score: number;                 // 重要性评分
  }>;
  summary?: string;                // 智能摘要
  topics?: Array<{
    topic: string;                 // 主题
    score: number;                 // 相关性评分
  }>;
}
```

## 💡 智能推荐

### 推荐类型
- **案例推荐**: 相似案件和判例
- **法条建议**: 相关法律条文
- **流程指导**: 程序建议和最佳实践
- **风险评估**: 案件风险分析

### 使用示例
```typescript
// 获取案件推荐
const recommendations = await aiService.getRecommendations({
  type: 'case_analysis',
  data: {
    caseType: 'CONTRACT_DISPUTE',
    disputeAmount: 100000,
    description: '软件开发合同纠纷',
    documentsCount: 5
  }
});

if (recommendations.success) {
  const { recommendations: recs, reasoning } = recommendations.data;
  
  // 显示推荐结果
  recs.forEach(rec => {
    console.log(`${rec.type}: ${rec.title}`);
    console.log(`描述: ${rec.description}`);
    console.log(`置信度: ${rec.confidence}`);
  });
}
```

### 响应格式
```typescript
interface RecommendationResult {
  recommendations: Array<{
    type: string;                  // 推荐类型
    title: string;                 // 推荐标题
    description: string;           // 推荐描述
    confidence: number;            // 置信度
    metadata?: any;                // 额外信息
  }>;
  reasoning: string;               // 推荐理由
}
```

## 🔄 AI服务在业务流程中的应用

### 案件创建流程
```typescript
// 1. 用户提交案件信息
// 2. NLP分析案件描述
const nlpResult = await aiService.analyzeText(description);

// 3. 智能推荐相关信息
const recommendations = await aiService.getRecommendations({
  type: 'case_analysis',
  data: caseData
});

// 4. 自动分类和标签
const caseCategory = classifyCase(nlpResult.data);
const tags = extractTags(nlpResult.data.keywords);
```

### 文档处理流程
```typescript
// 1. 文档上传
// 2. 自动OCR识别
const ocrResult = await aiService.performOCR(documentBuffer);

// 3. 文档内容分析
const contentAnalysis = await aiService.analyzeText(ocrResult.data.text);

// 4. 文档分类和索引
const documentType = classifyDocument(contentAnalysis.data);
const searchIndex = buildSearchIndex(ocrResult.data.text);
```

### 庭审辅助流程
```typescript
// 1. 庭审录音
// 2. 实时语音转文字
const transcript = await aiService.speechToText(audioStream);

// 3. 关键信息提取
const keyPoints = await aiService.analyzeText(transcript.data.text, {
  includeEntities: true,
  includeKeywords: true
});

// 4. 智能建议生成
const suggestions = await aiService.getRecommendations({
  type: 'process_guidance',
  data: { transcript: transcript.data.text }
});
```

## 📊 性能监控和优化

### 使用统计
```typescript
// AI服务使用统计
interface AIUsageStats {
  ocr: {
    requests: number;
    successRate: number;
    avgResponseTime: number;
    totalCost: number;
  };
  asr: {
    requests: number;
    successRate: number;
    avgResponseTime: number;
    totalCost: number;
  };
  nlp: {
    requests: number;
    successRate: number;
    avgResponseTime: number;
    totalCost: number;
  };
}

// 获取使用统计
const stats = await aiService.getUsageStats();
```

### 成本控制
```typescript
// 成本计算
private calculateOCRCost(textLength: number): number {
  return Math.max(0.01, textLength * 0.0001);
}

private calculateASRCost(duration: number): number {
  return Math.max(0.01, duration * 0.005);
}

private calculateNLPCost(textLength: number): number {
  return Math.max(0.005, textLength * 0.00005);
}
```

### 缓存策略
```typescript
// AI结果缓存
class AIResultCache {
  // OCR结果缓存（基于文件哈希）
  async cacheOCRResult(fileHash: string, result: OCRResult): Promise<void> {
    const key = `ocr:${fileHash}`;
    await redis.set(key, result, 86400); // 24小时
  }

  // NLP分析缓存（基于文本哈希）
  async cacheNLPResult(textHash: string, result: NLPAnalysisResult): Promise<void> {
    const key = `nlp:${textHash}`;
    await redis.set(key, result, 3600); // 1小时
  }
}
```

## 🔧 故障处理和降级

### 服务降级策略
```typescript
// 当真实AI服务不可用时的降级处理
private createMockOCRResponse(imageData: Buffer): AIServiceResponse<OCRResult> {
  return {
    success: true,
    data: {
      text: '模拟OCR识别结果：文档内容无法识别，请手动输入',
      confidence: 0.5,
      regions: [],
      language: 'zh-CN'
    },
    usage: {
      duration: 100,
      cost: 0
    }
  };
}
```

### 错误处理
```typescript
// 统一的AI服务错误处理
try {
  const result = await callExternalAIService(params);
  return result;
} catch (error) {
  // 记录错误
  logger.error('AI服务调用失败', { error, params });
  
  // 返回降级响应
  return this.createFallbackResponse(error);
}
```

## 🚀 扩展和定制

### 添加新的AI服务
1. 在`AIServiceManager`中添加新的配置
2. 实现对应的调用方法
3. 添加响应格式定义
4. 实现降级策略
5. 添加监控和统计

### 自定义AI模型
```typescript
// 自定义模型配置
const customModel = {
  provider: 'custom',
  endpoint: 'https://your-model-api.com',
  apiKey: process.env.CUSTOM_MODEL_KEY,
  model: 'legal-bert-v1.0'
};

// 集成自定义模型
class CustomAIService extends AIServiceManager {
  async customLegalAnalysis(text: string): Promise<CustomAnalysisResult> {
    // 自定义分析逻辑
  }
}
```

---

**📚 相关文档**:
- [API设计指南](./API_DESIGN_GUIDE.md)
- [后端开发指南](./BACKEND_DEVELOPMENT_GUIDE.md)
- [外部系统集成指南](./EXTERNAL_SYSTEMS_GUIDE.md)
