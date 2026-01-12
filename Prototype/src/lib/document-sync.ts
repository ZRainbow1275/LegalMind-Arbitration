/**
 * 文档同步服务
 * 
 * 负责案件文档与画布文档节点的同步
 */

import { DocumentMetadata } from '../interfaces/legal-elements';


/**
 * 案件文档数据（从后端API获取）
 */
export interface CaseDocument {
  id: string;
  caseId: string;
  uploadedBy: string;

  // 文件信息
  fileName: string;
  originalName: string;
  filePath: string;
  fileSize: bigint | number;
  fileType: string;
  mimeType?: string;
  fileHash?: string;

  // 文档分类
  documentType: string;
  category?: string;
  description?: string;

  // 访问控制
  isPublic: boolean;
  accessLevel: string;

  // 版本控制
  version: number;
  parentDocumentId?: string;

  // 元数据
  metadata?: any;
  createdAt: string;
  updatedAt: string;
}

/**
 * 文档节点数据（画布上的节点）
 */
export interface DocumentNodeData {
  id: string;
  type: 'legal-document';
  position: { x: number; y: number };
  data: {
    title: string;
    description: string;
    status: 'pending' | 'active' | 'completed' | 'cancelled';
    metadata: DocumentMetadata;
    connections: string[];
  };
}

/**
 * 文档同步类
 */
export class DocumentSync {
  private eventListeners: ((event: DocumentSyncEvent) => void)[] = [];
  private documentCache = new Map<string, CaseDocument[]>();

  /**
   * 从案件加载所有文档
   */
  async loadDocumentsFromCase(caseId: string): Promise<DocumentNodeData[]> {
    try {
      console.log(`[DocumentSync] 加载案件文档: ${caseId}`);

      // 从API获取文档列表
      const response = await fetch(`/api/cases/${caseId}/documents`);
      if (!response.ok) {
        throw new Error(`加载文档失败: ${response.statusText}`);
      }

      const data = await response.json();
      const documents: CaseDocument[] = data.documents || [];

      // 缓存文档数据
      this.documentCache.set(caseId, documents);

      // 转换为文档节点
      const documentNodes = documents.map((doc, index) =>
        this.convertToDocumentNode(doc, index)
      );

      this.emitEvent({
        type: 'load',
        caseId,
        timestamp: new Date(),
        data: documentNodes,
      });

      console.log(`[DocumentSync] 已加载 ${documentNodes.length} 个文档节点`);
      return documentNodes;
    } catch (error) {
      console.error('[DocumentSync] 加载文档失败:', error);
      this.emitEvent({
        type: 'error',
        caseId,
        timestamp: new Date(),
        error: error instanceof Error ? error.message : '未知错误',
      });
      throw error;
    }
  }

  /**
   * 监听文档变化
   */
  subscribeToDocumentChanges(
    caseId: string,
    callback: (docs: DocumentNodeData[]) => void
  ): () => void {
    // 创建轮询定时器（生产环境应使用WebSocket）
    const intervalId = setInterval(async () => {
      try {
        const docs = await this.loadDocumentsFromCase(caseId);
        callback(docs);
      } catch (error) {
        console.error('[DocumentSync] 轮询失败:', error);
      }
    }, 30000); // 每30秒轮询一次

    // 返回取消订阅函数
    return () => {
      clearInterval(intervalId);
    };
  }

  /**
   * 创建文档节点
   */
  async createDocumentNode(
    caseId: string,
    document: CaseDocument
  ): Promise<DocumentNodeData> {
    try {
      console.log(`[DocumentSync] 创建文档节点: ${document.fileName}`);

      // 转换为文档节点
      const documentNode = this.convertToDocumentNode(document, 0);

      this.emitEvent({
        type: 'create',
        caseId,
        timestamp: new Date(),
        data: documentNode,
      });

      return documentNode;
    } catch (error) {
      console.error('[DocumentSync] 创建文档节点失败:', error);
      throw error;
    }
  }

  /**
   * 删除文档节点
   */
  async deleteDocumentNode(caseId: string, documentId: string): Promise<void> {
    try {
      console.log(`[DocumentSync] 删除文档节点: ${documentId}`);

      // 从缓存中删除
      const documents = this.documentCache.get(caseId);
      if (documents) {
        const filtered = documents.filter(doc => doc.id !== documentId);
        this.documentCache.set(caseId, filtered);
      }

      this.emitEvent({
        type: 'delete',
        caseId,
        timestamp: new Date(),
        data: { documentId },
      });
    } catch (error) {
      console.error('[DocumentSync] 删除文档节点失败:', error);
      throw error;
    }
  }

  /**
   * 转换案件文档为文档节点
   */
  private convertToDocumentNode(
    document: CaseDocument,
    index: number
  ): DocumentNodeData {
    const metadata: DocumentMetadata = {
      documentId: document.id,
      fileName: document.fileName,
      originalName: document.originalName,
      fileSize: typeof document.fileSize === 'bigint'
        ? Number(document.fileSize)
        : document.fileSize,
      fileType: document.fileType,
      mimeType: document.mimeType,
      documentType: document.documentType,
      category: document.category,
      tags: [],
      uploadedBy: document.uploadedBy,
      uploadDate: document.createdAt,
      isPublic: document.isPublic,
      accessLevel: document.accessLevel,
      previewUrl: `/api/documents/${document.id}/preview`,
      downloadUrl: `/api/documents/${document.id}/download`,
      version: document.version,
      parentDocumentId: document.parentDocumentId,
      description: document.description,
    };

    return {
      id: `doc-${document.id}`,
      type: 'legal-document',
      position: {
        x: 100 + (index % 3) * 300,  // 3列布局
        y: 600 + Math.floor(index / 3) * 200,  // 每行200px间距
      },
      data: {
        title: document.fileName,
        description: document.description || '无描述',
        status: 'active',
        metadata,
        connections: [],
      },
    };
  }

  /**
   * 监听同步事件
   */
  addEventListener(listener: (event: DocumentSyncEvent) => void): void {
    this.eventListeners.push(listener);
  }

  /**
   * 移除事件监听器
   */
  removeEventListener(listener: (event: DocumentSyncEvent) => void): void {
    const index = this.eventListeners.indexOf(listener);
    if (index > -1) {
      this.eventListeners.splice(index, 1);
    }
  }

  /**
   * 触发事件
   */
  private emitEvent(event: DocumentSyncEvent): void {
    this.eventListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('[DocumentSync] 事件监听器错误:', error);
      }
    });
  }

  /**
   * 清理资源
   */
  dispose(): void {
    this.eventListeners = [];
    this.documentCache.clear();
  }
}

/**
 * 文档同步事件
 */
export interface DocumentSyncEvent {
  type: 'load' | 'create' | 'delete' | 'error';
  caseId: string;
  timestamp: Date;
  data?: any;
  error?: string;
}

/**
 * 全局文档同步实例
 */
export const documentSync = new DocumentSync();

