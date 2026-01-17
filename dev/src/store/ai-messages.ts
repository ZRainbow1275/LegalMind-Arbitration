// dev/src/store/ai-messages.ts
// AI助手消息的共享状态管理

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// 用于生成唯一ID的计数器，避免hydration mismatch
let messageIdCounter = 0;
let conversationIdCounter = 0;

const generateMessageId = () => `msg-${++messageIdCounter}`;
const generateConversationId = () => `conv-${++conversationIdCounter}`;

export interface AIMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  suggestions?: string[];
  feature?: string; // 关联的功能类型
  context?: {
    page?: string;
    role?: string;
    caseId?: string;
  };
}

export interface AIConversation {
  id: string;
  title: string;
  messages: AIMessage[];
  createdAt: Date;
  updatedAt: Date;
  feature?: string;
}

interface AIMessagesState {
  // 当前对话
  currentConversation: AIConversation | null;
  
  // 历史对话列表
  conversations: AIConversation[];
  
  // 当前输入状态
  isTyping: boolean;
  inputValue: string;
  
  // 选择的功能
  selectedFeature: string;
  
  // 操作方法
  setCurrentConversation: (conversation: AIConversation | null) => void;
  createNewConversation: (feature?: string) => string;
  addMessage: (message: Omit<AIMessage, 'id' | 'timestamp'>) => void;
  updateMessage: (messageId: string, updates: Partial<AIMessage>) => void;
  deleteMessage: (messageId: string) => void;
  clearCurrentConversation: () => void;
  deleteConversation: (conversationId: string) => void;
  
  // 输入状态管理
  setIsTyping: (typing: boolean) => void;
  setInputValue: (value: string) => void;
  setSelectedFeature: (feature: string) => void;
  
  // 同步方法
  syncWithFloatingAssistant: () => void;
  syncWithMainPage: () => void;
}

export const useAIMessagesStore = create<AIMessagesState>()(
  persist(
    (set, get) => ({
      currentConversation: null,
      conversations: [],
      isTyping: false,
      inputValue: '',
      selectedFeature: '',

      setCurrentConversation: (conversation) => {
        set({ currentConversation: conversation });
      },

      createNewConversation: (feature) => {
        const newConversation: AIConversation = {
          id: generateConversationId(),
          title: feature ? `${feature} 对话` : '新对话',
          messages: [{
            id: generateMessageId(),
            type: 'assistant',
            content: feature
              ? `您好！我是${feature}助手，可以帮您处理相关任务。有什么可以帮助您的吗？`
              : '您好！我是LegalMind智能助手，可以帮您处理案件管理、日程安排、文档查找等任务。有什么可以帮助您的吗？',
            timestamp: new Date(),
            feature,
            suggestions: feature === 'case-analysis' 
              ? ['分析案件争议点', '评估胜诉概率', '制定应对策略']
              : feature === 'document-summary'
              ? ['总结文档要点', '提取关键信息', '生成摘要报告']
              : feature === 'legal-advice'
              ? ['法律条文查询', '程序指导', '风险评估']
              : feature === 'draft-generation'
              ? ['起草申请书', '生成答辩书', '制作庭审大纲']
              : ['查看今日案件', '创建新的日程', '搜索相关文档', '案件进展查询']
          }],
          createdAt: new Date(),
          updatedAt: new Date(),
          feature
        };

        set(state => ({
          currentConversation: newConversation,
          conversations: [newConversation, ...state.conversations],
          selectedFeature: feature || state.selectedFeature // 保持当前selectedFeature，避免无限循环
        }));

        return newConversation.id;
      },

      addMessage: (messageData) => {
        const message: AIMessage = {
          ...messageData,
          id: generateMessageId(),
          timestamp: new Date()
        };

        set(state => {
          if (!state.currentConversation) {
            // 如果没有当前对话，创建一个新的
            const newConversation: AIConversation = {
              id: generateConversationId(),
              title: '新对话',
              messages: [message],
              createdAt: new Date(),
              updatedAt: new Date()
            };
            return {
              currentConversation: newConversation,
              conversations: [newConversation, ...state.conversations]
            };
          }

          const updatedConversation = {
            ...state.currentConversation,
            messages: [...state.currentConversation.messages, message],
            updatedAt: new Date()
          };

          return {
            currentConversation: updatedConversation,
            conversations: state.conversations.map(conv =>
              conv.id === updatedConversation.id ? updatedConversation : conv
            )
          };
        });
      },

      updateMessage: (messageId, updates) => {
        set(state => {
          if (!state.currentConversation) return state;

          const updatedMessages = state.currentConversation.messages.map(msg =>
            msg.id === messageId ? { ...msg, ...updates } : msg
          );

          const updatedConversation = {
            ...state.currentConversation,
            messages: updatedMessages,
            updatedAt: new Date()
          };

          return {
            currentConversation: updatedConversation,
            conversations: state.conversations.map(conv =>
              conv.id === updatedConversation.id ? updatedConversation : conv
            )
          };
        });
      },

      deleteMessage: (messageId) => {
        set(state => {
          if (!state.currentConversation) return state;

          const updatedMessages = state.currentConversation.messages.filter(
            msg => msg.id !== messageId
          );

          const updatedConversation = {
            ...state.currentConversation,
            messages: updatedMessages,
            updatedAt: new Date()
          };

          return {
            currentConversation: updatedConversation,
            conversations: state.conversations.map(conv =>
              conv.id === updatedConversation.id ? updatedConversation : conv
            )
          };
        });
      },

      clearCurrentConversation: () => {
        set({ currentConversation: null, selectedFeature: '' });
      },

      deleteConversation: (conversationId) => {
        set(state => ({
          conversations: state.conversations.filter(conv => conv.id !== conversationId),
          currentConversation: state.currentConversation?.id === conversationId 
            ? null 
            : state.currentConversation
        }));
      },

      setIsTyping: (typing) => set({ isTyping: typing }),
      setInputValue: (value) => set({ inputValue: value }),
      setSelectedFeature: (feature) => set({ selectedFeature: feature }),

      syncWithFloatingAssistant: () => {
        // 同步悬浮助手的状态
        const state = get();
        if (state.currentConversation) {
          console.log('同步到悬浮助手:', state.currentConversation.messages.length, '条消息');
        }
      },

      syncWithMainPage: () => {
        // 同步主页面的状态
        const state = get();
        if (state.currentConversation) {
          console.log('同步到主页面:', state.currentConversation.messages.length, '条消息');
        }
      }
    }),
    {
      name: 'ai-messages-storage',
      partialize: (state) => ({
        conversations: state.conversations,
        selectedFeature: state.selectedFeature,
      }),
    }
  )
);

