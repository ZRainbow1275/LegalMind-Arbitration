/**
 * 文件上传工具函数
 * 
 * 提供文件上传、进度跟踪、URL生成等功能
 */



/**
 * 上传进度回调
 */
export type UploadProgressCallback = (progress: number) => void;

/**
 * 上传结果
 */
export interface UploadResult {
  success: boolean;
  fileUrl?: string;
  thumbnailUrl?: string;
  errorMessage?: string;
}

/**
 * 模拟文件上传到服务器
 * 
 * 在实际应用中，这里应该调用真实的API上传文件
 * 现在使用Blob URL模拟
 */
export async function uploadFile(
  file: File,
  onProgress?: UploadProgressCallback
): Promise<UploadResult> {
  try {
    // 模拟上传进度
    const totalSteps = 10;
    for (let i = 0; i <= totalSteps; i++) {
      await new Promise(resolve => setTimeout(resolve, 100));
      onProgress?.(Math.round((i / totalSteps) * 100));
    }

    // {{ AURA: Modify - 使用Blob URL管理器防止内存泄漏 }}
    // 生成Blob URL作为文件URL
    const fileUrl = blobUrlManager.create(file);

    // 如果是图片，生成缩略图
    let thumbnailUrl: string | undefined;
    if (file.type.startsWith('image/')) {
      thumbnailUrl = await generateThumbnail(file);
    }

    return {
      success: true,
      fileUrl,
      thumbnailUrl,
    };
  } catch (error) {
    return {
      success: false,
      errorMessage: error instanceof Error ? error.message : '上传失败',
    };
  }
}

/**
 * 生成图片缩略图
 */
async function generateThumbnail(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        // 创建canvas生成缩略图
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('无法创建canvas上下文'));
          return;
        }

        // 计算缩略图尺寸（最大200x200）
        const maxSize = 200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // 绘制缩略图
        ctx.drawImage(img, 0, 0, width, height);

        // {{ AURA: Modify - 使用Blob URL管理器防止内存泄漏 }}
        // 转换为Blob URL
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blobUrlManager.create(blob));
          } else {
            reject(new Error('无法生成缩略图'));
          }
        }, 'image/jpeg', 0.8);
      };

      img.onerror = () => {
        reject(new Error('无法加载图片'));
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error('无法读取文件'));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * 从拖拽事件中提取文件
 */
export function getFilesFromDragEvent(e: React.DragEvent): File[] {
  const files: File[] = [];

  if (e.dataTransfer.items) {
    // 使用DataTransferItemList接口
    for (let i = 0; i < e.dataTransfer.items.length; i++) {
      const item = e.dataTransfer.items[i];
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) {
          files.push(file);
        }
      }
    }
  } else {
    // 使用DataTransfer接口
    for (let i = 0; i < e.dataTransfer.files.length; i++) {
      files.push(e.dataTransfer.files[i]);
    }
  }

  return files;
}

/**
 * 验证文件类型
 */
export function validateFileType(file: File, allowedTypes?: string[]): boolean {
  if (!allowedTypes || allowedTypes.length === 0) {
    return true;
  }

  return allowedTypes.some(type => {
    if (type.endsWith('/*')) {
      // 通配符类型，如 'image/*'
      const prefix = type.slice(0, -2);
      return file.type.startsWith(prefix);
    }
    return file.type === type;
  });
}

/**
 * 验证文件大小
 */
export function validateFileSize(file: File, maxSizeInMB: number): boolean {
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
  return file.size <= maxSizeInBytes;
}

/**
 * 下载文件
 */
export function downloadFile(fileUrl: string, fileName: string): void {
  const link = document.createElement('a');
  link.href = fileUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * 清理Blob URL
 */
export function revokeBlobUrl(url: string): void {
  if (url.startsWith('blob:')) {
    blobUrlManager.revoke(url);
  }
}

// ==================== Blob URL管理器 ====================

/**
 * Blob URL管理器
 * 自动跟踪和清理Blob URL，防止内存泄漏
 */
class BlobUrlManager {
  private urls: Set<string> = new Set();

  /**
   * 创建并跟踪Blob URL
   */
  create(blob: Blob): string {
    const url = URL.createObjectURL(blob);
    this.urls.add(url);
    return url;
  }

  /**
   * 释放Blob URL
   */
  revoke(url: string): void {
    if (this.urls.has(url)) {
      URL.revokeObjectURL(url);
      this.urls.delete(url);
    }
  }

  /**
   * 释放所有Blob URL
   */
  revokeAll(): void {
    this.urls.forEach(url => {
      URL.revokeObjectURL(url);
    });
    this.urls.clear();
  }

  /**
   * 获取跟踪的URL数量
   */
  get size(): number {
    return this.urls.size;
  }
}

// 全局Blob URL管理器
export const blobUrlManager = new BlobUrlManager();

