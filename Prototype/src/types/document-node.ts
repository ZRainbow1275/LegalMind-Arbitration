/**
 * 文档节点数据模型
 * 
 * 用于表示画布上的文档节点，支持PDF、Word、图片等文件类型
 */

/**
 * 文件上传状态
 */
export type FileUploadStatus = 'idle' | 'uploading' | 'uploaded' | 'error';

/**
 * 支持的文件类型
 */
export type SupportedFileType = 
  | 'pdf'           // PDF文档
  | 'word'          // Word文档 (.doc, .docx)
  | 'image'         // 图片 (.jpg, .png, .gif, .webp)
  | 'text'          // 文本文件 (.txt, .md)
  | 'excel'         // Excel文件 (.xls, .xlsx)
  | 'powerpoint'    // PowerPoint文件 (.ppt, .pptx)
  | 'other';        // 其他文件类型

/**
 * 文件元数据
 */
export interface FileMetadata {
  /** 文件名 */
  name: string;
  
  /** 文件大小（字节） */
  size: number;
  
  /** MIME类型 */
  mimeType: string;
  
  /** 文件类型（简化分类） */
  type: SupportedFileType;
  
  /** 最后修改时间 */
  lastModified?: number;
}

/**
 * 文档节点数据
 * 
 * 这个接口定义了文档节点的data字段内容
 */
export interface DocumentNodeData {
  /** 文件元数据 */
  file: FileMetadata;
  
  /** 文件URL（用于预览和下载） */
  fileUrl?: string;
  
  /** 缩略图URL（可选） */
  thumbnailUrl?: string;
  
  /** 上传状态 */
  uploadStatus: FileUploadStatus;
  
  /** 上传进度（0-100） */
  uploadProgress?: number;
  
  /** 错误信息（如果上传失败） */
  errorMessage?: string;
  
  /** 文档描述（可选） */
  description?: string;
  
  /** 文档标签（可选） */
  tags?: string[];
}

/**
 * 根据MIME类型判断文件类型
 */
export function getFileTypeFromMimeType(mimeType: string): SupportedFileType {
  if (mimeType.startsWith('image/')) {
    return 'image';
  }
  
  if (mimeType === 'application/pdf') {
    return 'pdf';
  }
  
  if (
    mimeType === 'application/msword' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return 'word';
  }
  
  if (
    mimeType === 'application/vnd.ms-excel' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ) {
    return 'excel';
  }
  
  if (
    mimeType === 'application/vnd.ms-powerpoint' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ) {
    return 'powerpoint';
  }
  
  if (mimeType.startsWith('text/')) {
    return 'text';
  }
  
  return 'other';
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

/**
 * 获取文件类型的图标名称（Lucide图标）
 */
export function getFileTypeIcon(fileType: SupportedFileType): string {
  switch (fileType) {
    case 'pdf':
      return 'FileText';
    case 'word':
      return 'FileText';
    case 'image':
      return 'Image';
    case 'text':
      return 'FileCode';
    case 'excel':
      return 'Table';
    case 'powerpoint':
      return 'Presentation';
    default:
      return 'File';
  }
}

/**
 * 获取文件类型的颜色
 */
export function getFileTypeColor(fileType: SupportedFileType): string {
  switch (fileType) {
    case 'pdf':
      return '#FF6B6B'; // 红色
    case 'word':
      return '#4A90E2'; // 蓝色
    case 'image':
      return '#50C878'; // 绿色
    case 'text':
      return '#9B59B6'; // 紫色
    case 'excel':
      return '#2ECC71'; // 绿色
    case 'powerpoint':
      return '#E67E22'; // 橙色
    default:
      return '#95A5A6'; // 灰色
  }
}

/**
 * 创建文档节点数据
 */
export function createDocumentNodeData(file: File): DocumentNodeData {
  const fileType = getFileTypeFromMimeType(file.type);
  
  return {
    file: {
      name: file.name,
      size: file.size,
      mimeType: file.type,
      type: fileType,
      lastModified: file.lastModified,
    },
    uploadStatus: 'idle',
    uploadProgress: 0,
  };
}

