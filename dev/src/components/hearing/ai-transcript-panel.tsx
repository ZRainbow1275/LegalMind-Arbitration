// src/components/hearing/ai-transcript-panel.tsx
'use client';

// AI 实时笔录面板（原型）：展示滚动对话，支持“勘误申请”占位

import { useEffect, useRef, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Bot,
  CheckCircle2,
  Send,
  Star,
  Flag,
  MessageSquare,
  Clock,
  Tag,
  Search,
  Download,
  Edit,
  Bookmark
} from 'lucide-react';

interface Entry {
  id: string;
  speaker: string; // 角色名
  content: string;
  time: string;
  isKeyPoint?: boolean; // 是否为关键点
  tags?: string[]; // 标签
  importance?: 'low' | 'medium' | 'high'; // 重要程度
  relatedEvidence?: string[]; // 相关证据ID
}

interface KeyPoint {
  id: string;
  title: string;
  content: string;
  speaker: string;
  time: string;
  category: 'fact' | 'law' | 'evidence' | 'procedure' | 'agreement';
  importance: 'low' | 'medium' | 'high';
  tags: string[];
}

interface NegotiationSuggestion {
  id: string;
  type: 'mediation' | 'settlement' | 'procedure';
  title: string;
  description: string;
  applicablePhase: string[];
  confidence: number; // 0-1
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AITranscriptPanel({ open, onOpenChange }: Props) {
  const [entries, setEntries] = useState<Entry[]>([
    {
      id: 't1',
      speaker: '首席仲裁员',
      content: '现在宣布开庭。请各方当事人确认身份。',
      time: '09:30',
      isKeyPoint: true,
      tags: ['程序', '开庭'],
      importance: 'high'
    },
    {
      id: 't2',
      speaker: '申请人',
      content: '申请人陈述如下：被申请人违反合同约定，未按时交付软件，造成经济损失50万元。',
      time: '09:31',
      isKeyPoint: true,
      tags: ['争议焦点', '损失'],
      importance: 'high'
    },
    {
      id: 't3',
      speaker: '被申请人',
      content: '就陈述内容进行答辩：延期交付是因为申请人多次变更需求，我方已尽最大努力。',
      time: '09:35',
      isKeyPoint: true,
      tags: ['答辩', '变更需求'],
      importance: 'medium'
    },
  ]);

  const [keyPoints, setKeyPoints] = useState<KeyPoint[]>([]);
  const [suggestions, setSuggestions] = useState<NegotiationSuggestion[]>([]);
  const [correctionFor, setCorrectionFor] = useState<string | null>(null);
  const [correctionText, setCorrectionText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const viewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!viewRef.current) return;
    viewRef.current.scrollTop = viewRef.current.scrollHeight;
  }, [entries, open]);

  // 初始化协商建议
  useEffect(() => {
    setSuggestions([
      {
        id: 'sug1',
        type: 'mediation',
        title: '建议调解',
        description: '双方对合同履行存在分歧，建议通过调解方式解决争议',
        applicablePhase: ['investigation', 'debate'],
        confidence: 0.8
      },
      {
        id: 'sug2',
        type: 'settlement',
        title: '损失分担方案',
        description: '考虑到双方都有一定责任，建议按比例分担损失',
        applicablePhase: ['debate', 'closing'],
        confidence: 0.7
      },
      {
        id: 'sug3',
        type: 'procedure',
        title: '补充证据',
        description: '建议申请人提供变更需求的书面证据',
        applicablePhase: ['investigation'],
        confidence: 0.9
      }
    ]);
  }, []);

  // 标记关键点
  const markAsKeyPoint = (entryId: string, category: KeyPoint['category']) => {
    const entry = entries.find(e => e.id === entryId);
    if (!entry) return;

    const keyPoint: KeyPoint = {
      id: `kp-${Date.now()}`,
      title: `${entry.speaker}的关键陈述`,
      content: entry.content,
      speaker: entry.speaker,
      time: entry.time,
      category,
      importance: entry.importance || 'medium',
      tags: entry.tags || []
    };

    setKeyPoints(prev => [...prev, keyPoint]);

    // 更新原记录
    setEntries(prev => prev.map(e =>
      e.id === entryId
        ? { ...e, isKeyPoint: true, tags: [...(e.tags || []), category] }
        : e
    ));
  };

  // 搜索过滤
  const filteredEntries = entries.filter(entry => {
    const matchesSearch = !searchQuery ||
      entry.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.speaker.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = selectedCategory === 'all' ||
      (selectedCategory === 'keypoints' && entry.isKeyPoint) ||
      (entry.tags && entry.tags.includes(selectedCategory));

    return matchesSearch && matchesCategory;
  });

  function addMock() {
    const now = new Date();
    setEntries((prev) => [
      ...prev,
      { id: `t-${now.getTime()}`, speaker: '系统', content: '（AI 正在转写……）', time: now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) },
    ]);
  }

  function submitCorrection() {
    if (!correctionFor || !correctionText.trim()) return;
    // 原型占位：提交勘误
    setEntries((prev) => [
      ...prev,
      { id: `c-${Date.now()}`, speaker: '勘误', content: `针对 ${correctionFor} 的勘误：${correctionText}`, time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) },
    ]);
    setCorrectionFor(null);
    setCorrectionText('');
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[90vw] sm:w-[600px] bg-gray-900 text-white border-gray-700">
        <SheetHeader>
          <SheetTitle className="flex items-center">
            <Bot className="h-4 w-4 mr-2 text-orange-400" /> AI 庭审记录系统
          </SheetTitle>
        </SheetHeader>

        <div className="h-full flex flex-col pt-4">
          <Tabs defaultValue="transcript" className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-3 bg-gray-800">
              <TabsTrigger value="transcript">实时转录</TabsTrigger>
              <TabsTrigger value="keypoints">关键点</TabsTrigger>
              <TabsTrigger value="suggestions">协商建议</TabsTrigger>
            </TabsList>

            {/* 实时转录标签页 */}
            <TabsContent value="transcript" className="flex-1 flex flex-col mt-4">
              {/* 搜索和过滤 */}
              <div className="space-y-2 mb-4">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="搜索转录内容..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 bg-gray-800 border-gray-600"
                    />
                  </div>
                  <Button size="sm" variant="outline" onClick={() => {}}>
                    <Download className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex gap-2 text-xs">
                  {['all', 'keypoints', '程序', '争议焦点', '证据'].map(category => (
                    <Button
                      key={category}
                      size="sm"
                      variant={selectedCategory === category ? "default" : "outline"}
                      onClick={() => setSelectedCategory(category)}
                      className="h-6 px-2"
                    >
                      {category === 'all' ? '全部' : category === 'keypoints' ? '关键点' : category}
                    </Button>
                  ))}
                </div>
              </div>

              {/* 状态指示 */}
              <div className="flex items-center justify-between bg-gray-800 border border-gray-700 rounded-lg p-2 mb-3">
                <div className="text-xs text-gray-400">AI语音转文字 · 实时记录</div>
                <Badge className="bg-red-600">转写中</Badge>
              </div>

              {/* 转录内容 */}
              <div ref={viewRef} className="flex-1 overflow-y-auto space-y-2 pr-1">
                {filteredEntries.map((e) => (
                  <div key={e.id} className={`p-3 rounded-lg border ${
                    e.isKeyPoint
                      ? 'bg-orange-900/20 border-orange-500/30'
                      : 'bg-gray-800 border-gray-700'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-xs text-gray-400">{e.speaker} · {e.time}</div>
                      {e.isKeyPoint && (
                        <Badge variant="secondary" className="bg-orange-500/20 text-orange-300">
                          <Star className="w-3 h-3 mr-1" />
                          关键点
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm mb-2">{e.content}</div>

                    {/* 标签 */}
                    {e.tags && e.tags.length > 0 && (
                      <div className="flex gap-1 mb-2">
                        {e.tags.map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            <Tag className="w-3 h-3 mr-1" />
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* 操作按钮 */}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 px-2 bg-gray-700 border-gray-600 text-white"
                        onClick={() => setCorrectionFor(e.id)}
                      >
                        <Edit className="w-3 h-3 mr-1" />
                        勘误
                      </Button>

                      {!e.isKeyPoint && (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline" className="h-6 px-2 bg-gray-700 border-gray-600 text-white">
                              <Bookmark className="w-3 h-3 mr-1" />
                              标记
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="bg-gray-800 border-gray-700">
                            <DialogHeader>
                              <DialogTitle>标记为关键点</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <p className="text-sm text-gray-300">选择关键点类型：</p>
                              <div className="grid grid-cols-2 gap-2">
                                {[
                                  { key: 'fact', label: '事实认定' },
                                  { key: 'law', label: '法律适用' },
                                  { key: 'evidence', label: '证据展示' },
                                  { key: 'procedure', label: '程序事项' },
                                  { key: 'agreement', label: '当事人合意' }
                                ].map(({ key, label }) => (
                                  <Button
                                    key={key}
                                    variant="outline"
                                    onClick={() => markAsKeyPoint(e.id, key as KeyPoint['category'])}
                                    className="justify-start"
                                  >
                                    {label}
                                  </Button>
                                ))}
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-3 flex gap-2">
                <Button size="sm" onClick={addMock} className="bg-orange-600 hover:bg-orange-700">
                  模拟新增
                </Button>
              </div>
            </TabsContent>

            {/* 关键点标签页 */}
            <TabsContent value="keypoints" className="flex-1 flex flex-col mt-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium">已标记关键点 ({keyPoints.length})</h3>
                <Button size="sm" variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  导出
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3">
                {keyPoints.map((kp) => (
                  <div key={kp.id} className="p-3 bg-gray-800 border border-gray-700 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="secondary" className={`
                        ${kp.importance === 'high' ? 'bg-red-500/20 text-red-300' :
                          kp.importance === 'medium' ? 'bg-yellow-500/20 text-yellow-300' :
                          'bg-blue-500/20 text-blue-300'}
                      `}>
                        {kp.importance === 'high' ? '高' : kp.importance === 'medium' ? '中' : '低'}重要
                      </Badge>
                      <span className="text-xs text-gray-400">{kp.time}</span>
                    </div>

                    <h4 className="font-medium text-sm mb-1">{kp.title}</h4>
                    <p className="text-sm text-gray-300 mb-2">{kp.content}</p>

                    <div className="flex items-center justify-between">
                      <div className="flex gap-1">
                        <Badge variant="outline" className="text-xs">
                          {kp.category === 'fact' ? '事实' :
                           kp.category === 'law' ? '法律' :
                           kp.category === 'evidence' ? '证据' :
                           kp.category === 'procedure' ? '程序' : '合意'}
                        </Badge>
                        {kp.tags.map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      <span className="text-xs text-gray-500">{kp.speaker}</span>
                    </div>
                  </div>
                ))}

                {keyPoints.length === 0 && (
                  <div className="text-center text-gray-500 py-8">
                    <Bookmark className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>暂无标记的关键点</p>
                    <p className="text-xs mt-1">在转录内容中点击“标记”按钮添加关键点</p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* 协商建议标签页 */}
            <TabsContent value="suggestions" className="flex-1 flex flex-col mt-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium">AI协商建议</h3>
                <Badge variant="outline" className="text-xs">
                  <Bot className="w-3 h-3 mr-1" />
                  智能分析
                </Badge>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3">
                {suggestions.map((suggestion) => (
                  <div key={suggestion.id} className="p-3 bg-gray-800 border border-gray-700 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="secondary" className={`
                        ${suggestion.type === 'mediation' ? 'bg-green-500/20 text-green-300' :
                          suggestion.type === 'settlement' ? 'bg-blue-500/20 text-blue-300' :
                          'bg-purple-500/20 text-purple-300'}
                      `}>
                        {suggestion.type === 'mediation' ? '调解建议' :
                         suggestion.type === 'settlement' ? '和解方案' : '程序建议'}
                      </Badge>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-gray-400">置信度</span>
                        <Badge variant="outline" className="text-xs">
                          {Math.round(suggestion.confidence * 100)}%
                        </Badge>
                      </div>
                    </div>

                    <h4 className="font-medium text-sm mb-1">{suggestion.title}</h4>
                    <p className="text-sm text-gray-300 mb-2">{suggestion.description}</p>

                    <div className="flex items-center justify-between">
                      <div className="text-xs text-gray-500">
                        适用阶段: {suggestion.applicablePhase.join(', ')}
                      </div>
                      <Button size="sm" variant="outline" className="h-6 px-2">
                        <MessageSquare className="w-3 h-3 mr-1" />
                        采纳
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>

          {correctionFor ? (
            <div className="mt-3 p-2 bg-gray-800 rounded-lg">
              <div className="text-xs text-gray-400 mb-1">对记录 {correctionFor} 提交勘误：</div>
              <Textarea value={correctionText} onChange={(e) => setCorrectionText(e.target.value)} placeholder="请输入勘误内容……" className="bg-gray-800 border-gray-700 text-white" />
              <div className="flex justify-end mt-2 space-x-2">
                <Button size="sm" variant="outline" className="bg-gray-700 border-gray-600 text-white" onClick={() => setCorrectionFor(null)}>取消</Button>
                <Button size="sm" className="btn-primary" onClick={submitCorrection}><CheckCircle2 className="h-4 w-4 mr-1" /> 提交</Button>
              </div>
            </div>
          ) : (
            <div className="flex justify-between items-center mt-3">
              <div className="text-xs text-gray-400">勘误说明将发送给仲裁庭审核</div>
              <Button size="sm" variant="outline" className="bg-gray-700 border-gray-600 text-white" onClick={addMock}>模拟更新</Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
