// dev/src/lib/demo-hearing-config.ts

// 演示庭审配置
export const demoHearingConfig = {
  // 演示庭审码映射
  hearingCodes: {
    'case-001': '123456', // 建设工程合同纠纷案
    'case-002': '789012', // 软件开发合同争议案
    'case-003': '345678', // 买卖合同纠纷案
    'demo-hearing': '999999' // 通用演示庭审
  },

  // 演示庭审会话
  demoSessions: {
    'case-001': {
      id: 'hearing-case-001',
      caseId: 'case-001',
      caseNumber: '赣仲2024第0001号',
      title: '建设工程合同纠纷案庭审',
      status: 'scheduled' as const,
      type: 'arbitration' as const,
      startTime: '2024-12-01T09:00:00',
      endTime: '2024-12-01T12:00:00',
      hearingCode: '123456',
      isDemo: true,
      participants: [
        {
          id: 'arbitrator-1',
          name: '张仲裁员',
          role: '首席仲裁员',
          type: 'arbitrator',
          isOnline: true,
          videoEnabled: true,
          audioEnabled: true,
          isHost: true
        },
        {
          id: 'arbitrator-2',
          name: '李仲裁员',
          role: '仲裁员',
          type: 'arbitrator',
          isOnline: true,
          videoEnabled: true,
          audioEnabled: true,
          isHost: false
        },
        {
          id: 'applicant-1',
          name: '申请人代表',
          role: '申请人',
          type: 'party',
          isOnline: true,
          videoEnabled: true,
          audioEnabled: true,
          isHost: false
        },
        {
          id: 'applicant-lawyer',
          name: '申请人律师',
          role: '申请人代理人',
          type: 'lawyer',
          isOnline: true,
          videoEnabled: true,
          audioEnabled: false,
          isHost: false
        },
        {
          id: 'respondent-1',
          name: '被申请人代表',
          role: '被申请人',
          type: 'party',
          isOnline: true,
          videoEnabled: true,
          audioEnabled: true,
          isHost: false
        },
        {
          id: 'respondent-lawyer',
          name: '被申请人律师',
          role: '被申请人代理人',
          type: 'lawyer',
          isOnline: true,
          videoEnabled: true,
          audioEnabled: false,
          isHost: false
        }
      ],
      evidences: [
        {
          id: 'evidence-1',
          name: '建设工程合同',
          type: 'contract',
          description: '双方签署的建设工程施工合同',
          uploadedBy: '申请人',
          uploadedAt: '2024-11-15T10:00:00',
          isPresenting: false
        },
        {
          id: 'evidence-2',
          name: '工程验收报告',
          type: 'report',
          description: '第三方出具的工程质量验收报告',
          uploadedBy: '被申请人',
          uploadedAt: '2024-11-16T14:30:00',
          isPresenting: false
        },
        {
          id: 'evidence-3',
          name: '付款凭证',
          type: 'financial',
          description: '工程款支付的银行转账凭证',
          uploadedBy: '申请人',
          uploadedAt: '2024-11-17T09:15:00',
          isPresenting: false
        }
      ],
      transcripts: [
        {
          id: 'transcript-1',
          speaker: '张仲裁员',
          content: '现在开始庭审，请各方当事人确认身份。',
          timestamp: '2024-12-01T09:00:00',
          isKeyPoint: true
        },
        {
          id: 'transcript-2',
          speaker: '申请人律师',
          content: '申请人认为被申请人未按合同约定支付工程款，请求仲裁庭支持我方诉求。',
          timestamp: '2024-12-01T09:05:00',
          isKeyPoint: true
        },
        {
          id: 'transcript-3',
          speaker: '被申请人律师',
          content: '被申请人认为工程质量存在问题，有权拒绝支付剩余工程款。',
          timestamp: '2024-12-01T09:10:00',
          isKeyPoint: true
        }
      ]
    },

    'case-002': {
      id: 'hearing-case-002',
      caseId: 'case-002',
      caseNumber: '赣仲2024第0002号',
      title: '软件开发合同争议案庭审',
      status: 'in-progress' as const,
      type: 'arbitration' as const,
      startTime: '2024-12-01T14:00:00',
      endTime: '2024-12-01T17:00:00',
      hearingCode: '789012',
      isDemo: true,
      participants: [
        {
          id: 'arbitrator-chief',
          name: '王首席仲裁员',
          role: '首席仲裁员',
          type: 'arbitrator',
          isOnline: true,
          videoEnabled: true,
          audioEnabled: true,
          isHost: true
        },
        {
          id: 'applicant-company',
          name: '科技公司代表',
          role: '申请人',
          type: 'party',
          isOnline: true,
          videoEnabled: true,
          audioEnabled: true,
          isHost: false
        },
        {
          id: 'respondent-company',
          name: '软件公司代表',
          role: '被申请人',
          type: 'party',
          isOnline: true,
          videoEnabled: true,
          audioEnabled: true,
          isHost: false
        }
      ],
      evidences: [
        {
          id: 'evidence-soft-1',
          name: '软件开发合同',
          type: 'contract',
          description: '双方签署的软件开发服务合同',
          uploadedBy: '申请人',
          uploadedAt: '2024-11-20T10:00:00',
          isPresenting: true
        },
        {
          id: 'evidence-soft-2',
          name: '需求变更记录',
          type: 'communication',
          description: '项目过程中的需求变更邮件记录',
          uploadedBy: '被申请人',
          uploadedAt: '2024-11-21T15:30:00',
          isPresenting: false
        }
      ],
      transcripts: [
        {
          id: 'transcript-soft-1',
          speaker: '王首席仲裁员',
          content: '请申请人说明软件开发项目的具体争议点。',
          timestamp: '2024-12-01T14:00:00',
          isKeyPoint: true
        },
        {
          id: 'transcript-soft-2',
          speaker: '科技公司代表',
          content: '被申请人未按约定时间交付软件，且软件功能不符合合同要求。',
          timestamp: '2024-12-01T14:05:00',
          isKeyPoint: true
        }
      ]
    },

    'demo-hearing': {
      id: 'demo-hearing-001',
      caseId: 'demo-case',
      caseNumber: 'DEMO-2024-001',
      title: '演示庭审会话',
      status: 'scheduled' as const,
      type: 'arbitration' as const,
      startTime: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5分钟后开始
      endTime: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(), // 3小时后结束
      hearingCode: '999999',
      isDemo: true,
      participants: [
        {
          id: 'demo-arbitrator',
          name: '演示仲裁员',
          role: '首席仲裁员',
          type: 'arbitrator',
          isOnline: true,
          videoEnabled: true,
          audioEnabled: true,
          isHost: true
        },
        {
          id: 'demo-applicant',
          name: '演示申请人',
          role: '申请人',
          type: 'party',
          isOnline: true,
          videoEnabled: true,
          audioEnabled: true,
          isHost: false
        },
        {
          id: 'demo-respondent',
          name: '演示被申请人',
          role: '被申请人',
          type: 'party',
          isOnline: true,
          videoEnabled: true,
          audioEnabled: true,
          isHost: false
        }
      ],
      evidences: [
        {
          id: 'demo-evidence-1',
          name: '演示证据文件',
          type: 'document',
          description: '这是一个演示用的证据文件',
          uploadedBy: '演示申请人',
          uploadedAt: new Date().toISOString(),
          isPresenting: false
        }
      ],
      transcripts: [
        {
          id: 'demo-transcript-1',
          speaker: '演示仲裁员',
          content: '欢迎参加LegalMind仲裁平台演示庭审。',
          timestamp: new Date().toISOString(),
          isKeyPoint: true
        }
      ]
    }
  }
};

  // 获取演示庭审配置
  export function getDemoHearingConfig(caseId: string) {
    if (Object.prototype.hasOwnProperty.call(demoHearingConfig.demoSessions, caseId)) {
      return demoHearingConfig.demoSessions[caseId as keyof typeof demoHearingConfig.demoSessions];
    }

    return undefined;
  }

// 验证演示庭审码
export function verifyDemoHearingCode(caseId: string, code: string): boolean {
  const expectedCode = demoHearingConfig.hearingCodes[caseId as keyof typeof demoHearingConfig.hearingCodes];
  return code === expectedCode;
}

// 获取所有可用的演示庭审
export function getAllDemoHearings() {
  return Object.values(demoHearingConfig.demoSessions);
}

// 生成庭审码 - 使用计数器避免hydration mismatch
let hearingCodeCounter = 100000;
export function generateHearingCode(): string {
  return (++hearingCodeCounter).toString();
}
