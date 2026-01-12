/**
 * 导出服务
 * 
 * 支持导出画布为多种格式
 */

import { CanvasState } from '../interfaces/case-canvas-mapping';

/**
 * 导出格式
 */
export type ExportFormat = 'json' | 'png' | 'svg' | 'pdf';

/**
 * 导出选项
 */
export interface ExportOptions {
  format: ExportFormat;
  filename?: string;
  includeMetadata?: boolean;
  quality?: number; // 图片质量 (0-1)
  scale?: number;   // 缩放比例
}

/**
 * 导出服务
 */
export class ExportService {
  /**
   * 导出画布
   */
  async exportCanvas(
    caseId: string,
    state: CanvasState,
    options: ExportOptions
  ): Promise<void> {
    const filename = options.filename || `canvas-${caseId}-${Date.now()}`;

    console.log(`[ExportService] 导出画布: ${filename}.${options.format}`);

    switch (options.format) {
      case 'json':
        await this.exportAsJSON(state, filename, options);
        break;
      case 'png':
        await this.exportAsPNG(filename, options);
        break;
      case 'svg':
        await this.exportAsSVG(filename);
        break;
      case 'pdf':
        await this.exportAsPDF(filename, options);
        break;
      default:
        throw new Error(`不支持的导出格式: ${options.format}`);
    }
  }

  /**
   * 导出为JSON
   */
  private async exportAsJSON(
    state: CanvasState,
    filename: string,
    options: ExportOptions
  ): Promise<void> {
    const data = options.includeMetadata
      ? state
      : {
        nodes: state.nodes,
        connections: state.connections,
        viewport: state.viewport,
      };

    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    this.downloadBlob(blob, `${filename}.json`);

    console.log('[ExportService] JSON导出完成');
  }

  /**
   * 导出为PNG
   */
  private async exportAsPNG(filename: string, options: ExportOptions): Promise<void> {
    try {
      // 动态导入html2canvas
      const html2canvas = (await import('html2canvas')).default;

      // 获取画布元素 - 尝试多个选择器
      let canvas = document.querySelector('.plait-board-container') as HTMLElement;
      if (!canvas) {
        canvas = document.querySelector('.plait-viewport-container') as HTMLElement;
      }
      if (!canvas) {
        canvas = document.querySelector('[data-plait-board]') as HTMLElement;
      }
      if (!canvas) {
        throw new Error('未找到画布元素');
      }

      console.log('[ExportService] 开始PNG导出，使用html2canvas');
      const scale = options.scale || 2;
      const quality = options.quality || 0.95;

      // 使用html2canvas渲染画布
      const renderedCanvas = await html2canvas(canvas, {
        scale: scale,
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true,
      });

      console.log('[ExportService] html2canvas渲染完成');

      // 转换为blob
      renderedCanvas.toBlob(
        (blob) => {
          if (blob) {
            this.downloadBlob(blob, `${filename}.png`);
            console.log('[ExportService] PNG导出完成');
            alert('成功导出为 PNG 格式');
          }
        },
        'image/png',
        quality
      );
    } catch (error) {
      console.error('[ExportService] PNG导出失败:', error);
      alert(`PNG导出失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 导出为SVG
   */
  private async exportAsSVG(filename: string): Promise<void> {
    try {
      // 获取SVG元素
      const svgElement = document.querySelector('.plait-viewport-container svg') as SVGElement;
      if (!svgElement) {
        throw new Error('未找到SVG元素');
      }

      // 克隆SVG
      const clonedSvg = svgElement.cloneNode(true) as SVGElement;

      // 设置SVG属性
      clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      clonedSvg.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');

      // 序列化SVG
      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(clonedSvg);

      // 创建blob
      const blob = new Blob([svgString], { type: 'image/svg+xml' });
      this.downloadBlob(blob, `${filename}.svg`);

      console.log('[ExportService] SVG导出完成');
    } catch (error) {
      console.error('[ExportService] SVG导出失败:', error);
      alert('SVG导出失败');
    }
  }

  /**
   * 导出为PDF
   */
  private async exportAsPDF(filename: string, options: ExportOptions): Promise<void> {
    try {
      // 动态导入jsPDF和html2canvas
      const { jsPDF } = await import('jspdf');
      const html2canvas = (await import('html2canvas')).default;

      // 获取画布元素 - 尝试多个选择器
      let canvas = document.querySelector('.plait-board-container') as HTMLElement;
      if (!canvas) {
        canvas = document.querySelector('.plait-viewport-container') as HTMLElement;
      }
      if (!canvas) {
        canvas = document.querySelector('[data-plait-board]') as HTMLElement;
      }
      if (!canvas) {
        throw new Error('未找到画布元素');
      }

      console.log('[ExportService] 开始PDF导出');
      const scale = options.scale || 2;

      // 使用html2canvas渲染画布
      const renderedCanvas = await html2canvas(canvas, {
        scale: scale,
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true,
      });

      console.log('[ExportService] html2canvas渲染完成，开始生成PDF');

      // 创建PDF文档
      const imgData = renderedCanvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: renderedCanvas.width > renderedCanvas.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [renderedCanvas.width, renderedCanvas.height],
      });

      // 添加图片到PDF
      pdf.addImage(imgData, 'PNG', 0, 0, renderedCanvas.width, renderedCanvas.height);

      // 保存PDF
      pdf.save(`${filename}.pdf`);
      console.log('[ExportService] PDF导出完成');
      alert('成功导出为 PDF 格式');
    } catch (error) {
      console.error('[ExportService] PDF导出失败:', error);
      alert(`PDF导出失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 下载blob
   */
  private downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * 导出为数据URL
   */
  async exportAsDataURL(
    format: 'png' | 'svg'
  ): Promise<string> {
    if (format === 'png') {
      const canvas = document.querySelector('.plait-viewport-container') as HTMLElement;
      if (!canvas) {
        throw new Error('未找到画布元素');
      }

      const tempCanvas = document.createElement('canvas');
      const rect = canvas.getBoundingClientRect();
      tempCanvas.width = rect.width * 2;
      tempCanvas.height = rect.height * 2;

      const ctx = tempCanvas.getContext('2d');
      if (!ctx) {
        throw new Error('无法创建canvas上下文');
      }

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

      return tempCanvas.toDataURL('image/png');
    } else {
      const svgElement = document.querySelector('.plait-viewport-container svg') as SVGElement;
      if (!svgElement) {
        throw new Error('未找到SVG元素');
      }

      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(svgElement);
      return `data:image/svg+xml;base64,${btoa(svgString)}`;
    }
  }

  /**
   * 清理资源
   */
  dispose(): void {
    // 清理临时资源
  }
}

/**
 * 全局导出服务实例
 */
export const exportService = new ExportService();

