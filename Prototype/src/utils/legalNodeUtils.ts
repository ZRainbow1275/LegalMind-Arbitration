
// 简化的 Point 类型定义
export type Point = [number, number]

// 简化的 PlaitElement 接口
export interface PlaitElement {
    id: string
    type: string
    points?: Point[]
    [key: string]: any
}

// 法律节点类型定义
export interface LegalNode extends PlaitElement {
    type: 'legal-node'
    nodeType: 'document' | 'ai-chat' | 'hearing' | 'timeline' | 'collaboration'
    title: string
    description?: string
    status: 'pending' | 'in-progress' | 'completed' | 'cancelled'
    data?: Record<string, any>
}

// 创建法律节点的辅助函数
export const createLegalNode = (
    nodeType: LegalNode['nodeType'],
    title: string,
    point: Point,
    options?: Partial<LegalNode>
): LegalNode => {
    return {
        id: `legal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'legal-node',
        nodeType,
        title,
        status: 'pending',
        points: [point, [point[0] + 200, point[1] + 80]], // 默认大小
        ...options
    }
}
