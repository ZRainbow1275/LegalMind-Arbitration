
import React from 'react';
import {
    Plus,
    MessageSquare,
    FileText,
    Users,
    Calendar,
    Scale,
    Brain,
    Link,
    Copy,
    Trash2,
    Edit,
    Sparkles
} from 'lucide-react';
import { SmartNodeRecommender } from '../lib/smart-node-recommender';

export interface ContextMenuItem {
    id: string;
    label: string | React.ReactNode;
    icon?: React.ReactNode;
    onClick: () => void;
    disabled?: boolean;
    divider?: boolean;
    submenu?: ContextMenuItem[];
    tooltip?: string;
}

/**
 * 画布右键菜单项（智能推荐版本）
 */
export const getCanvasContextMenuItems = (
    position: { x: number; y: number },
    onCreateNode: (type: string, position: { x: number; y: number }) => void,
    onCreateChatNote: (position: { x: number; y: number }) => void,
    onPaste?: () => void,
    onCreateComment?: (position: { x: number; y: number }) => void,
    nodes?: any[]
): ContextMenuItem[] => {
    const recommendations = nodes ? SmartNodeRecommender.recommend(nodes) : [];

    const iconMap: Record<string, any> = {
        'legal-case': <Scale className="w-4 h-4" />,
        'legal-person': <Users className="w-4 h-4" />,
        'legal-document': <FileText className="w-4 h-4" />,
        'legal-timeline': <Calendar className="w-4 h-4" />,
        'legal-hearing': <Calendar className="w-4 h-4" />,
        'legal-mediation': <MessageSquare className="w-4 h-4" />,
        'legal-ai': <Brain className="w-4 h-4" />,
    };

    const nodeSubmenuItems = recommendations.map(rec => ({
        id: `create-${rec.type}`,
        label: (
            <div className="flex items-center justify-between w-full">
                <span>{rec.label}</span>
                {rec.isRecommended && (
                    <span className="ml-2 text-xs text-orange-500 font-semibold">⭐推荐</span>
                )}
            </div>
        ),
        icon: iconMap[rec.type] || <Plus className="w-4 h-4" />,
        onClick: () => onCreateNode(rec.type, position),
        tooltip: rec.isRecommended ? rec.reason : rec.description,
    }));

    const menuItems = [
        {
            id: 'create-node',
            label: '创建节点',
            icon: <Plus className="w-4 h-4" />,
            onClick: () => { },
            submenu: nodeSubmenuItems.length > 0 ? nodeSubmenuItems : [
                {
                    id: 'create-case',
                    label: '案件信息',
                    icon: <Scale className="w-4 h-4" />,
                    onClick: () => onCreateNode('legal-case', position),
                },
                {
                    id: 'create-person',
                    label: '人物关系',
                    icon: <Users className="w-4 h-4" />,
                    onClick: () => onCreateNode('legal-person', position),
                },
                {
                    id: 'create-document',
                    label: '文档管理',
                    icon: <FileText className="w-4 h-4" />,
                    onClick: () => onCreateNode('legal-document', position),
                },
                {
                    id: 'create-timeline',
                    label: '时间轴',
                    icon: <Calendar className="w-4 h-4" />,
                    onClick: () => onCreateNode('legal-timeline', position),
                },
                {
                    id: 'create-ai',
                    label: 'AI助手',
                    icon: <Brain className="w-4 h-4" />,
                    onClick: () => onCreateNode('legal-ai', position),
                },
            ],
        },
        {
            id: 'create-chat-note',
            label: '添加聊天对话贴',
            icon: <MessageSquare className="w-4 h-4" />,
            onClick: () => onCreateChatNote(position),
        },
        {
            id: 'create-comment',
            label: '创建评论',
            icon: <MessageSquare className="w-4 h-4" />,
            onClick: () => onCreateComment?.(position),
            disabled: !onCreateComment,
        },
        {
            id: 'divider-1',
            label: '',
            onClick: () => { },
            divider: true,
        },
        {
            id: 'paste',
            label: '粘贴',
            icon: <Copy className="w-4 h-4" />,
            onClick: () => onPaste?.(),
            disabled: !onPaste,
        },
    ];

    return menuItems;
};

/**
 * 节点右键菜单项
 */
export const getNodeContextMenuItems = (
    nodeId: string,
    selectedNodeIds: string[],
    onEdit: (nodeId: string) => void,
    onDuplicate: (nodeId: string) => void,
    onDelete: (nodeIds: string[]) => void,
    onConnect: (nodeId: string) => void,
    onAIAnalysis?: (nodeIds: string[]) => void
): ContextMenuItem[] => {
    const isMultiSelect = selectedNodeIds.length > 1;
    const targetNodeIds = isMultiSelect ? selectedNodeIds : [nodeId];

    return [
        {
            id: 'edit',
            label: '编辑',
            icon: <Edit className="w-4 h-4" />,
            onClick: () => onEdit(nodeId),
            disabled: isMultiSelect,
        },
        {
            id: 'duplicate',
            label: '复制',
            icon: <Copy className="w-4 h-4" />,
            onClick: () => onDuplicate(nodeId),
            disabled: isMultiSelect,
        },
        {
            id: 'connect',
            label: '连接到...',
            icon: <Link className="w-4 h-4" />,
            onClick: () => onConnect(nodeId),
            disabled: isMultiSelect,
        },
        {
            id: 'divider-1',
            label: '',
            onClick: () => { },
            divider: true,
        },
        {
            id: 'ai-analysis',
            label: isMultiSelect ? `AI分析 (${targetNodeIds.length}个节点)` : 'AI分析',
            icon: <Sparkles className="w-4 h-4" />,
            onClick: () => onAIAnalysis?.(targetNodeIds),
            disabled: !onAIAnalysis,
        },
        {
            id: 'divider-2',
            label: '',
            onClick: () => { },
            divider: true,
        },
        {
            id: 'delete',
            label: isMultiSelect ? `删除 (${targetNodeIds.length}个节点)` : '删除',
            icon: <Trash2 className="w-4 h-4" />,
            onClick: () => onDelete(targetNodeIds),
        },
    ];
};
