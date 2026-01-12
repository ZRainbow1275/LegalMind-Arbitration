
import DOMPurify from 'dompurify';

/** HTML清理配置 */
export interface SanitizeConfig {
    /** 允许的HTML标签 */
    allowedTags?: string[];
    /** 允许的属性 */
    allowedAttributes?: Record<string, string[]>;
    /** 是否允许数据URI */
    allowDataUri?: boolean;
}

/** 预定义的清理配置 */
export const SANITIZE_CONFIGS = {
    /** 严格模式：只允许纯文本 */
    STRICT: {
        allowedTags: [],
        allowedAttributes: {},
        allowDataUri: false,
    },

    /** 基础模式：允许基本格式化 */
    BASIC: {
        allowedTags: ['p', 'br', 'strong', 'em', 'u', 'b', 'i'],
        allowedAttributes: {},
        allowDataUri: false,
    },

    /** 富文本模式：允许常用HTML标签 */
    RICH_TEXT: {
        allowedTags: [
            'p', 'br', 'strong', 'em', 'u', 'b', 'i', 's', 'del',
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'ul', 'ol', 'li',
            'blockquote', 'pre', 'code',
            'a', 'img',
        ],
        allowedAttributes: {
            'a': ['href', 'title', 'target'],
            'img': ['src', 'alt', 'title', 'width', 'height'],
        },
        allowDataUri: false,
    },

    /** 完整模式：允许大部分HTML标签（谨慎使用） */
    FULL: {
        allowedTags: [
            'p', 'br', 'strong', 'em', 'u', 'b', 'i', 's', 'del',
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'ul', 'ol', 'li',
            'blockquote', 'pre', 'code',
            'a', 'img',
            'table', 'thead', 'tbody', 'tr', 'th', 'td',
            'div', 'span',
        ],
        allowedAttributes: {
            'a': ['href', 'title', 'target', 'rel'],
            'img': ['src', 'alt', 'title', 'width', 'height'],
            'div': ['class'],
            'span': ['class'],
            'table': ['class'],
            'td': ['colspan', 'rowspan'],
            'th': ['colspan', 'rowspan'],
        },
        allowDataUri: false,
    },
};

/**
 * 清理HTML内容
 * 
 * @param html - 要清理的HTML字符串
 * @param config - 清理配置，默认使用BASIC模式
 * @returns 清理后的安全HTML字符串
 */
export function sanitizeHtml(
    html: string,
    config: SanitizeConfig = SANITIZE_CONFIGS.BASIC
): string {
    if (!html || typeof html !== 'string') {
        return '';
    }

    const purifyConfig = {
        ALLOWED_TAGS: config.allowedTags as string[],
        ALLOWED_ATTR: config.allowedAttributes
            ? Object.keys(config.allowedAttributes).reduce((acc, tag) => {
                return [...acc, ...(config.allowedAttributes![tag] || [])];
            }, [] as string[])
            : [],
        ALLOW_DATA_ATTR: config.allowDataUri || false,
        RETURN_DOM: false,
        RETURN_DOM_FRAGMENT: false,
    };

    return DOMPurify.sanitize(html, purifyConfig) as string;
}

/**
 * 清理用户输入的文本
 * 
 * @param text - 用户输入的文本
 * @returns 清理后的文本
 */
export function sanitizeInput(text: string): string {
    return sanitizeHtml(text, SANITIZE_CONFIGS.STRICT);
}

/**
 * 清理URL
 * 
 * @param url - 要清理的URL
 * @returns 清理后的URL，如果不安全则返回空字符串
 */
export function sanitizeUrl(url: string): string {
    if (!url || typeof url !== 'string') {
        return '';
    }

    // 移除空白字符
    url = url.trim();

    // 检查危险协议
    const dangerousProtocols = [
        'javascript:',
        'data:',
        'vbscript:',
        'file:',
        'about:',
    ];

    const lowerUrl = url.toLowerCase();
    for (const protocol of dangerousProtocols) {
        if (lowerUrl.startsWith(protocol)) {
            console.warn('[XSS Protection] Blocked dangerous URL:', url);
            return '';
        }
    }

    // 只允许http、https、mailto、tel协议
    const allowedProtocols = ['http://', 'https://', 'mailto:', 'tel:'];
    const hasProtocol = allowedProtocols.some(protocol =>
        lowerUrl.startsWith(protocol)
    );

    // 如果没有协议，假设是相对路径
    if (!hasProtocol && !lowerUrl.startsWith('/')) {
        // 检查是否看起来像URL
        if (lowerUrl.includes(':')) {
            console.warn('[XSS Protection] Blocked suspicious URL:', url);
            return '';
        }
    }

    return url;
}

/**
 * 验证文件名
 * 
 * @param filename - 文件名
 * @returns 是否为安全的文件名
 */
export function isValidFilename(filename: string): boolean {
    if (!filename || typeof filename !== 'string') {
        return false;
    }

    // 不允许路径遍历
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
        return false;
    }

    // 不允许特殊字符
    const invalidChars = /[<>:"|?*\x00-\x1f]/; // eslint-disable-line no-control-regex
    if (invalidChars.test(filename)) {
        return false;
    }

    // 长度限制
    if (filename.length > 255) {
        return false;
    }

    return true;
}

/**
 * 验证邮箱地址
 * 
 * @param email - 邮箱地址
 * @returns 是否为有效的邮箱地址
 */
export function isValidEmail(email: string): boolean {
    if (!email || typeof email !== 'string') {
        return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * 验证手机号
 * 
 * @param phone - 手机号
 * @returns 是否为有效的手机号
 */
export function isValidPhone(phone: string): boolean {
    if (!phone || typeof phone !== 'string') {
        return false;
    }

    const phoneRegex = /^1[3-9]\d{9}$/;
    return phoneRegex.test(phone);
}

/**
 * 转义HTML特殊字符
 * 
 * @param text - 要转义的文本
 * @returns 转义后的文本
 */
export function escapeHtml(text: string): string {
    if (!text || typeof text !== 'string') {
        return '';
    }

    const htmlEscapes: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '/': '&#x2F;',
    };

    return text.replace(/[&<>"'/]/g, char => htmlEscapes[char]);
}

/**
 * 反转义HTML特殊字符
 * 
 * @param text - 要反转义的文本
 * @returns 反转义后的文本
 */
export function unescapeHtml(text: string): string {
    if (!text || typeof text !== 'string') {
        return '';
    }

    const htmlUnescapes: Record<string, string> = {
        '&amp;': '&',
        '&lt;': '<',
        '&gt;': '>',
        '&quot;': '"',
        '&#x27;': "'",
        '&#x2F;': '/',
    };

    return text.replace(/&(?:amp|lt|gt|quot|#x27|#x2F);/g, entity => htmlUnescapes[entity]);
}
