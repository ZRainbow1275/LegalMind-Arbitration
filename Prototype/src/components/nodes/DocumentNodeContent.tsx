/**
 * 文档节点内容组件
 * 
 * 显示文档节点的文件信息、缩略图、上传进度等
 */

import React from 'react';
import {
  FileText,
  Image,
  FileCode,
  Table,
  Presentation,
  File,
  Download,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import type { DocumentNodeData, SupportedFileType } from '../../types/document-node';
import { formatFileSize, getFileTypeColor } from '../../types/document-node';

interface DocumentNodeContentProps {
  data: DocumentNodeData;
  onPreview?: () => void;
  onDownload?: () => void;
}

/**
 * 获取文件类型图标组件
 */
function getFileTypeIconComponent(fileType: SupportedFileType) {
  switch (fileType) {
    case 'pdf':
    case 'word':
      return FileText;
    case 'image':
      return Image;
    case 'text':
      return FileCode;
    case 'excel':
      return Table;
    case 'powerpoint':
      return Presentation;
    default:
      return File;
  }
}

export const DocumentNodeContent: React.FC<DocumentNodeContentProps> = ({
  data,
  onPreview,
  onDownload,
}) => {
  const { file, fileUrl, thumbnailUrl, uploadStatus, uploadProgress, errorMessage } = data;
  const IconComponent = getFileTypeIconComponent(file.type);
  const fileColor = getFileTypeColor(file.type);

  // 渲染上传中状态
  if (uploadStatus === 'uploading') {
    return (
      <div className="flex flex-col items-center justify-center p-4 space-y-3">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
        <div className="text-sm text-gray-600">上传中...</div>
        {uploadProgress !== undefined && (
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-orange-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        )}
        <div className="text-xs text-gray-500">{uploadProgress}%</div>
      </div>
    );
  }

  // 渲染错误状态
  if (uploadStatus === 'error') {
    return (
      <div className="flex flex-col items-center justify-center p-4 space-y-3">
        <AlertCircle className="w-8 h-8 text-red-500" />
        <div className="text-sm text-red-600">上传失败</div>
        {errorMessage && (
          <div className="text-xs text-gray-500 text-center">{errorMessage}</div>
        )}
      </div>
    );
  }

  // 渲染已上传状态
  return (
    <div className="flex flex-col h-full">
      {/* 缩略图或图标区域 */}
      <div
        className="flex-1 flex items-center justify-center p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={onPreview}
        style={{ backgroundColor: `${fileColor}10` }}
      >
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={file.name}
            className="max-w-full max-h-32 object-contain rounded"
          />
        ) : (
          <IconComponent
            className="w-16 h-16"
            style={{ color: fileColor }}
          />
        )}
      </div>

      {/* 文件信息区域 */}
      <div className="p-3 border-t border-gray-200 bg-white">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {/* 文件名 */}
            <div
              className="text-sm font-medium text-gray-900 truncate cursor-pointer hover:text-orange-600 transition-colors"
              onClick={onPreview}
              title={file.name}
            >
              {file.name}
            </div>

            {/* 文件大小和类型 */}
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-gray-500">
                {formatFileSize(file.size)}
              </span>
              <span className="text-xs text-gray-400">•</span>
              <span
                className="text-xs font-medium"
                style={{ color: fileColor }}
              >
                {file.type.toUpperCase()}
              </span>
            </div>

            {/* 文档描述（如果有） */}
            {data.description && (
              <div className="text-xs text-gray-600 mt-2 line-clamp-2">
                {data.description}
              </div>
            )}

            {/* 文档标签（如果有） */}
            {data.tags && data.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {data.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 下载按钮 */}
          {fileUrl && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDownload?.();
              }}
              className="flex-shrink-0 p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded transition-colors"
              title="下载文件"
            >
              <Download className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

