// dev/src/store/drafts.ts
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

export interface CaseDraft {
  id: string;
  title: string;
  caseType: string;
  applicant: string;
  respondent: string;
  amount: string;
  description: string;
  lastModified: string;
  progress: number;
  status: '待完善' | '待提交';
  formData: {
    // 基本信息
    basicInfo: {
      caseType: string;
      disputeAmount: string;
      description: string;
      urgency: string;
    };
    // 当事人信息
    parties: {
      applicant: {
        name: string;
        type: 'individual' | 'company';
        idNumber: string;
        phone: string;
        email: string;
        address: string;
        legalRep?: string;
      };
      respondent: {
        name: string;
        type: 'individual' | 'company';
        idNumber: string;
        phone: string;
        email: string;
        address: string;
        legalRep?: string;
      };
    };
    // 争议详情
    dispute: {
      background: string;
      claims: string;
      evidence: string;
      legalBasis: string;
    };
    // 附件
    attachments: Array<{
      id: string;
      name: string;
      type: string;
      size: number;
      url?: string;
    }>;
  };
}

interface CaseDraftFormData {
  basicInfo?: {
    caseType?: string;
    disputeAmount?: string | number;
    description?: string;
    urgency?: string;
    [key: string]: unknown;
  };
  parties?: {
    applicant?: CaseDraftPartyFormData;
    respondent?: CaseDraftPartyFormData;
    [key: string]: unknown;
  };
  dispute?: CaseDraftDisputeFormData;
  attachments?: unknown[];
  [key: string]: unknown;
}

interface CaseDraftPartyFormData {
  name?: string;
  type?: 'individual' | 'company';
  idNumber?: string;
  phone?: string;
  email?: string;
  address?: string;
  legalRep?: string;
  [key: string]: unknown;
}

interface CaseDraftDisputeFormData {
  background?: string;
  claims?: string;
  evidence?: string;
  legalBasis?: string;
  [key: string]: unknown;
}

interface DraftsState {
  drafts: CaseDraft[];
  addDraft: (draft: Omit<CaseDraft, 'id' | 'lastModified'>) => string;
  updateDraft: (id: string, updates: Partial<CaseDraft>) => void;
  deleteDraft: (id: string) => void;
  getDraft: (id: string) => CaseDraft | undefined;
  saveDraftFromForm: (formData: CaseDraftFormData, title?: string) => string;
  calculateProgress: (formData: CaseDraftFormData) => number;
}

