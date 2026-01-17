// dev/src/components/search/global-search.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Search,
  FileText,
  Users,
  Calendar,
  Scale,
  MessageSquare,
  Clock,
  ArrowRight,
  History,
  TrendingUp,
  Filter
} from 'lucide-react';

// 模拟搜索结果数据
const mockSearchResults = {
  cases: [
    {
      id: 'case-001',
      title: '软件开发合同纠纷案',
      caseNumber: 'ARB-2024-001',
      status: '审理中',
      type: '合同纠纷',
      amount: '50万元',
      date: '2024-02-15'
    },
    {
      id: 'case-002',
      title: '劳动合同争议案',
      caseNumber: 'ARB-2024-002',
      status: '已结案',
      type: '劳动争议',
      amount: '12万元',
      date: '2024-02-10'
    }
  ],
  arbitrators: [
    {
      id: 'arb-001',
      name: '张明华',
      title: '高级仲裁员',
      specialties: ['合同纠纷', '公司法'],
      experience: 15,
      rating: 4.8
    },
    {
      id: 'arb-002',
      name: '李晓红',
      title: '资深仲裁员',
      specialties: ['劳动争议', '知识产权'],
      experience: 12,
      rating: 4.9
    }
  ],
  documents: [
    {
      id: 'doc-001',
      name: '仲裁申请书.pdf',
      type: '申请文件',
      caseId: 'case-001',
      uploadDate: '2024-02-15',
      size: '2.3MB'
    },
    {
      id: 'doc-002',
      name: '证据材料汇总.docx',
      type: '证据文件',
      caseId: 'case-001',
      uploadDate: '2024-02-16',
      size: '5.1MB'
    }
  ],
  schedules: [
    {
      id: 'schedule-001',
      title: '合同纠纷案首次开庭',
      date: '2024-02-20',
      time: '09:00-11:00',
      type: '开庭',
      status: '已确认'
    }
  ]
};

// 搜索历史
const searchHistory = [
  '合同纠纷',
  '张明华',
  '劳动争议',
  '仲裁申请书',
  '开庭时间'
];

type SearchResultCase = (typeof mockSearchResults.cases)[number];
type SearchResultArbitrator = (typeof mockSearchResults.arbitrators)[number];
type SearchResultDocument = (typeof mockSearchResults.documents)[number];
type SearchResultSchedule = (typeof mockSearchResults.schedules)[number];

type SearchResults = {
  cases: SearchResultCase[];
  arbitrators: SearchResultArbitrator[];
  documents: SearchResultDocument[];
  schedules: SearchResultSchedule[];
};

type SearchCategoryKey = keyof SearchResults | 'all';

