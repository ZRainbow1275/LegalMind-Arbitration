import { SanitizeConfig, SANITIZE_CONFIGS, sanitizeHtml } from '../xss-protection-utils';

/**
 * React Hook: 安全渲染HTML
 * 
 * @param html - 要渲染的HTML
 * @param config - 清理配置
 * @returns 清理后的HTML和dangerouslySetInnerHTML属性
 * 
 * @example
 * ```tsx
 * function MyComponent({ html }) {
 *   const { sanitized, dangerouslySetInnerHTML } = useSafeHtml(html);
 *   
 *   return <div dangerouslySetInnerHTML={dangerouslySetInnerHTML} />;
 * }
 * ```
 */
export function useSafeHtml(
    html: string,
    config: SanitizeConfig = SANITIZE_CONFIGS.BASIC
) {
    const sanitized = sanitizeHtml(html, config);

    return {
        sanitized,
        dangerouslySetInnerHTML: { __html: sanitized },
    };
}