// 生成唯一ID
function generateId(): string {
  return 'draft-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

// 计算表单完成进度
function calculateFormProgress(formData: CaseDraftFormData): number {
  let totalFields = 0;
  let completedFields = 0;

  // 基本信息 (25%)
  const basicFields = ['caseType', 'disputeAmount', 'description'];
  totalFields += basicFields.length;
  basicFields.forEach(field => {
    if (formData.basicInfo?.[field]) completedFields++;
  });

  // 当事人信息 (35%)
  const partyFields = ['name', 'type', 'phone', 'email'] as const;
  totalFields += partyFields.length * 2; // 申请人和被申请人
  const parties = ['applicant', 'respondent'] as const;
  parties.forEach(party => {
    partyFields.forEach(field => {
      if (formData.parties?.[party]?.[field]) completedFields++;
    });
  });

  // 争议详情 (30%)
  const disputeFields = ['background', 'claims', 'evidence'];
  totalFields += disputeFields.length;
  disputeFields.forEach(field => {
    if (formData.dispute?.[field]) completedFields++;
  });

  // 附件 (10%)
  totalFields += 1;
  if ((formData.attachments?.length ?? 0) > 0) completedFields++;

  return Math.round((completedFields / totalFields) * 100);
}

// 从表单数据生成标题
function generateTitle(formData: CaseDraftFormData): string {
  const caseType = formData.basicInfo?.caseType || '仲裁';
  const applicant = formData.parties?.applicant?.name || '申请人';
  const respondent = formData.parties?.respondent?.name || '被申请人';
  
  if (applicant !== '申请人' && respondent !== '被申请人') {
    return `${applicant} vs ${respondent} ${caseType}案`;
  } else if (applicant !== '申请人') {
    return `${applicant}的${caseType}申请`;
  } else {
    return `${caseType}申请草稿`;
  }
}

export const useDraftsStore = create<DraftsState>()(
  devtools(
    persist(
      (set, get) => ({
        drafts: [],
        
        addDraft: (draft) => {
          const id = generateId();
          const newDraft: CaseDraft = {
            ...draft,
            id,
            lastModified: new Date().toISOString(),
          };
          
          set((state) => ({
            drafts: [newDraft, ...state.drafts]
          }));
          
          return id;
        },

        updateDraft: (id, updates) => {
          set((state) => ({
            drafts: state.drafts.map(draft =>
              draft.id === id
                ? { ...draft, ...updates, lastModified: new Date().toISOString() }
                : draft
            )
          }));
        },

        deleteDraft: (id) => {
          set((state) => ({
            drafts: state.drafts.filter(draft => draft.id !== id)
          }));
        },

        getDraft: (id) => {
          return get().drafts.find(draft => draft.id === id);
        },

        saveDraftFromForm: (formData, title) => {
          const progress = calculateFormProgress(formData);
          const generatedTitle = title || generateTitle(formData);

          const basicInfo = formData.basicInfo ?? {};
          const parties = formData.parties ?? {};
          const dispute = formData.dispute ?? {};
          const attachments = Array.isArray(formData.attachments) ? formData.attachments : [];

          const normalizeParty = (
            party: CaseDraftPartyFormData | undefined
          ): CaseDraft['formData']['parties']['applicant'] => {
            const partyData = party ?? {};
            return {
              name: typeof partyData.name === 'string' ? partyData.name : '',
              type: partyData.type === 'company' ? 'company' : 'individual',
              idNumber: typeof partyData.idNumber === 'string' ? partyData.idNumber : '',
              phone: typeof partyData.phone === 'string' ? partyData.phone : '',
              email: typeof partyData.email === 'string' ? partyData.email : '',
              address: typeof partyData.address === 'string' ? partyData.address : '',
              legalRep: typeof partyData.legalRep === 'string' ? partyData.legalRep : '',
            };
          };

          const normalizedFormData: CaseDraft['formData'] = {
            basicInfo: {
              caseType: typeof basicInfo.caseType === 'string' ? basicInfo.caseType : '',
              disputeAmount:
                basicInfo.disputeAmount === undefined || basicInfo.disputeAmount === null
                  ? ''
                  : String(basicInfo.disputeAmount),
              description: typeof basicInfo.description === 'string' ? basicInfo.description : '',
              urgency: typeof basicInfo.urgency === 'string' ? basicInfo.urgency : '',
            },
            parties: {
              applicant: normalizeParty(parties.applicant as CaseDraftPartyFormData | undefined),
              respondent: normalizeParty(parties.respondent as CaseDraftPartyFormData | undefined),
            },
            dispute: {
              background: typeof dispute.background === 'string' ? dispute.background : '',
              claims: typeof dispute.claims === 'string' ? dispute.claims : '',
              evidence: typeof dispute.evidence === 'string' ? dispute.evidence : '',
              legalBasis: typeof dispute.legalBasis === 'string' ? dispute.legalBasis : '',
            },
            attachments: attachments.flatMap((item) => {
              if (!item || typeof item !== 'object') return [];
              const record = item as Record<string, unknown>;
              const id = typeof record.id === 'string' ? record.id : undefined;
              const name = typeof record.name === 'string' ? record.name : undefined;
              const type = typeof record.type === 'string' ? record.type : undefined;
              const size = typeof record.size === 'number' ? record.size : undefined;
              const url = typeof record.url === 'string' ? record.url : undefined;
              if (!id || !name || !type || typeof size !== 'number') return [];
              return [{ id, name, type, size, url }];
            }),
          };

          const draft: Omit<CaseDraft, 'id' | 'lastModified'> = {
            title: generatedTitle,
            caseType: normalizedFormData.basicInfo.caseType,
            applicant: normalizedFormData.parties.applicant.name,
            respondent: normalizedFormData.parties.respondent.name,
            amount: normalizedFormData.basicInfo.disputeAmount,
            description: normalizedFormData.basicInfo.description,
            progress,
            status: progress >= 90 ? '待提交' : '待完善',
            formData: normalizedFormData,
          };

          return get().addDraft(draft);
        },

        calculateProgress: calculateFormProgress
      }),
      {
        name: 'drafts-store',
        version: 1,
      }
    ),
    { name: 'drafts-store' }
  )
);

// 导出类型和工具函数
export { generateId, calculateFormProgress, generateTitle };
