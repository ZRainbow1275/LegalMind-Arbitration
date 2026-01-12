
export interface TutorialStep {
    id: string;
    title: string;
    content: string;
    target?: string; // CSS选择器
    position?: 'top' | 'right' | 'bottom' | 'left' | 'center';
    action?: {
        label: string;
        onClick: () => void;
    };
}

export interface TutorialConfig {
    id: string;
    name: string;
    steps: TutorialStep[];
    autoStart?: boolean;
    showProgress?: boolean;
}

export const TUTORIALS: Record<string, TutorialConfig> = {
    'canvas-basics': {
        id: 'canvas-basics',
        name: '画布基础操作',
        showProgress: true,
        steps: [
            {
                id: 'welcome',
                title: '欢迎使用法律工作台！',
                content: '这是一个强大的可视化工具，帮助您更好地理解和分析法律案件。让我们开始快速入门教程。',
                position: 'center',
            },
            {
                id: 'toolbar',
                title: '元素工具栏',
                content: '点击左侧工具栏可以创建各种元素，包括文本、图片、形状和法律节点。',
                target: '[data-tutorial="element-toolbar"]',
                position: 'right',
            },
            {
                id: 'canvas',
                title: '画布操作',
                content: '使用鼠标中键或按住空格键拖拽可以平移画布，滚轮可以缩放画布。',
                position: 'center',
            },
            {
                id: 'shortcuts',
                title: '快捷键',
                content: '按Ctrl+K打开命令面板，可以快速访问所有功能。Ctrl+Z撤销，Ctrl+Y重做。',
                position: 'center',
            },
            {
                id: 'complete',
                title: '开始使用！',
                content: '您已经掌握了基础操作。现在可以开始创建您的第一个可视化项目了！',
                position: 'center',
            },
        ],
    },

    'hearing-mode': {
        id: 'hearing-mode',
        name: '庭审模式教程',
        showProgress: true,
        steps: [
            {
                id: 'intro',
                title: '庭审可视化',
                content: '庭审模式帮助您可视化庭审过程，包括参与人、证据、时间线和裁决。',
                position: 'center',
            },
            {
                id: 'participants',
                title: '添加参与人',
                content: '使用"当事人"节点添加原告、被告、仲裁员等参与人。',
                position: 'center',
            },
            {
                id: 'evidence',
                title: '添加证据',
                content: '使用"证据"节点记录提交的证据材料，并连接到相关参与人。',
                position: 'center',
            },
            {
                id: 'timeline',
                title: '时间线',
                content: '使用"时间线"节点记录庭审过程中的关键事件。',
                position: 'center',
            },
        ],
    },
};
