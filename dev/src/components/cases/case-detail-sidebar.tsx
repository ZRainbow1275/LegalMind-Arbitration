// src/components/cases/case-detail-sidebar.tsx
'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArbitrationFeeCalculator, PropertyPreservationModal, DocumentGeneratorModal, OperationModal } from './operation-modals';
import { ArbitratorSelectionModal } from '@/components/modals/arbitrator-selection-modal';
import { EvidenceModal } from '@/components/modals/evidence-modal';
import { JurisdictionObjectionModal } from '@/components/modals/jurisdiction-objection-modal';
import { ChangeArbitrationRequestModal } from '@/components/modals/change-arbitration-request-modal';
import { ChangeAgentModal } from '@/components/modals/change-agent-modal';
import {
  Users,
  DollarSign,
  Scale,
  FileCheck,
  HelpCircle,
  FileText,
  MessageSquare,
  X,
  Shield,
  AlertTriangle,
  Edit,
  UserX,
  Receipt,
  Gavel,
  FileImage,
  FileSpreadsheet,
  Download,
  ChevronRight,
  ChevronDown
} from 'lucide-react';

interface CaseDetailSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  userRole: 'applicant' | 'respondent' | 'arbitrator';
  caseId: string;
}

// 操作菜单项类型
interface OperationMenuItem {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  status: string;
  badge?: string;
}

// 操作目录配置
const operationMenus: Record<string, OperationMenuItem[]> = {
  applicant: [
    {
      id: 'parties',
      title: '当事人信息',
      icon: Users,
      description: '查看和管理当事人信息',
      status: 'completed'
    },
    {
      id: 'fees',
      title: '仲裁费',
      icon: DollarSign,
      description: '查看费用明细和缴费状态',
      status: 'pending',
      badge: '待缴费'
    },
    {
      id: 'arbitrators',
      title: '仲裁员',
      icon: Scale,
      description: '仲裁庭组成和仲裁员信息',
      status: 'in-progress'
    },
    {
      id: 'evidence',
      title: '举证质证',
      icon: FileCheck,
      description: '提交证据材料和质证意见',
      status: 'available'
    },
    {
      id: 'questions',
      title: '问题单',
      icon: HelpCircle,
      description: '回答仲裁庭的问题',
      status: 'available'
    },
    {
      id: 'defense',
      title: '答辩书',
      icon: FileText,
      description: '查看对方答辩书',
      status: 'available'
    },
    {
      id: 'mediation',
      title: '调解',
      icon: MessageSquare,
      description: '参与调解程序',
      status: 'available'
    },
    {
      id: 'withdrawal',
      title: '撤案',
      icon: X,
      description: '申请撤回仲裁案件',
      status: 'available'
    },
    {
      id: 'preservation',
      title: '财产保全',
      icon: Shield,
      description: '申请财产保全措施',
      status: 'available'
    },
    {
      id: 'jurisdiction',
      title: '管辖异议',
      icon: AlertTriangle,
      description: '提出管辖异议',
      status: 'available'
    },
    {
      id: 'change-request',
      title: '变更仲裁请求',
      icon: Edit,
      description: '变更或追加仲裁请求',
      status: 'available'
    },
    {
      id: 'change-agent',
      title: '变更代理人',
      icon: UserX,
      description: '变更委托代理人',
      status: 'available'
    }
  ],
  respondent: [
    // 被申请人的操作菜单（类似但有些不同）
    {
      id: 'parties',
      title: '当事人信息',
      icon: Users,
      description: '查看和管理当事人信息',
      status: 'completed'
    },
    {
      id: 'fees',
      title: '仲裁费',
      icon: DollarSign,
      description: '查看费用明细',
      status: 'completed'
    },
    {
      id: 'arbitrators',
      title: '仲裁员',
      icon: Scale,
      description: '仲裁庭组成和仲裁员信息',
      status: 'in-progress'
    },
    {
      id: 'defense',
      title: '答辩书',
      icon: FileText,
      description: '提交答辩书',
      status: 'pending',
      badge: '待提交'
    },
    {
      id: 'evidence',
      title: '举证质证',
      icon: FileCheck,
      description: '提交证据材料和质证意见',
      status: 'available'
    },
    {
      id: 'questions',
      title: '问题单',
      icon: HelpCircle,
      description: '回答仲裁庭的问题',
      status: 'available'
    },
    {
      id: 'mediation',
      title: '调解',
      icon: MessageSquare,
      description: '参与调解程序',
      status: 'available'
    },
    {
      id: 'jurisdiction',
      title: '管辖异议',
      icon: AlertTriangle,
      description: '提出管辖异议',
      status: 'available'
    },
    {
      id: 'change-agent',
      title: '变更代理人',
      icon: UserX,
      description: '变更委托代理人',
      status: 'available'
    }
  ],
  arbitrator: [
    // 仲裁员的操作菜单
    {
      id: 'case-review',
      title: '案件审查',
      icon: FileCheck,
      description: '审查案件材料和程序',
      status: 'in-progress'
    },
    {
      id: 'tribunal',
      title: '仲裁庭管理',
      icon: Scale,
      description: '管理仲裁庭组成',
      status: 'completed'
    },
    {
      id: 'hearing',
      title: '庭审管理',
      icon: Gavel,
      description: '安排和主持庭审',
      status: 'pending'
    },
    {
      id: 'evidence-review',
      title: '证据审查',
      icon: FileCheck,
      description: '审查双方提交的证据',
      status: 'available'
    },
    {
      id: 'award',
      title: '裁决书制作',
      icon: FileText,
      description: '制作仲裁裁决书',
      status: 'available'
    }
  ]
};

