
/**
 * 快捷键定义
 */
export interface KeyboardShortcut {
    /** 快捷键ID */
    id: string;
    /** 快捷键名称 */
    name: string;
    /** 快捷键描述 */
    description: string;
    /** 快捷键组合 */
    keys: string[];
    /** 快捷键分类 */
    category: string;
}

/**
 * 快捷键分类
 */
export const SHORTCUT_CATEGORIES = {
    GENERAL: '通用',
    CANVAS: '画布',
    NODE: '节点',
    SELECTION: '选择',
    EDIT: '编辑',
    VIEW: '视图',
    COLLABORATION: '协作',
} as const;

/**
 * 所有快捷键
 */
export const ALL_SHORTCUTS: KeyboardShortcut[] = [
    // 通用
    {
        id: 'help',
        name: '显示快捷键',
        description: '显示/隐藏快捷键提示面板',
        keys: ['?'],
        category: SHORTCUT_CATEGORIES.GENERAL,
    },
    {
        id: 'undo',
        name: '撤销',
        description: '撤销上一步操作',
        keys: ['Ctrl', 'Z'],
        category: SHORTCUT_CATEGORIES.GENERAL,
    },
    {
        id: 'redo',
        name: '重做',
        description: '重做上一步操作',
        keys: ['Ctrl', 'Y'],
        category: SHORTCUT_CATEGORIES.GENERAL,
    },
    {
        id: 'save',
        name: '保存',
        description: '保存当前工作区',
        keys: ['Ctrl', 'S'],
        category: SHORTCUT_CATEGORIES.GENERAL,
    },

    // 画布
    {
        id: 'zoom-in',
        name: '放大',
        description: '放大画布',
        keys: ['Ctrl', '+'],
        category: SHORTCUT_CATEGORIES.CANVAS,
    },
    {
        id: 'zoom-out',
        name: '缩小',
        description: '缩小画布',
        keys: ['Ctrl', '-'],
        category: SHORTCUT_CATEGORIES.CANVAS,
    },
    {
        id: 'zoom-reset',
        name: '重置缩放',
        description: '重置画布缩放到100%',
        keys: ['Ctrl', '0'],
        category: SHORTCUT_CATEGORIES.CANVAS,
    },
    {
        id: 'fit-view',
        name: '适应视图',
        description: '调整画布以适应所有节点',
        keys: ['Ctrl', '1'],
        category: SHORTCUT_CATEGORIES.CANVAS,
    },

    // 节点
    {
        id: 'create-case',
        name: '创建案件节点',
        description: '在画布中心创建案件信息节点',
        keys: ['Ctrl', 'Shift', 'C'],
        category: SHORTCUT_CATEGORIES.NODE,
    },
    {
        id: 'create-person',
        name: '创建人物节点',
        description: '在画布中心创建人物关系节点',
        keys: ['Ctrl', 'Shift', 'P'],
        category: SHORTCUT_CATEGORIES.NODE,
    },
    {
        id: 'create-document',
        name: '创建文档节点',
        description: '在画布中心创建文档证据节点',
        keys: ['Ctrl', 'Shift', 'D'],
        category: SHORTCUT_CATEGORIES.NODE,
    },
    {
        id: 'delete-node',
        name: '删除节点',
        description: '删除选中的节点',
        keys: ['Delete'],
        category: SHORTCUT_CATEGORIES.NODE,
    },

    // 选择
    {
        id: 'select-all',
        name: '全选',
        description: '选择所有节点',
        keys: ['Ctrl', 'A'],
        category: SHORTCUT_CATEGORIES.SELECTION,
    },
    {
        id: 'deselect-all',
        name: '取消选择',
        description: '取消选择所有节点',
        keys: ['Esc'],
        category: SHORTCUT_CATEGORIES.SELECTION,
    },

    // 编辑
    {
        id: 'copy',
        name: '复制',
        description: '复制选中的节点',
        keys: ['Ctrl', 'C'],
        category: SHORTCUT_CATEGORIES.EDIT,
    },
    {
        id: 'paste',
        name: '粘贴',
        description: '粘贴节点',
        keys: ['Ctrl', 'V'],
        category: SHORTCUT_CATEGORIES.EDIT,
    },
    {
        id: 'cut',
        name: '剪切',
        description: '剪切选中的节点',
        keys: ['Ctrl', 'X'],
        category: SHORTCUT_CATEGORIES.EDIT,
    },

    // 视图
    {
        id: 'toggle-minimap',
        name: '切换小地图',
        description: '显示/隐藏小地图',
        keys: ['Ctrl', 'M'],
        category: SHORTCUT_CATEGORIES.VIEW,
    },
    {
        id: 'toggle-grid',
        name: '切换网格',
        description: '显示/隐藏网格',
        keys: ['Ctrl', 'G'],
        category: SHORTCUT_CATEGORIES.VIEW,
    },
    {
        id: 'toggle-timeline',
        name: '切换时间轴',
        description: '切换到时间轴视图',
        keys: ['Ctrl', 'T'],
        category: SHORTCUT_CATEGORIES.VIEW,
    },
    // {{ AURA: Add - 搜索、过滤、导出/导入快捷键 }}
    {
        id: 'search',
        name: '搜索节点',
        description: '打开节点搜索面板',
        keys: ['Ctrl', 'F'],
        category: SHORTCUT_CATEGORIES.VIEW,
    },
    {
        id: 'filter',
        name: '过滤节点',
        description: '打开节点过滤面板',
        keys: ['Ctrl', 'Shift', 'F'],
        category: SHORTCUT_CATEGORIES.VIEW,
    },
    {
        id: 'export-import',
        name: '导出/导入',
        description: '打开导出/导入面板',
        keys: ['Ctrl', 'Shift', 'E'],
        category: SHORTCUT_CATEGORIES.VIEW,
    },

    // 协作
    {
        id: 'toggle-chat',
        name: '切换聊天',
        description: '显示/隐藏聊天面板',
        keys: ['Ctrl', 'Shift', 'H'],
        category: SHORTCUT_CATEGORIES.COLLABORATION,
    },
];
