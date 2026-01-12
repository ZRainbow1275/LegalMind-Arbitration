/**
 * Tutorial Steps Configuration - 新手引导步骤配置
 * 
 * 定义新手引导的所有步骤，包括标题、内容、目标元素、位置等
 * 
 * @author AI Agent
 * @date 2025-11-07
 */

/**
 * 引导步骤接口
 */
export interface TutorialStep {
  /** 步骤ID */
  id: string;
  /** 步骤标题 */
  title: string;
  /** 步骤内容 */
  content: string;
  /** 目标元素选择器（可选） */
  target?: string;
  /** 提示框位置 */
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  /** 步骤完成后的操作（可选） */
  action?: () => void;
  /** 是否显示跳过按钮 */
  showSkip?: boolean;
  /** 是否显示上一步按钮 */
  showPrev?: boolean;
  /** 是否显示下一步按钮 */
  showNext?: boolean;
  /** 是否显示完成按钮 */
  showComplete?: boolean;
}

/**
 * 新手引导步骤配置
 * 
 * 共7个步骤:
 * 1. 欢迎使用
 * 2. 创建节点
 * 3. 连接节点
 * 4. 搜索功能
 * 5. 过滤功能
 * 6. 导出/导入
 * 7. 完成引导
 */
export const TUTORIAL_STEPS: TutorialStep[] = [
  // Step 1: 欢迎使用
  {
    id: 'welcome',
    title: '欢迎使用LegalMind法律工作台！',
    content:
      '这是一个专为法律专业人士设计的智能画布工具，帮助您可视化管理案件、当事人、证据等法律信息。让我们通过简短的引导，了解核心功能。',
    placement: 'center',
    showSkip: true,
    showPrev: false,
    showNext: true,
    showComplete: false,
  },

  // Step 2: 创建节点
  {
    id: 'create-node',
    title: '创建节点',
    content:
      '点击工具栏的"创建节点"按钮，可以创建案件、当事人、文档等不同类型的节点。每个节点都可以包含详细信息和附件。',
    target: '[data-tutorial="create-node-button"]',
    placement: 'bottom',
    showSkip: true,
    showPrev: true,
    showNext: true,
    showComplete: false,
  },

  // Step 3: 连接节点
  {
    id: 'connect-nodes',
    title: '连接节点',
    content:
      '使用"连接节点"工具（快捷键 Ctrl+K），可以在节点之间建立关系，构建案件关系网络。连接线可以表示不同类型的关系。',
    target: '[data-tutorial="connect-nodes-button"]',
    placement: 'bottom',
    showSkip: true,
    showPrev: true,
    showNext: true,
    showComplete: false,
  },

  // Step 4: 搜索功能
  {
    id: 'search',
    title: '搜索节点',
    content:
      '按 Ctrl+F 打开搜索面板，可以快速查找节点。支持按标题、描述、内容搜索，还可以按节点类型过滤搜索结果。',
    target: '[data-tutorial="search-panel"]',
    placement: 'left',
    showSkip: true,
    showPrev: true,
    showNext: true,
    showComplete: false,
  },

  // Step 5: 过滤功能
  {
    id: 'filter',
    title: '过滤节点',
    content:
      '按 Ctrl+Shift+F 打开过滤面板，可以按类型、状态、时间等条件过滤节点。支持多条件组合过滤，过滤条件会自动保存。',
    target: '[data-tutorial="filter-panel"]',
    placement: 'left',
    showSkip: true,
    showPrev: true,
    showNext: true,
    showComplete: false,
  },

  // Step 6: 导出/导入
  {
    id: 'export-import',
    title: '导出/导入数据',
    content:
      '按 Ctrl+Shift+E 打开导出/导入面板，可以将工作台导出为 JSON、PNG、SVG、PDF 等格式。也可以导入之前保存的工作台数据。',
    target: '[data-tutorial="export-import-panel"]',
    placement: 'left',
    showSkip: true,
    showPrev: true,
    showNext: true,
    showComplete: false,
  },

  // Step 7: 完成引导
  {
    id: 'complete',
    title: '恭喜！引导完成',
    content:
      '您已经了解了LegalMind法律工作台的核心功能。现在开始创建您的第一个案件吧！\n\n💡 小提示：\n• 按 Ctrl+Shift+H 可以随时重新查看引导\n• 点击工具栏的 ❓ 图标也可以重新查看引导\n• 按 Shift+? 查看所有快捷键帮助',
    placement: 'center',
    showSkip: false,
    showPrev: true,
    showNext: false,
    showComplete: true,
  },
];

/**
 * 获取步骤总数
 */
export const getTotalSteps = (): number => {
  return TUTORIAL_STEPS.length;
};

/**
 * 获取指定步骤
 */
export const getStep = (index: number): TutorialStep | undefined => {
  return TUTORIAL_STEPS[index];
};

/**
 * 获取步骤索引
 */
export const getStepIndex = (stepId: string): number => {
  return TUTORIAL_STEPS.findIndex((step) => step.id === stepId);
};

