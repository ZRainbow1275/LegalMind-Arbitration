// dev/src/components/search/advanced-filter.tsx
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import {
  Filter,
  X,
  Search,
  Calendar,
  DollarSign,
  Users,
  Scale,
  FileText,
  Clock,
  RefreshCw,
  Download
} from 'lucide-react';

interface FilterCriteria {
  keyword: string;
  caseType: string[];
  status: string[];
  dateRange: {
    start: string;
    end: string;
  };
  amountRange: {
    min: number;
    max: number;
  };
  arbitrator: string;
  priority: string[];
  tags: string[];
}

interface AdvancedFilterProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyFilter: (criteria: FilterCriteria) => void;
  initialCriteria?: Partial<FilterCriteria>;
}

const caseTypes = [
  '合同纠纷',
  '劳动争议',
  '投资争议',
  '知识产权',
  '建设工程',
  '金融争议',
  '国际贸易',
  '房地产',
  '保险理赔',
  '其他'
];

const caseStatuses = [
  '待受理',
  '已受理',
  '审理中',
  '调解中',
  '已结案',
  '已撤案',
  '暂停审理'
];

const priorities = [
  '紧急',
  '高',
  '中',
  '低'
];

const commonTags = [
  '重大案件',
  '涉外案件',
  '集体案件',
  '疑难案件',
  '示范案例',
  '在线审理',
  '加急处理'
];

