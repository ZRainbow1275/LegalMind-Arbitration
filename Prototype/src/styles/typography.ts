/**
 * Typography系统
 * 
 * 统一的字体样式定义，确保整个应用的字体一致性
 * 基于LegalMind设计规范
 */

export const typography = {
  // 标题样式
  title: {
    fontSize: '16px',
    fontWeight: 600,
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    lineHeight: '1.5',
    color: '#1A202C', // gray-900
  },

  // 正文样式
  content: {
    fontSize: '14px',
    fontWeight: 400,
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    lineHeight: '1.6',
    color: '#4A5568', // gray-700
  },

  // 小字样式
  small: {
    fontSize: '12px',
    fontWeight: 400,
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    lineHeight: '1.5',
    color: '#718096', // gray-600
  },

  // 标签样式
  label: {
    fontSize: '12px',
    fontWeight: 500,
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    lineHeight: '1.5',
    color: '#2D3748', // gray-800
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },

  // 代码样式
  code: {
    fontSize: '13px',
    fontWeight: 400,
    fontFamily: '"Fira Code", "Courier New", monospace',
    lineHeight: '1.6',
    color: '#2D3748', // gray-800
  },
} as const;

/**
 * 将typography对象转换为CSS样式字符串
 */
export function typographyToStyle(style: typeof typography[keyof typeof typography]): React.CSSProperties {
  return {
    fontSize: style.fontSize,
    fontWeight: style.fontWeight,
    fontFamily: style.fontFamily,
    lineHeight: style.lineHeight,
    color: style.color,
    ...((style as any).textTransform && { textTransform: (style as any).textTransform }),
    ...((style as any).letterSpacing && { letterSpacing: (style as any).letterSpacing }),
  };
}

/**
 * Tailwind CSS类名映射
 */
export const typographyClasses = {
  title: 'text-base font-semibold text-gray-900 leading-normal',
  content: 'text-sm font-normal text-gray-700 leading-relaxed',
  small: 'text-xs font-normal text-gray-600 leading-normal',
  label: 'text-xs font-medium text-gray-800 uppercase tracking-wide',
  code: 'text-[13px] font-normal font-mono text-gray-800 leading-relaxed',
} as const;

/**
 * 节点类型特定的字体样式
 */
export const nodeTypography = {
  // 案件信息节点
  'legal-case': {
    title: typography.title,
    content: typography.content,
    metadata: typography.small,
  },

  // 人物关系节点
  'legal-person': {
    title: typography.title,
    content: typography.content,
    metadata: typography.small,
  },

  // 文档管理节点
  'legal-document': {
    title: typography.title,
    content: typography.content,
    metadata: typography.small,
  },

  // 时间轴节点
  'legal-timeline': {
    title: typography.title,
    content: typography.content,
    metadata: typography.small,
  },

  // 流程模板节点
  'legal-process': {
    title: typography.title,
    content: typography.content,
    metadata: typography.small,
  },

  // AI助手节点
  'legal-ai': {
    title: typography.title,
    content: typography.content,
    metadata: typography.small,
  },
} as const;

/**
 * 获取节点类型的字体样式
 */
export function getNodeTypography(nodeType: keyof typeof nodeTypography) {
  return nodeTypography[nodeType] || {
    title: typography.title,
    content: typography.content,
    metadata: typography.small,
  };
}

