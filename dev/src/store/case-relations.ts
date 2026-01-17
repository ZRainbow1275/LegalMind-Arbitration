// dev/src/store/case-relations.ts
// 案件关联关系管理store

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CaseRelation {
  id: string;
  sourceType: 'arbitration' | 'mediation';
  sourceId: string;
  targetType: 'arbitration' | 'mediation';
  targetId: string;
  relationType: 'derived' | 'related' | 'converted' | 'split' | 'merged';
  description?: string;
  createdAt: Date;
  createdBy: string;
  status: 'active' | 'inactive';
}

export interface RelatedCase {
  id: string;
  caseNumber: string;
  title: string;
  type: 'arbitration' | 'mediation';
  status: string;
  amount?: number;
  createdAt: Date;
  relationType: string;
  relationDescription?: string;
}

interface CaseRelationsState {
  relations: CaseRelation[];
  
  // 操作方法
  addRelation: (relation: Omit<CaseRelation, 'id' | 'createdAt'>) => string;
  removeRelation: (relationId: string) => void;
  updateRelation: (relationId: string, updates: Partial<CaseRelation>) => void;
  
  // 查询方法
  getRelatedCases: (caseId: string, caseType: 'arbitration' | 'mediation') => RelatedCase[];
  getRelationsByCase: (caseId: string, caseType: 'arbitration' | 'mediation') => CaseRelation[];
  hasRelation: (sourceId: string, targetId: string) => boolean;
  
  // 批量操作
  createMediationFromArbitration: (arbitrationId: string, mediationData: unknown) => string;
  createArbitrationFromMediation: (mediationId: string, arbitrationData: unknown) => string;
  
  // 统计方法
  getRelationStats: () => {
    total: number;
    byType: Record<string, number>;
    byRelationType: Record<string, number>;
  };
}

// Mock数据 - 模拟现有的案件关联关系
const mockRelations: CaseRelation[] = [
  {
    id: 'rel-001',
    sourceType: 'arbitration',
    sourceId: 'case-001',
    targetType: 'mediation',
    targetId: 'med-001',
    relationType: 'derived',
    description: '仲裁案件转调解',
    createdAt: new Date('2024-01-15'),
    createdBy: 'user-001',
    status: 'active'
  },
  {
    id: 'rel-002',
    sourceType: 'mediation',
    sourceId: 'med-002',
    targetType: 'arbitration',
    targetId: 'case-002',
    relationType: 'converted',
    description: '调解失败转仲裁',
    createdAt: new Date('2024-01-20'),
    createdBy: 'user-002',
    status: 'active'
  }
];

// Mock案件数据 - 用于关联查询
const mockCases = {
  arbitration: [
    {
      id: 'case-001',
      caseNumber: 'ARB-2024-001',
      title: '软件开发合同争议',
      status: 'in-progress',
      amount: 500000,
      createdAt: new Date('2024-01-10')
    },
    {
      id: 'case-002',
      caseNumber: 'ARB-2024-002',
      title: '服务合同纠纷',
      status: 'pending',
      amount: 300000,
      createdAt: new Date('2024-01-25')
    }
  ],
  mediation: [
    {
      id: 'med-001',
      caseNumber: 'MED-2024-001',
      title: '软件开发合同争议调解',
      status: 'ongoing',
      amount: 500000,
      createdAt: new Date('2024-01-15')
    },
    {
      id: 'med-002',
      caseNumber: 'MED-2024-002',
      title: '商务合作争议调解',
      status: 'failed',
      amount: 200000,
      createdAt: new Date('2024-01-18')
    }
  ]
};

