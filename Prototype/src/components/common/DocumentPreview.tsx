/**
 * 文档预览组件
 * 
 * 提供文档的预览功能，支持PDF、图片、文本等文件类型
 */

import React, { useState } from 'react';
import { X, Download, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import { Card, CardContent, CardHeader } from '../ui/card';
import { ScrollArea } from '../ui/scroll-area';
import { Button } from '../ui/button';
import type { DocumentNodeData } from '../../types/document-node';
import { formatFileSize } from '../../types/document-node';
import { downloadFile } from '../../lib/file-upload';

interface DocumentPreviewProps {
  data: DocumentNodeData;
  onClose: () => void;
}

export const DocumentPreview: React.FC<DocumentPreviewProps> = ({ data, onClose }) => {
  const { file, fileUrl } = data;
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);

  // 处理下载
  const handleDownload = () => {
    if (fileUrl) {
      downloadFile(fileUrl, file.name);
    }
  };

  // 渲染预览内容
  const renderPreviewContent = () => {
    if (!fileUrl) {
      return (
        <div className="flex items-center justify-center h-full text-gray-500">
          文件URL不可用
        </div>
      );
    }

    switch (file.type) {
      case 'image':
        return (
          <div className="flex items-center justify-center h-full p-4">
            <img
              src={fileUrl}
              alt={file.name}
              className="max-w-full max-h-full object-contain transition-transform"
              style={{
                transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
              }}
            />
          </div>
        );

      case 'pdf':
        return (
          <iframe
            src={fileUrl}
            className="w-full h-full border-0"
            title={file.name}
          />
        );

      case 'text':
        return (
          <ScrollArea className="h-full">
            <iframe
              src={fileUrl}
              className="w-full h-full border-0"
              title={file.name}
            />
          </ScrollArea>
        );

      default:
        return (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 space-y-4">
            <div className="text-lg">此文件类型不支持预览</div>
            <Button onClick={handleDownload} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              下载文件
            </Button>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <Card className="w-[90vw] h-[90vh] max-w-6xl shadow-2xl flex flex-col">
        {/* 头部 */}
        <CardHeader className="flex-shrink-0 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold text-gray-900 truncate">
                {file.name}
              </h2>
              <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                <span>{formatFileSize(file.size)}</span>
                <span>•</span>
                <span className="uppercase">{file.type}</span>
              </div>
            </div>

            {/* 工具栏 */}
            <div className="flex items-center gap-2 ml-4">
              {/* 图片预览工具 */}
              {file.type === 'image' && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setZoom(Math.max(25, zoom - 25))}
                    disabled={zoom <= 25}
                  >
                    <ZoomOut className="w-4 h-4" />
                  </Button>
                  <span className="text-sm text-gray-600 min-w-[60px] text-center">
                    {zoom}%
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setZoom(Math.min(400, zoom + 25))}
                    disabled={zoom >= 400}
                  >
                    <ZoomIn className="w-4 h-4" />
                  </Button>
                  <div className="w-px h-6 bg-gray-300 mx-2" />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setRotation((rotation + 90) % 360)}
                  >
                    <RotateCw className="w-4 h-4" />
                  </Button>
                  <div className="w-px h-6 bg-gray-300 mx-2" />
                </>
              )}

              {/* 下载按钮 */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDownload}
              >
                <Download className="w-4 h-4" />
              </Button>

              {/* 关闭按钮 */}
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* 预览内容 */}
        <CardContent className="flex-1 p-0 overflow-hidden">
          {renderPreviewContent()}
        </CardContent>

        {/* 底部信息（可选） */}
        {data.description && (
          <div className="flex-shrink-0 border-t border-gray-200 p-4 bg-gray-50">
            <div className="text-sm text-gray-600">
              <span className="font-medium">描述：</span>
              {data.description}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

