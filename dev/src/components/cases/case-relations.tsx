// dev/src/components/cases/case-relations.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Link2,
  Plus,
  ExternalLink,
  Trash2,
  ArrowRight,
  Scale,
  MessageSquare,
  Calendar,
  DollarSign,
  Eye
} from 'lucide-react';
import { useCaseRelationsStore, getRelationTypeLabel, getRelationTypeColor, type CaseRelation, type RelatedCase } from '@/store/case-relations';
import { formatDate } from '@/lib/utils';

interface CaseRelationsProps {
  caseId: string;
  caseType: 'arbitration' | 'mediation';
  className?: string;
}

function isRelationType(value: string): value is CaseRelation['relationType'] {
  return (
    value === 'related' ||
    value === 'derived' ||
    value === 'converted' ||
    value === 'split' ||
    value === 'merged'
  );
}

export function CaseRelations({ caseId, caseType, className }: CaseRelationsProps) {
  const router = useRouter();
  const {
    getRelatedCases,
    addRelation,
    removeRelation,
    createMediationFromArbitration,
    createArbitrationFromMediation
  } = useCaseRelationsStore();

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newRelation, setNewRelation] = useState<{
    targetType: CaseRelation['targetType'];
    targetId: string;
    relationType: CaseRelation['relationType'];
    description: string;
  }>({
    targetType: 'mediation',
    targetId: '',
    relationType: 'related',
    description: ''
  });

  const relatedCases = getRelatedCases(caseId, caseType);

  const handleAddRelation = () => {
    if (!newRelation.targetId) return;

    addRelation({
      sourceType: caseType,
      sourceId: caseId,
      targetType: newRelation.targetType,
      targetId: newRelation.targetId,
      relationType: newRelation.relationType,
      description: newRelation.description,
      createdBy: 'current-user',
      status: 'active'
    });

    setShowAddDialog(false);
    setNewRelation({
      targetType: 'mediation',
      targetId: '',
      relationType: 'related',
      description: ''
    });
  };

  const handleCreateMediation = () => {
    if (caseType === 'arbitration') {
      const mediationId = createMediationFromArbitration(caseId, {
        title: '调解申请',
        description: '从仲裁案件申请调解'
      });
      router.push(`/mediation/apply?sourceCase=${caseId}&mediationId=${mediationId}`);
    }
  };

  const handleCreateArbitration = () => {
    if (caseType === 'mediation') {
      const arbitrationId = createArbitrationFromMediation(caseId, {
        title: '仲裁申请',
        description: '调解失败转仲裁程序'
      });
      router.push(`/cases/new?sourceMediation=${caseId}&caseId=${arbitrationId}`);
    }
  };

  const handleViewCase = (relatedCase: RelatedCase) => {
    if (relatedCase.type === 'arbitration') {
      router.push(`/cases/${relatedCase.id}`);
    } else {
      router.push(`/mediation/${relatedCase.id}`);
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            关联案件
          </div>
          <div className="flex items-center gap-2">
            {caseType === 'arbitration' && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCreateMediation}
                className="text-green-600 hover:text-green-700"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                申请调解
              </Button>
            )}
            {caseType === 'mediation' && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCreateArbitration}
                className="text-orange-600 hover:text-orange-700"
              >
                <Scale className="h-4 w-4 mr-2" />
                转仲裁
              </Button>
            )}
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  添加关联
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>添加案件关联</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>关联类型</Label>
                    <Select
                      value={newRelation.targetType}
                      onValueChange={(value: 'arbitration' | 'mediation') =>
                        setNewRelation(prev => ({ ...prev, targetType: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="arbitration">仲裁案件</SelectItem>
                        <SelectItem value="mediation">调解案件</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>案件ID</Label>
                    <Input
                      value={newRelation.targetId}
                      onChange={(e) =>
                        setNewRelation(prev => ({ ...prev, targetId: e.target.value }))
                      }
                      placeholder="输入要关联的案件ID"
                    />
                  </div>
                  <div>
                    <Label>关联关系</Label>
                    <Select
                      value={newRelation.relationType}
                      onValueChange={(value) => {
                        if (!isRelationType(value)) return;
                        setNewRelation(prev => ({ ...prev, relationType: value }));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="related">相关案件</SelectItem>
                        <SelectItem value="derived">衍生案件</SelectItem>
                        <SelectItem value="converted">转换案件</SelectItem>
                        <SelectItem value="split">分拆案件</SelectItem>
                        <SelectItem value="merged">合并案件</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>关联说明</Label>
                    <Textarea
                      value={newRelation.description}
                      onChange={(e) =>
                        setNewRelation(prev => ({ ...prev, description: e.target.value }))
                      }
                      placeholder="请说明关联关系的具体情况"
                      rows={3}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                      取消
                    </Button>
                    <Button onClick={handleAddRelation}>
                      确认添加
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {relatedCases.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Link2 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>暂无关联案件</p>
            <p className="text-sm mt-1">您可以添加相关的仲裁或调解案件</p>
          </div>
        ) : (
          <div className="space-y-4">
            {relatedCases.map((relatedCase) => (
              <div
                key={relatedCase.id}
                className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge
                        variant="outline"
                        className={relatedCase.type === 'arbitration' ? 'border-orange-200 text-orange-700' : 'border-green-200 text-green-700'}
                      >
                        {relatedCase.type === 'arbitration' ? '仲裁' : '调解'}
                      </Badge>
                      <Badge
                        variant="secondary"
                        className={getRelationTypeColor(relatedCase.relationType)}
                      >
                        {getRelationTypeLabel(relatedCase.relationType)}
                      </Badge>
                    </div>
                    <h4 className="font-medium text-gray-900 mb-1">
                      {relatedCase.caseNumber}
                    </h4>
                    <p className="text-sm text-gray-600 mb-2">
                      {relatedCase.title}
                    </p>
                    {relatedCase.relationDescription && (
                      <p className="text-xs text-gray-500 mb-2">
                        {relatedCase.relationDescription}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(relatedCase.createdAt)}
                      </span>
                      {relatedCase.amount && (
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          ¥{relatedCase.amount.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewCase(relatedCase)}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewCase(relatedCase)}
                      className="text-gray-600 hover:text-gray-700"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
