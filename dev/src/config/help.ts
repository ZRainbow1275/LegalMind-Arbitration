// dev/src/config/help.ts
// 帮助中心静态配置：分类文档与常见问题
import { BookOpen as BookOpenIcon, FileText as FileTextIcon, Settings as SettingsIcon } from 'lucide-react';

export interface HelpArticle {
  id: string;
  title: string;
  views: number;
  helpful: number; // 有帮助百分比
}

export interface HelpCategory {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string; // e.g. 'text-blue-600'
  bgColor: string; // e.g. 'bg-blue-50'
  articles: HelpArticle[];
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  helpful: number;
}

export const helpCategories: HelpCategory[] = [
  {
    id: 'getting-started',
    title: '快速入门',
    description: '了解如何开始使用 LegalMind 仲裁平台',
    icon: BookOpenIcon,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    articles: [
      { id: '1', title: '平台介绍和注册流程', views: 1250, helpful: 95 },
      { id: '2', title: '如何提交仲裁申请', views: 980, helpful: 92 },
    ],
  },
  {
    id: 'case-processing',
    title: '案件办理',
    description: '从申请到裁决的全流程指南',
    icon: FileTextIcon,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    articles: [
      { id: '5', title: '证据提交规范', views: 845, helpful: 89 },
      { id: '6', title: '在线庭审指引', views: 732, helpful: 91 },
    ],
  },
  {
    id: 'technical',
    title: '技术支持',
    description: '系统使用、故障排除和技术问题',
    icon: SettingsIcon,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    articles: [
      { id: '13', title: '系统要求和兼容性', views: 678, helpful: 85 },
      { id: '14', title: '常见问题排除', views: 467, helpful: 87 },
    ],
  },
];

export const faqData: FAQItem[] = [
  { id: 'faq-1', question: '如何提交仲裁申请？', answer: '登录后点击“新建仲裁申请”，按指引填写并提交。', category: '案件申请', helpful: 156 },
  { id: 'faq-2', question: '仲裁费用如何计算？', answer: '根据争议金额自动计算，支付明细会在页面显示。', category: '费用支付', helpful: 134 },
  { id: 'faq-3', question: '如何参与在线庭审？', answer: '开庭前收到通知，点击“进入庭审”并完成设备测试即可。', category: '在线庭审', helpful: 128 },
];