// 文书目录配置
const documentMenus = [
  {
    id: 'payment-receipt',
    title: '交费电子回单',
    icon: Receipt,
    description: '仲裁费缴费凭证',
    status: 'available'
  },
  {
    id: 'tribunal-notice',
    title: '仲裁庭组成人员通知',
    icon: Users,
    description: '仲裁庭组成通知书',
    status: 'available'
  },
  {
    id: 'evidence-notice',
    title: '应裁举证通知书',
    icon: FileCheck,
    description: '举证责任通知书',
    status: 'available'
  },
  {
    id: 'application',
    title: '仲裁申请书',
    icon: FileText,
    description: '仲裁申请书正本',
    status: 'completed'
  },
  {
    id: 'identity-docs',
    title: '身份证明材料',
    icon: FileImage,
    description: '当事人身份证明文件',
    status: 'completed'
  },
  {
    id: 'evidence',
    title: '证据',
    icon: FileSpreadsheet,
    description: '案件相关证据材料',
    status: 'in-progress'
  }
];

const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed': return 'text-green-600 bg-green-50';
    case 'in-progress': return 'text-blue-600 bg-blue-50';
    case 'pending': return 'text-orange-600 bg-orange-50';
    case 'available': return 'text-gray-600 bg-gray-50';
    default: return 'text-gray-600 bg-gray-50';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'completed': return '✓';
    case 'in-progress': return '●';
    case 'pending': return '!';
    case 'available': return '○';
    default: return '○';
  }
};