// 工具函数
export const generateAIResponse = (
  userInput: string, 
  feature: string, 
  context?: { page?: string; role?: string; caseId?: string }
): Omit<AIMessage, 'id' | 'timestamp'> => {
  const responses = {
    'case-analysis': [
      '基于您的描述，我对这个案件进行了初步分析：\n\n**争议焦点识别：**\n1. 合同履行义务的界定\n2. 违约责任的认定\n3. 损失计算的合理性',
      '案件分析完成。根据现有信息，建议重点关注证据链的完整性和时效性问题。',
      '我发现了几个关键的法律争议点，建议您准备相应的证据材料来支持您的主张。'
    ],
    'document-summary': [
      '文档总结完成：\n\n**核心内容：**\n• 主要条款：合同权利义务条款\n• 关键时间节点：签署日期、履行期限\n• 重要数据：金额、比例、期限等',
      '我已经提取了文档的关键信息，发现2处可能存在争议的条款，建议重点关注。',
      '文档分析显示，这份材料包含重要的证据价值，建议作为主要证据提交。'
    ],
    'legal-advice': [
      '根据您的咨询，我提供以下法律建议：\n\n**法律依据：**\n• 《仲裁法》相关条款\n• 相关司法解释\n• 行业惯例和标准',
      '基于现行法律规定，您的情况符合仲裁受理条件，建议按照标准程序进行。',
      '从法律角度分析，您需要注意程序性要求和时效性问题，建议及时采取行动。'
    ],
    'draft-generation': [
      '我已为您生成文书草稿：\n\n**文书类型：**仲裁申请书\n\n**主要内容框架：**\n1. 当事人基本信息\n2. 仲裁请求\n3. 事实与理由',
      '文书起草完成，请根据具体案情调整内容，确保事实描述准确。',
      '已生成标准格式的法律文书，建议您仔细核对相关信息后使用。'
    ],
    general: [
      '我理解您的需求，让我为您提供相应的帮助和建议。',
      '根据您当前的页面和角色，我推荐以下操作...',
      '如果您需要更详细的帮助，我可以引导您完成具体的操作步骤。'
    ]
  };

  let category = 'general';
  if (userInput.includes('案件') || userInput.includes('仲裁') || userInput.includes('分析')) {
    category = feature === 'case-analysis' ? 'case-analysis' : 'general';
  } else if (userInput.includes('文档') || userInput.includes('总结') || userInput.includes('材料')) {
    category = feature === 'document-summary' ? 'document-summary' : 'general';
  } else if (userInput.includes('法律') || userInput.includes('建议') || userInput.includes('咨询')) {
    category = feature === 'legal-advice' ? 'legal-advice' : 'general';
  } else if (userInput.includes('起草') || userInput.includes('文书') || userInput.includes('申请书')) {
    category = feature === 'draft-generation' ? 'draft-generation' : 'general';
  }

  const categoryResponses = responses[category as keyof typeof responses] || responses.general;
  // 使用输入长度作为种子，避免hydration mismatch
  const responseIndex = userInput.length % categoryResponses.length;
  const selectedResponse = categoryResponses[responseIndex];

  return {
    type: 'assistant',
    content: selectedResponse,
    feature,
    context,
    suggestions: category === 'case-analysis' 
      ? ['查看案件详情', '上传证据材料', '安排庭审时间']
      : category === 'document-summary'
      ? ['上传文档', '文档分类', '下载模板']
      : category === 'legal-advice'
      ? ['查看法条', '咨询专家', '获取更多建议']
      : category === 'draft-generation'
      ? ['下载文书', '编辑内容', '提交申请']
      : ['获取帮助', '查看教程', '联系客服']
  };
};
