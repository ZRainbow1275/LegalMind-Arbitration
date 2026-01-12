
/**
 * XSS防护工具
 * 
 * 提供HTML清理、输入验证等安全功能
 */

import { SanitizeConfig } from './xss-protection-utils';
import React from 'react';
import { useSafeHtml } from './hooks/useSafeHtml';




/**
 * React组件: 安全HTML渲染器
 * 
 * @example
 * ```tsx
 * <SafeHtml html={userInput} config={SANITIZE_CONFIGS.RICH_TEXT} />
 * ```
 */
export interface SafeHtmlProps {
  html: string;
  config?: SanitizeConfig;
  className?: string;
  style?: React.CSSProperties;
}

export function SafeHtml({ html, config, className, style }: SafeHtmlProps) {
  const { dangerouslySetInnerHTML } = useSafeHtml(html, config);

  return (
    <div
      className={className}
      style={style}
      dangerouslySetInnerHTML={dangerouslySetInnerHTML}
    />
  );
}