export const useCaseRelationsStore = create<CaseRelationsState>()(
  persist(
    (set, get) => ({
      relations: mockRelations,

      addRelation: (relationData) => {
        const newRelation: CaseRelation = {
          ...relationData,
          id: `rel-${Date.now()}`,
          createdAt: new Date()
        };

        set(state => ({
          relations: [...state.relations, newRelation]
        }));

        return newRelation.id;
      },

      removeRelation: (relationId) => {
        set(state => ({
          relations: state.relations.filter(rel => rel.id !== relationId)
        }));
      },

      updateRelation: (relationId, updates) => {
        set(state => ({
          relations: state.relations.map(rel =>
            rel.id === relationId ? { ...rel, ...updates } : rel
          )
        }));
      },

      getRelatedCases: (caseId, caseType) => {
        const { relations } = get();
        const relatedCases: RelatedCase[] = [];

        // 查找所有相关的关联关系
        const relevantRelations = relations.filter(rel =>
          (rel.sourceId === caseId && rel.sourceType === caseType) ||
          (rel.targetId === caseId && rel.targetType === caseType)
        );

        relevantRelations.forEach(relation => {
          let targetCaseId: string;
          let targetCaseType: 'arbitration' | 'mediation';

          // 确定目标案件
          if (relation.sourceId === caseId && relation.sourceType === caseType) {
            targetCaseId = relation.targetId;
            targetCaseType = relation.targetType;
          } else {
            targetCaseId = relation.sourceId;
            targetCaseType = relation.sourceType;
          }

          // 从mock数据中查找案件信息
          const targetCase = mockCases[targetCaseType].find(c => c.id === targetCaseId);
          if (targetCase) {
            relatedCases.push({
              ...targetCase,
              type: targetCaseType,
              relationType: relation.relationType,
              relationDescription: relation.description
            });
          }
        });

        return relatedCases;
      },

      getRelationsByCase: (caseId, caseType) => {
        const { relations } = get();
        return relations.filter(rel =>
          (rel.sourceId === caseId && rel.sourceType === caseType) ||
          (rel.targetId === caseId && rel.targetType === caseType)
        );
      },

      hasRelation: (sourceId, targetId) => {
        const { relations } = get();
        return relations.some(rel =>
          (rel.sourceId === sourceId && rel.targetId === targetId) ||
          (rel.sourceId === targetId && rel.targetId === sourceId)
        );
      },

      createMediationFromArbitration: (arbitrationId, mediationData) => {
        const mediationId = `med-${Date.now()}`;
        
        // 创建关联关系
        const relationId = get().addRelation({
          sourceType: 'arbitration',
          sourceId: arbitrationId,
          targetType: 'mediation',
          targetId: mediationId,
          relationType: 'derived',
          description: '从仲裁案件申请调解',
          createdBy: 'current-user',
          status: 'active'
        });

        return mediationId;
      },

      createArbitrationFromMediation: (mediationId, arbitrationData) => {
        const arbitrationId = `case-${Date.now()}`;
        
        // 创建关联关系
        const relationId = get().addRelation({
          sourceType: 'mediation',
          sourceId: mediationId,
          targetType: 'arbitration',
          targetId: arbitrationId,
          relationType: 'converted',
          description: '调解失败转仲裁程序',
          createdBy: 'current-user',
          status: 'active'
        });

        return arbitrationId;
      },

      getRelationStats: () => {
        const { relations } = get();
        const stats = {
          total: relations.length,
          byType: {} as Record<string, number>,
          byRelationType: {} as Record<string, number>
        };

        relations.forEach(rel => {
          // 按案件类型统计
          const typeKey = `${rel.sourceType}-${rel.targetType}`;
          stats.byType[typeKey] = (stats.byType[typeKey] || 0) + 1;

          // 按关联类型统计
          stats.byRelationType[rel.relationType] = (stats.byRelationType[rel.relationType] || 0) + 1;
        });

        return stats;
      }
    }),
    {
      name: 'case-relations-storage',
      partialize: (state) => ({
        relations: state.relations
      })
    }
  )
);

// 工具函数
export const getRelationTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    derived: '衍生案件',
    related: '相关案件',
    converted: '转换案件',
    split: '分拆案件',
    merged: '合并案件'
  };
  return labels[type] || type;
};

export const getRelationTypeColor = (type: string): string => {
  const colors: Record<string, string> = {
    derived: 'bg-blue-100 text-blue-800',
    related: 'bg-gray-100 text-gray-800',
    converted: 'bg-orange-100 text-orange-800',
    split: 'bg-purple-100 text-purple-800',
    merged: 'bg-green-100 text-green-800'
  };
  return colors[type] || 'bg-gray-100 text-gray-800';
};
