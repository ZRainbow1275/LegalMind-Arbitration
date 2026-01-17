// src/lib/mock-data.ts
import type { 
  User, 
  IndividualProfile, 
  ArbitrationCase, 
  ActionItem, 
  CaseProgress,
  Notification 
} from '@/types';

// Mock user data
export const mockUser: User = {
  id: 'user-001',
  email: 'zhang.wei@company.com',
  phone: '13800138000',
  userType: 'individual',
  status: 'active',
  createdAt: new Date('2024-01-15'),
  updatedAt: new Date('2024-12-01'),
};

export const mockProfile: IndividualProfile = {
  userId: 'user-001',
  realName: '张伟',
  idNumber: '110101199001011234',
  idCardImages: ['/images/id-front.jpg', '/images/id-back.jpg'],
  faceVerificationData: 'verified-hash-data',
  verificationStatus: 'verified',
};

// Mock cases data
export const mockCases: ArbitrationCase[] = [
  {
    id: 'case-001',
    caseNumber: '赣仲2024第0001号',
    applicantId: 'user-001',
    respondentId: 'user-002',
    caseType: '合同纠纷',
    disputeAmount: 500000,
    status: 'hearing_scheduled',
    arbitrationAgreement: '/documents/agreement-001.pdf',
    applicationForm: '/documents/application-001.pdf',
    evidenceList: [],
    createdAt: new Date('2024-11-01'),
    updatedAt: new Date('2024-12-01'),
    title: '建设工程合同纠纷案',
    description: '关于某建设项目工程款支付争议的仲裁申请',
    deadline: new Date('2024-12-15'),
  },
  {
    id: 'case-002',
    caseNumber: '赣仲2024第0002号',
    applicantId: 'user-001',
    respondentId: 'user-003',
    caseType: '买卖合同纠纷',
    disputeAmount: 200000,
    status: 'tribunal_formation',
    arbitrationAgreement: '/documents/agreement-002.pdf',
    applicationForm: '/documents/application-002.pdf',
    evidenceList: [],
    createdAt: new Date('2024-11-15'),
    updatedAt: new Date('2024-11-30'),
    title: '货物买卖合同纠纷案',
    description: '关于货物质量和交付时间争议的仲裁申请',
    deadline: new Date('2024-12-20'),
  },
  {
    id: 'case-003',
    caseNumber: '赣仲2024第0003号',
    applicantId: 'user-004',
    respondentId: 'user-001',
    caseType: '服务合同纠纷',
    disputeAmount: 150000,
    status: 'pre_hearing',
    arbitrationAgreement: '/documents/agreement-003.pdf',
    applicationForm: '/documents/application-003.pdf',
    evidenceList: [],
    createdAt: new Date('2024-10-20'),
    updatedAt: new Date('2024-11-25'),
    title: '技术服务合同纠纷案',
    description: '关于软件开发服务费用争议的仲裁申请',
    deadline: new Date('2024-12-10'),
  },
];

// Mock action items
export const mockActionItems: ActionItem[] = [
  {
    id: 'action-001',
    type: 'deadline',
    title: '提交答辩状',
    description: '案件"建设工程合同纠纷案"的答辩期限即将到期',
    priority: 'high',
    deadline: new Date('2024-12-15'),
    caseId: 'case-001',
    completed: false,
    createdAt: new Date('2024-12-01'),
  },
  {
    id: 'action-002',
    type: 'task',
    title: '选择仲裁员',
    description: '请为案件"货物买卖合同纠纷案"选择仲裁员',
    priority: 'medium',
    deadline: new Date('2024-12-20'),
    caseId: 'case-002',
    completed: false,
    createdAt: new Date('2024-11-30'),
  },
  {
    id: 'action-003',
    type: 'notification',
    title: '庭审时间确定',
    description: '案件"技术服务合同纠纷案"的庭审时间已确定',
    priority: 'medium',
    caseId: 'case-003',
    completed: false,
    createdAt: new Date('2024-11-28'),
  },
  {
    id: 'action-004',
    type: 'reminder',
    title: '补充证据材料',
    description: '建议为案件"建设工程合同纠纷案"补充相关证据',
    priority: 'low',
    caseId: 'case-001',
    completed: false,
    createdAt: new Date('2024-11-25'),
  },
];

// Mock case progress data
export const mockCaseProgress: Record<string, CaseProgress> = {
  'case-001': {
    caseId: 'case-001',
    currentStage: 4,
    totalStages: 6,
    stages: [
      { name: '立案', status: 'completed', completedAt: new Date('2024-11-01') },
      { name: '缴费', status: 'completed', completedAt: new Date('2024-11-02') },
      { name: '送达', status: 'completed', completedAt: new Date('2024-11-05') },
      { name: '组庭', status: 'completed', completedAt: new Date('2024-11-10') },
      { name: '开庭', status: 'current' },
      { name: '裁决', status: 'pending' },
    ],
  },
  'case-002': {
    caseId: 'case-002',
    currentStage: 2,
    totalStages: 6,
    stages: [
      { name: '立案', status: 'completed', completedAt: new Date('2024-11-15') },
      { name: '缴费', status: 'completed', completedAt: new Date('2024-11-16') },
      { name: '送达', status: 'current' },
      { name: '组庭', status: 'pending' },
      { name: '开庭', status: 'pending' },
      { name: '裁决', status: 'pending' },
    ],
  },
  'case-003': {
    caseId: 'case-003',
    currentStage: 3,
    totalStages: 6,
    stages: [
      { name: '立案', status: 'completed', completedAt: new Date('2024-10-20') },
      { name: '缴费', status: 'completed', completedAt: new Date('2024-10-21') },
      { name: '送达', status: 'completed', completedAt: new Date('2024-10-25') },
      { name: '组庭', status: 'current' },
      { name: '开庭', status: 'pending' },
      { name: '裁决', status: 'pending' },
    ],
  },
};

// Mock notifications
export const mockNotifications: Notification[] = [
  {
    id: 'notif-001',
    type: 'info',
    title: '庭审提醒',
    message: '您的案件"建设工程合同纠纷案"将于明天上午10:00开庭',
    timestamp: new Date('2024-12-01 09:00'),
    isRead: false,
  },
  {
    id: 'notif-002',
    type: 'success',
    title: '仲裁庭组建完成',
    message: '案件"货物买卖合同纠纷案"的仲裁庭已成功组建',
    timestamp: new Date('2024-11-30 14:30'),
    isRead: false,
  },
  {
    id: 'notif-003',
    type: 'warning',
    title: '答辩期限提醒',
    message: '请注意，您有一个答辩期限即将到期',
    timestamp: new Date('2024-11-29 16:00'),
    isRead: true,
  },
];

// Helper function to get mock data
export function getMockUserData() {
  return {
    user: mockUser,
    profile: mockProfile,
  };
}

export function getMockDashboardData() {
  return {
    cases: mockCases,
    actionItems: mockActionItems,
    caseProgress: mockCaseProgress,
    notifications: mockNotifications,
  };
}