export function AdvancedFilter({ isOpen, onClose, onApplyFilter, initialCriteria }: AdvancedFilterProps) {
  const [criteria, setCriteria] = useState<FilterCriteria>({
    keyword: initialCriteria?.keyword || '',
    caseType: initialCriteria?.caseType || [],
    status: initialCriteria?.status || [],
    dateRange: {
      start: initialCriteria?.dateRange?.start || '',
      end: initialCriteria?.dateRange?.end || ''
    },
    amountRange: {
      min: initialCriteria?.amountRange?.min || 0,
      max: initialCriteria?.amountRange?.max || 1000
    },
    arbitrator: initialCriteria?.arbitrator || '',
    priority: initialCriteria?.priority || [],
    tags: initialCriteria?.tags || []
  });

  const [activeFilters, setActiveFilters] = useState<string[]>([]);

  const handleCaseTypeChange = (type: string, checked: boolean) => {
    setCriteria(prev => ({
      ...prev,
      caseType: checked 
        ? [...prev.caseType, type]
        : prev.caseType.filter(t => t !== type)
    }));
  };

  const handleStatusChange = (status: string, checked: boolean) => {
    setCriteria(prev => ({
      ...prev,
      status: checked 
        ? [...prev.status, status]
        : prev.status.filter(s => s !== status)
    }));
  };

  const handlePriorityChange = (priority: string, checked: boolean) => {
    setCriteria(prev => ({
      ...prev,
      priority: checked 
        ? [...prev.priority, priority]
        : prev.priority.filter(p => p !== priority)
    }));
  };

  const handleTagChange = (tag: string, checked: boolean) => {
    setCriteria(prev => ({
      ...prev,
      tags: checked 
        ? [...prev.tags, tag]
        : prev.tags.filter(t => t !== tag)
    }));
  };

  const handleAmountRangeChange = (values: number[]) => {
    setCriteria(prev => ({
      ...prev,
      amountRange: {
        min: values[0],
        max: values[1]
      }
    }));
  };

  const resetFilters = () => {
    setCriteria({
      keyword: '',
      caseType: [],
      status: [],
      dateRange: { start: '', end: '' },
      amountRange: { min: 0, max: 1000 },
      arbitrator: '',
      priority: [],
      tags: []
    });
    setActiveFilters([]);
  };

  const applyFilters = () => {
    onApplyFilter(criteria);
    onClose();
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (criteria.keyword) count++;
    if (criteria.caseType.length > 0) count++;
    if (criteria.status.length > 0) count++;
    if (criteria.dateRange.start || criteria.dateRange.end) count++;
    if (criteria.amountRange.min > 0 || criteria.amountRange.max < 1000) count++;
    if (criteria.arbitrator) count++;
    if (criteria.priority.length > 0) count++;
    if (criteria.tags.length > 0) count++;
    return count;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-orange-500" />
                高级筛选
              </CardTitle>
              <CardDescription>
                设置详细的筛选条件来精确查找内容
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              {getActiveFilterCount() > 0 && (
                <Badge className="bg-orange-100 text-orange-800">
                  {getActiveFilterCount()} 个筛选条件
                </Badge>
              )}
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 基础筛选 */}
            <div className="space-y-6">
              <div>
                <Label className="text-base font-medium mb-3 block">基础筛选</Label>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="keyword">关键词</Label>
                    <Input
                      id="keyword"
                      placeholder="输入关键词搜索..."
                      value={criteria.keyword}
                      onChange={(e) => setCriteria(prev => ({ ...prev, keyword: e.target.value }))}
                    />
                  </div>

                  <div>
                    <Label>案件类型</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {caseTypes.map(type => (
                        <div key={type} className="flex items-center space-x-2">
                          <Checkbox
                            id={`type-${type}`}
                            checked={criteria.caseType.includes(type)}
                            onCheckedChange={(checked) => handleCaseTypeChange(type, checked as boolean)}
                          />
                          <Label htmlFor={`type-${type}`} className="text-sm">
                            {type}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label>案件状态</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {caseStatuses.map(status => (
                        <div key={status} className="flex items-center space-x-2">
                          <Checkbox
                            id={`status-${status}`}
                            checked={criteria.status.includes(status)}
                            onCheckedChange={(checked) => handleStatusChange(status, checked as boolean)}
                          />
                          <Label htmlFor={`status-${status}`} className="text-sm">
                            {status}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 高级筛选 */}
            <div className="space-y-6">
              <div>
                <Label className="text-base font-medium mb-3 block">高级筛选</Label>
                
                <div className="space-y-4">
                  <div>
                    <Label>日期范围</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <Input
                        type="date"
                        value={criteria.dateRange.start}
                        onChange={(e) => setCriteria(prev => ({
                          ...prev,
                          dateRange: { ...prev.dateRange, start: e.target.value }
                        }))}
                      />
                      <Input
                        type="date"
                        value={criteria.dateRange.end}
                        onChange={(e) => setCriteria(prev => ({
                          ...prev,
                          dateRange: { ...prev.dateRange, end: e.target.value }
                        }))}
                      />
                    </div>
                  </div>

                  <div>
                    <Label>争议金额范围 (万元)</Label>
                    <div className="mt-3 px-2">
                      <Slider
                        value={[criteria.amountRange.min, criteria.amountRange.max]}
                        onValueChange={handleAmountRangeChange}
                        max={1000}
                        min={0}
                        step={10}
                        className="w-full"
                      />
                      <div className="flex justify-between text-sm text-gray-600 mt-1">
                        <span>{criteria.amountRange.min}万</span>
                        <span>{criteria.amountRange.max}万</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="arbitrator">指定仲裁员</Label>
                    <Select value={criteria.arbitrator} onValueChange={(value) => 
                      setCriteria(prev => ({ ...prev, arbitrator: value }))
                    }>
                      <SelectTrigger>
                        <SelectValue placeholder="选择仲裁员" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">全部仲裁员</SelectItem>
                        <SelectItem value="zhang-minghua">张明华</SelectItem>
                        <SelectItem value="li-xiaohong">李晓红</SelectItem>
                        <SelectItem value="wang-jianguo">王建国</SelectItem>
                        <SelectItem value="chen-yaqin">陈雅琴</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>优先级</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {priorities.map(priority => (
                        <div key={priority} className="flex items-center space-x-2">
                          <Checkbox
                            id={`priority-${priority}`}
                            checked={criteria.priority.includes(priority)}
                            onCheckedChange={(checked) => handlePriorityChange(priority, checked as boolean)}
                          />
                          <Label htmlFor={`priority-${priority}`} className="text-sm">
                            {priority}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label>标签</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {commonTags.map(tag => (
                        <div key={tag} className="flex items-center space-x-2">
                          <Checkbox
                            id={`tag-${tag}`}
                            checked={criteria.tags.includes(tag)}
                            onCheckedChange={(checked) => handleTagChange(tag, checked as boolean)}
                          />
                          <Label htmlFor={`tag-${tag}`} className="text-sm">
                            {tag}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 已选择的筛选条件预览 */}
          {getActiveFilterCount() > 0 && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <Label className="text-sm font-medium mb-2 block">当前筛选条件</Label>
              <div className="flex flex-wrap gap-2">
                {criteria.keyword && (
                  <Badge variant="secondary">
                    关键词: {criteria.keyword}
                  </Badge>
                )}
                {criteria.caseType.map(type => (
                  <Badge key={type} variant="secondary">
                    类型: {type}
                  </Badge>
                ))}
                {criteria.status.map(status => (
                  <Badge key={status} variant="secondary">
                    状态: {status}
                  </Badge>
                ))}
                {(criteria.dateRange.start || criteria.dateRange.end) && (
                  <Badge variant="secondary">
                    日期: {criteria.dateRange.start || '开始'} ~ {criteria.dateRange.end || '结束'}
                  </Badge>
                )}
                {(criteria.amountRange.min > 0 || criteria.amountRange.max < 1000) && (
                  <Badge variant="secondary">
                    金额: {criteria.amountRange.min}万 ~ {criteria.amountRange.max}万
                  </Badge>
                )}
                {criteria.arbitrator && (
                  <Badge variant="secondary">
                    仲裁员: {criteria.arbitrator}
                  </Badge>
                )}
                {criteria.priority.map(priority => (
                  <Badge key={priority} variant="secondary">
                    优先级: {priority}
                  </Badge>
                ))}
                {criteria.tags.map(tag => (
                  <Badge key={tag} variant="secondary">
                    标签: {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>

        <Separator />

        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Button variant="outline" onClick={resetFilters}>
                <RefreshCw className="h-4 w-4 mr-2" />
                重置
              </Button>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                保存筛选
              </Button>
            </div>
            
            <div className="flex items-center space-x-3">
              <Button variant="outline" onClick={onClose}>
                取消
              </Button>
              <Button onClick={applyFilters} className="bg-orange-500 hover:bg-orange-600 text-white">
                <Search className="h-4 w-4 mr-2" />
                应用筛选 ({getActiveFilterCount()})
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
