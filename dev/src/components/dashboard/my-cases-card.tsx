// src/components/dashboard/my-cases-card.tsx
'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  FolderOpen, 
  ArrowRight, 
  Calendar,
  DollarSign,
  Clock,
  Eye,
} from 'lucide-react';
import { mockCases, mockCaseProgress } from '@/lib/mock-data';
import { getCaseStatusColor, getCaseStatusText, formatCurrency, formatDate } from '@/lib/utils';
import { useCasesStore } from '@/store';
import { useRole } from '@/components/layout/role-switcher';

export function MyCasesCard() {
  const { cases: storeCases } = useCasesStore();
  const { currentRole } = useRole();

  // 使用store中的数据，如果没有则fallback到mock数据
  const allCases = storeCases.length > 0 ? storeCases : mockCases;      

  // 根据角色过滤案件
  const filteredCases = allCases.filter(() => true);

  const cases = filteredCases.slice(0, 3); // Show only first 3 cases

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
              <FolderOpen className="w-4 h-4 text-white" />
            </div>
            <CardTitle className="text-lg">我的案件</CardTitle>
          </div>
          <Badge variant="secondary" className="bg-primary-50 text-primary-700">
            {filteredCases.length} 个案件
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {cases.map((case_) => {
          const progress = mockCaseProgress[case_.id];
          const progressPercentage = progress ? (progress.currentStage / progress.totalStages) * 100 : 0;
          const currentStage = progress?.stages[progress.currentStage - 1];
          
          return (
            <div
              key={case_.id}
              className="group p-4 border border-border rounded-lg hover:border-primary-200 hover:bg-primary-50/30 transition-all duration-200"
            >
              {/* Case Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <h3 className="text-sm font-medium text-foreground group-hover:text-primary-700 transition-colors truncate">
                      {case_.title}
                    </h3>
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${getCaseStatusColor(case_.status)}`}
                    >
                      {getCaseStatusText(case_.status)}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    案件编号: {case_.caseNumber}
                  </p>
                </div>
                
                <Link href={`/cases/${case_.id}`}>
                  <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <Eye className="w-4 h-4" />
                  </Button>
                </Link>
              </div>

              {/* Case Info */}
              <div className="grid grid-cols-2 gap-3 mb-3 text-xs text-muted-foreground">
                <div className="flex items-center space-x-1">
                  <DollarSign className="w-3 h-3" />
                  <span>争议金额: {formatCurrency(case_.disputeAmount)}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Calendar className="w-3 h-3" />
                  <span>创建时间: {formatDate(case_.createdAt)}</span>
                </div>
              </div>

              {/* Progress Bar */}
              {progress && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      当前阶段: {currentStage?.name}
                    </span>
                    <span className="text-primary-600 font-medium">
                      {progress.currentStage}/{progress.totalStages}
                    </span>
                  </div>
                  
                  <Progress 
                    value={progressPercentage} 
                    className="h-2"
                  />
                  
                  {/* Stage Indicators */}
                  <div className="flex justify-between text-xs">
                    {progress.stages.map((stage, index) => (
                      <div
                        key={stage.name}
                        className={`flex flex-col items-center space-y-1 ${
                          stage.status === 'completed' 
                            ? 'text-success-600' 
                            : stage.status === 'current'
                            ? 'text-primary-600 font-medium'
                            : 'text-muted-foreground'
                        }`}
                      >
                        <div className={`w-2 h-2 rounded-full ${
                          stage.status === 'completed'
                            ? 'bg-success-500'
                            : stage.status === 'current'
                            ? 'bg-primary-500'
                            : 'bg-muted-foreground/30'
                        }`} />
                        <span className="text-xs">{stage.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Next Action */}
              {case_.deadline && (
                <div className="mt-3 p-2 bg-warning-50 border border-warning-200 rounded-md">
                  <div className="flex items-center space-x-2 text-xs text-warning-700">
                    <Clock className="w-3 h-3" />
                    <span>下个截止时间: {formatDate(case_.deadline)}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* View All Cases Button */}
        <div className="pt-2">
          <Link href="/cases">
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full text-primary-600 hover:text-primary-700 hover:bg-primary-50"
            >
              查看全部案件
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