export function CaseDetailSidebar({ isOpen, onClose, userRole, caseId }: CaseDetailSidebarProps) {
  const [expandedSections, setExpandedSections] = useState<string[]>(['operations']);
  const [selectedItem, setSelectedItem] = useState<string>('');
  const [activeModal, setActiveModal] = useState<string | null>(null);

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const operations = operationMenus[userRole] || operationMenus.applicant;

  const handleOperationClick = (operationId: string) => {
    setSelectedItem(operationId);

    // 根据操作类型打开相应的模态框
    switch (operationId) {
      case 'fees':
        setActiveModal('fee-calculator');
        break;
      case 'preservation':
        setActiveModal('property-preservation');
        break;
      case 'arbitrators':
        setActiveModal('arbitrator-selection');
        break;
      case 'evidence':
        setActiveModal('evidence');
        break;
      case 'questions':
        setActiveModal('questions');
        break;
      case 'parties':
        setActiveModal('parties-info');
        break;
      case 'defense':
        setActiveModal('defense-document');
        break;
      case 'mediation':
        setActiveModal('mediation-application');
        break;
      case 'withdrawal':
        setActiveModal('case-withdrawal');
        break;
      case 'jurisdiction':
        setActiveModal('jurisdiction-objection');
        break;
      case 'change-request':
        setActiveModal('change-arbitration-request');
        break;
      case 'change-agent':
        setActiveModal('change-agent');
        break;
      default:
        // 其他操作暂时显示提示
        alert(`${operationId} 功能正在开发中...`);
    }
  };

  const handleDocumentClick = (documentId: string) => {
    setSelectedItem(documentId);
    setActiveModal(`document-${documentId}`);
  };

  return (
    <div className={cn(
      "fixed inset-y-0 right-0 z-50 w-80 bg-white border-l border-gray-200 shadow-xl transform transition-transform duration-300 ease-in-out",
      isOpen ? "translate-x-0" : "translate-x-full"
    )}>
      <div className="flex flex-col h-full">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">案件操作</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto">
          {/* 操作目录 */}
          <div className="p-4">
            <div className="mb-4">
              <Button
                variant="ghost"
                className="w-full justify-between p-2 h-auto"
                onClick={() => toggleSection('operations')}
              >
                <span className="font-medium">操作目录</span>
                {expandedSections.includes('operations') ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
              
              {expandedSections.includes('operations') && (
                <div className="mt-2 space-y-1">
                  {operations.map((item) => (
                    <div
                      key={item.id}
                      className={cn(
                        "p-3 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-sm",
                        selectedItem === item.id ? "border-orange-200 bg-orange-50" : "border-gray-200 hover:border-gray-300"
                      )}
                      onClick={() => handleOperationClick(item.id)}
                    >
                      <div className="flex items-start space-x-3">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-medium",
                          getStatusColor(item.status)
                        )}>
                          {getStatusIcon(item.status)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="text-sm font-medium text-gray-900">{item.title}</h4>
                            {item.badge && (
                              <Badge variant="secondary" className="text-xs">
                                {item.badge}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-gray-600">{item.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator className="my-4" />

            {/* 文书目录 */}
            <div>
              <Button
                variant="ghost"
                className="w-full justify-between p-2 h-auto"
                onClick={() => toggleSection('documents')}
              >
                <span className="font-medium">文书目录</span>
                {expandedSections.includes('documents') ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
              
              {expandedSections.includes('documents') && (
                <div className="mt-2 space-y-1">
                  {documentMenus.map((item) => (
                    <div
                      key={item.id}
                      className={cn(
                        "p-3 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-sm",
                        selectedItem === item.id ? "border-orange-200 bg-orange-50" : "border-gray-200 hover:border-gray-300"
                      )}
                      onClick={() => handleDocumentClick(item.id)}
                    >
                      <div className="flex items-start space-x-3">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center",
                          getStatusColor(item.status)
                        )}>
                          <item.icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-gray-900 mb-1">{item.title}</h4>
                          <p className="text-xs text-gray-600">{item.description}</p>
                          <div className="flex items-center justify-between mt-2">
                            <span className={cn(
                              "text-xs px-2 py-1 rounded",
                              getStatusColor(item.status)
                            )}>
                              {item.status === 'completed' ? '已完成' : 
                               item.status === 'in-progress' ? '进行中' : 
                               item.status === 'pending' ? '待处理' : '可用'}
                            </span>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                              <Download className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 底部操作 */}
        <div className="p-4 border-t border-gray-200">
          <Button
            className="w-full btn-primary btn-ripple"
            onClick={() => setActiveModal('document-generator')}
          >
            生成文书
          </Button>
        </div>
      </div>

      {/* 操作模态框 */}
      <ArbitrationFeeCalculator
        isOpen={activeModal === 'fee-calculator'}
        onClose={() => setActiveModal(null)}
        caseId={caseId}
      />

      <PropertyPreservationModal
        isOpen={activeModal === 'property-preservation'}
        onClose={() => setActiveModal(null)}
        caseId={caseId}
      />

      <DocumentGeneratorModal
        isOpen={activeModal?.startsWith('document-') || false}
        onClose={() => setActiveModal(null)}
        caseId={caseId}
        documentType={activeModal?.replace('document-', '') || ''}
      />

      <ArbitratorSelectionModal
        isOpen={activeModal === 'arbitrator-selection'}
        onClose={() => setActiveModal(null)}
        caseId={caseId}
      />

      <EvidenceModal
        isOpen={activeModal === 'evidence'}
        onClose={() => setActiveModal(null)}
        caseId={caseId}
      />

      {/* 管辖异议模态框 */}
      <JurisdictionObjectionModal
        isOpen={activeModal === 'jurisdiction-objection'}
        onClose={() => setActiveModal(null)}
        caseId={caseId}
      />

      {/* 变更仲裁请求模态框 */}
      <ChangeArbitrationRequestModal
        isOpen={activeModal === 'change-arbitration-request'}
        onClose={() => setActiveModal(null)}
        caseId={caseId}
      />

      {/* 变更代理人模态框 */}
      <ChangeAgentModal
        isOpen={activeModal === 'change-agent'}
        onClose={() => setActiveModal(null)}
        caseId={caseId}
      />

      {/* 通用操作模态框 */}
      <OperationModal
        isOpen={['parties-info', 'defense-document', 'mediation-application', 'case-withdrawal'].includes(activeModal || '')}
        onClose={() => setActiveModal(null)}
        type={activeModal || ''}
        caseId={caseId}
      />
    </div>
  );
}