const SEARCH_CATEGORIES: Array<{ key: keyof SearchResults; label: string }> = [
  { key: 'cases', label: '案件' },
  { key: 'arbitrators', label: '仲裁员' },
  { key: 'documents', label: '文档' },
  { key: 'schedules', label: '日程' },
];

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GlobalSearch({ isOpen, onClose }: GlobalSearchProps) {  
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<SearchCategoryKey>('all');
  const inputRef = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // 点击外部区域关闭搜索框
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isOpen && overlayRef.current && !overlayRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);

  useEffect(() => {
    if (query.length >= 2) {
      performSearch(query);
    } else {
      setResults(null);
    }
  }, [query]);

  const performSearch = async (searchQuery: string) => {
    setIsLoading(true);
    
    // 模拟搜索延迟
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // 模拟搜索结果过滤
    const filteredResults: SearchResults = {
      cases: mockSearchResults.cases.filter(item =>
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.caseNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.type.toLowerCase().includes(searchQuery.toLowerCase())
      ),
      arbitrators: mockSearchResults.arbitrators.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.specialties.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()))
      ),
      documents: mockSearchResults.documents.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.type.toLowerCase().includes(searchQuery.toLowerCase())
      ),
      schedules: mockSearchResults.schedules.filter(item =>
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.type.toLowerCase().includes(searchQuery.toLowerCase())
      )
    };
    
    setResults(filteredResults);
    setIsLoading(false);
  };

  const handleResultClick = (type: string, id: string) => {
    onClose();
    switch (type) {
      case 'case':
        router.push(`/cases/${id}`);
        break;
      case 'arbitrator':
        router.push(`/arbitrators/${id}`);
        break;
      case 'document':
        router.push(`/documents/${id}`);
        break;
      case 'schedule':
        router.push(`/schedule/${id}`);
        break;
    }
  };

  const handleHistoryClick = (historyQuery: string) => {
    setQuery(historyQuery);
  };

  const getTotalResults = () => {
    if (!results) return 0;
    return results.cases.length + results.arbitrators.length + results.documents.length + results.schedules.length;
  };

  const getFilteredResults = () => {
    if (!results) return null;
    if (activeCategory === 'all') return results;
    return { [activeCategory]: results[activeCategory] } as Pick<SearchResults, keyof SearchResults>;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center pt-20">
      <Card ref={overlayRef} className="w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden">
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              ref={inputRef}
              placeholder="搜索案件、仲裁员、文档、日程..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10 pr-4 text-lg"
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  onClose();
                }
              }}
            />
          </div>
          
          {/* 搜索筛选 */}
          {results && (
            <div className="flex items-center space-x-2 mt-3">
              <Button
                variant={activeCategory === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveCategory('all')}
              >
                全部 ({getTotalResults()})
              </Button>
              {SEARCH_CATEGORIES.map(({ key, label }) => (
                <Button
                  key={key}
                  variant={activeCategory === key ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveCategory(key)}
                >
                  {label} ({results[key].length})
                </Button>
              ))}
            </div>
          )}
        </div>

        <CardContent className="p-0 max-h-96 overflow-y-auto">
          {!query && (
            <div className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <History className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">搜索历史</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {searchHistory.map((item, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="cursor-pointer hover:bg-gray-200"
                    onClick={() => handleHistoryClick(item)}
                  >
                    {item}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {isLoading && (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
              <p className="text-gray-500 mt-2">搜索中...</p>
            </div>
          )}

          {results && !isLoading && getTotalResults() === 0 && (
            <div className="p-8 text-center">
              <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">未找到相关结果</p>
              <p className="text-sm text-gray-400 mt-1">尝试使用不同的关键词</p>
            </div>
          )}

          {results && !isLoading && getTotalResults() > 0 && (
            <div className="divide-y">
              {/* 案件结果 */}
              {(activeCategory === 'all' || activeCategory === 'cases') && results.cases?.length > 0 && (
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Scale className="h-4 w-4 text-blue-500" />
                    <span className="font-medium">案件 ({results.cases.length})</span>
                  </div>
                  <div className="space-y-2">
                      {results.cases.map((case_item) => (
                      <div
                        key={case_item.id}
                        className="p-3 rounded-lg border hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => handleResultClick('case', case_item.id)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium">{case_item.title}</h4>
                            <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                              <span>案件编号：{case_item.caseNumber}</span>
                              <Badge variant="outline">{case_item.status}</Badge>
                              <span>{case_item.amount}</span>
                            </div>
                          </div>
                          <ArrowRight className="h-4 w-4 text-gray-400" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 仲裁员结果 */}
              {(activeCategory === 'all' || activeCategory === 'arbitrators') && results.arbitrators?.length > 0 && (
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="h-4 w-4 text-green-500" />
                    <span className="font-medium">仲裁员 ({results.arbitrators.length})</span>
                  </div>
                  <div className="space-y-2">
                    {results.arbitrators.map((arbitrator) => (
                      <div
                        key={arbitrator.id}
                        className="p-3 rounded-lg border hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => handleResultClick('arbitrator', arbitrator.id)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium">{arbitrator.name}</h4>
                            <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                              <span>{arbitrator.title}</span>
                              <span>{arbitrator.experience}年经验</span>
                              <span>⭐ {arbitrator.rating}</span>
                            </div>
                            <div className="flex gap-1 mt-2">
                              {arbitrator.specialties.map((specialty: string, index: number) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                  {specialty}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <ArrowRight className="h-4 w-4 text-gray-400" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 文档结果 */}
              {(activeCategory === 'all' || activeCategory === 'documents') && results.documents?.length > 0 && (
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="h-4 w-4 text-purple-500" />
                    <span className="font-medium">文档 ({results.documents.length})</span>
                  </div>
                  <div className="space-y-2">
                      {results.documents.map((document) => (
                      <div
                        key={document.id}
                        className="p-3 rounded-lg border hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => handleResultClick('document', document.id)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium">{document.name}</h4>
                            <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                              <span>{document.type}</span>
                              <span>{document.size}</span>
                              <span>{document.uploadDate}</span>
                            </div>
                          </div>
                          <ArrowRight className="h-4 w-4 text-gray-400" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 日程结果 */}
              {(activeCategory === 'all' || activeCategory === 'schedules') && results.schedules?.length > 0 && (
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar className="h-4 w-4 text-orange-500" />
                    <span className="font-medium">日程 ({results.schedules.length})</span>
                  </div>
                  <div className="space-y-2">
                      {results.schedules.map((schedule) => (
                      <div
                        key={schedule.id}
                        className="p-3 rounded-lg border hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => handleResultClick('schedule', schedule.id)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium">{schedule.title}</h4>
                            <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                              <span>{schedule.date}</span>
                              <span>{schedule.time}</span>
                              <Badge variant="outline">{schedule.status}</Badge>
                            </div>
                          </div>
                          <ArrowRight className="h-4 w-4 text-gray-400" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>

        {results && getTotalResults() > 0 && (
          <div className="p-4 border-t bg-gray-50">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>找到 {getTotalResults()} 个结果</span>
              <div className="flex items-center gap-2">
                <span>按 ESC 关闭</span>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
