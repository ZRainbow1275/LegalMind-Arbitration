/**
 * 法律工作台嵌入组件
 * 
 * 这是工作台的主要嵌入接口，可以轻松集成到任何业务模块中
 */

import { useState, useEffect, useCallback } from 'react';
import type { LegalWorkspaceEmbedProps, BusinessData } from '../types/embedding-interface';
import { UniversalCanvas } from './canvas/UniversalCanvas';
import { ElementToolbar } from './canvas/ElementToolbar';
import { useCanvasStore } from '../lib/canvas-store';
import { TemplateLibrary } from '../lib/template-library';
import { performanceMonitor } from '../lib/performance-monitor';

/**
 * 法律工作台嵌入组件
 * 
 * @example
 * // 庭审模式
 * <LegalWorkspaceEmbed
 *   mode="hearing"
 *   data={hearingData}
 *   adapter={new HearingDataAdapter()}
 *   onSave={handleSave}
 * />
 * 
 * @example
 * // 调解模式
 * <LegalWorkspaceEmbed
 *   mode="mediation"
 *   data={mediationData}
 *   adapter={new MediationDataAdapter()}
 *   onSave={handleSave}
 * />
 */
export function LegalWorkspaceEmbed<T extends BusinessData = BusinessData>({
  mode,
  data,
  adapter,
  config,
  onSave,
  onExport,

  onChange,
  onError,
  width = '100%',
  height = '100vh',
  className,
  style,
  readOnly = false,
  showToolbar = true,
  showSidebar = true,
  initialViewport,
}: LegalWorkspaceEmbedProps<T>) {
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    canvas,
    initCanvas,

    saveCanvas,
    updateViewport,
  } = useCanvasStore();

  // ==================== 初始化 ====================

  useEffect(() => {
    const perfId = performanceMonitor.start('工作台初始化', 'operation', { mode });

    try {
      if (data && adapter) {
        // 使用适配器将业务数据转换为画布数据
        const canvasData = adapter.toCanvas(data);

        // 直接设置画布数据（不需要loadCanvas，因为是新数据）
        useCanvasStore.setState({ canvas: canvasData });
      } else if (config?.defaultTemplate) {
        // 使用模板初始化
        const template = TemplateLibrary.getTemplate(config.defaultTemplate);
        if (template) {
          useCanvasStore.setState({ canvas: template.canvasData });
        } else {
          initCanvas(`${mode} 工作台`);
        }
      } else {
        // 空白画布
        initCanvas(`${mode} 工作台`);
      }

      // 设置初始视口
      if (initialViewport) {
        updateViewport(initialViewport);
      }

      setInitialized(true);
      performanceMonitor.end(perfId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '初始化失败';
      setError(errorMessage);
      onError?.(err instanceof Error ? err : new Error(errorMessage));
      performanceMonitor.end(perfId);
    }
  }, [mode, data, adapter, config, initialViewport, initCanvas, updateViewport, onError]);

  // ==================== 数据变更监听 ====================

  useEffect(() => {
    if (!initialized || !canvas || !adapter || !onChange) return;

    // 将画布数据转换回业务数据
    try {
      const businessData = adapter.fromCanvas(canvas);
      onChange(businessData);
    } catch (err) {
      console.error('[LegalWorkspaceEmbed] 数据转换失败:', err);
    }
  }, [canvas, adapter, onChange, initialized]);

  // ==================== 保存处理 ====================

  const handleSave = useCallback(async () => {
    if (!canvas || !adapter || !onSave) return;

    const perfId = performanceMonitor.start('保存数据', 'operation');

    try {
      // 保存画布
      await saveCanvas();

      // 转换为业务数据
      const businessData = adapter.fromCanvas(canvas);

      // 验证数据
      const validation = adapter.validate(businessData);
      if (!validation.valid) {
        throw new Error(`数据验证失败: ${validation.errors.map(e => e.message).join(', ')} `);
      }

      // 调用保存回调
      await onSave(businessData);

      performanceMonitor.end(perfId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '保存失败';
      setError(errorMessage);
      onError?.(err instanceof Error ? err : new Error(errorMessage));
      performanceMonitor.end(perfId);
    }
  }, [canvas, adapter, onSave, onError, saveCanvas]);

  // ==================== 导出处理 ====================

  const handleExport = useCallback(async (format: 'json' | 'png' | 'svg' | 'pdf') => {
    if (!onExport) return;

    const perfId = performanceMonitor.start('导出数据', 'operation', { format });

    try {
      await onExport(format);
      performanceMonitor.end(perfId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '导出失败';
      setError(errorMessage);
      onError?.(err instanceof Error ? err : new Error(errorMessage));
      performanceMonitor.end(perfId);
    }
  }, [onExport, onError]);

  // ==================== 渲染 ====================

  if (error) {
    return (
      <div
        style={{
          width,
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#fee2e2',
          color: '#991b1b',
          padding: 24,
          borderRadius: 8,
        }}
      >
        <div>
          <div style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 8 }}>
            ❌ 加载失败
          </div>
          <div style={{ fontSize: 14 }}>{error}</div>
        </div>
      </div>
    );
  }

  if (!initialized) {
    return (
      <div
        style={{
          width,
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f9fafb',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: 48,
              height: 48,
              border: '4px solid #f97316',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 16px',
            }}
          />
          <div style={{ fontSize: 16, color: '#6b7280' }}>
            正在加载工作台...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={className}
      style={{
        width,
        height,
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: '#f9fafb',
        ...style,
      }}
    >
      {/* 顶部工具栏 */}
      {showToolbar && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 60,
            backgroundColor: '#ffffff',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 24px',
            zIndex: 100,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ fontSize: 18, fontWeight: 'bold', color: '#f97316' }}>
              {config?.title || `${mode} 工作台`}
            </div>
            {config?.description && (
              <div style={{ fontSize: 14, color: '#6b7280' }}>
                {config.description}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            {!readOnly && onSave && (
              <button
                onClick={handleSave}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#f97316',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 500,
                }}
              >
                💾 保存
              </button>
            )}

            {onExport && (
              <button
                onClick={() => handleExport('json')}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#ffffff',
                  color: '#6b7280',
                  border: '1px solid #e5e7eb',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: 14,
                }}
              >
                📤 导出
              </button>
            )}
          </div>
        </div>
      )}

      {/* 侧边工具栏 */}
      {showSidebar && !readOnly && (
        <ElementToolbar />
      )}

      {/* 画布 */}
      <div
        style={{
          position: 'absolute',
          top: showToolbar ? 60 : 0,
          left: 0,
          right: 0,
          bottom: 0,
        }}
      >
        <UniversalCanvas
          width={typeof width === 'number' ? width : undefined}
          height={typeof height === 'number' ? (showToolbar ? height - 60 : height) : undefined}
        />
      </div>

      {/* 模式标识 */}
      <div
        style={{
          position: 'absolute',
          bottom: 16,
          right: 16,
          padding: '8px 12px',
          backgroundColor: 'rgba(249, 115, 22, 0.9)',
          color: '#ffffff',
          borderRadius: 8,
          fontSize: 12,
          fontWeight: 500,
          zIndex: 100,
        }}
      >
        {config?.icon || '🎨'} {mode.toUpperCase()}模式
      </div>
    </div>
  );
}

// 添加旋转动画
const style = document.createElement('style');
style.textContent = `
@keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
}
`;
document.head.appendChild(style);
