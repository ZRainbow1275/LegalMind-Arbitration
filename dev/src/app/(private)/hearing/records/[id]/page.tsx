// dev/src/app/(private)/hearing/records/[id]/page.tsx
'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useHearingRecordsStore } from '@/store/hearing-records';
import { useRole } from '@/components/layout/role-switcher';
import {
  ArrowLeft,
  FileText,
  Calendar,
  Users,
  Star,
  Plus,
  MessageSquare,
  Gavel,
  AlertTriangle,
  CheckCircle,
  Clock,
  Edit,
  Trash2,
  Flag,
  Target,
  Scale,
  BookOpen,
  Eye,
  X
} from 'lucide-react';

export default function HearingRecordDetailPage(){
  const params = useParams();
  const id = params.id as string;
  const rec = useHearingRecordsStore(s=>s.getById(id));
  const { currentRole } = useRole();

  // 状态管理
  const [activeTab, setActiveTab] = useState('overview');
  const [showKeyPointDialog, setShowKeyPointDialog] = useState(false);
  const [showNegotiationDialog, setShowNegotiationDialog] = useState(false);
  const [showJudgmentDialog, setShowJudgmentDialog] = useState(false);

  // 关键点记录状态
  const [keyPointData, setKeyPointData] = useState({
    type: 'evidence',
    title: '',
    description: '',
    timestamp: '',
    participants: [],
    importance: 'normal'
  });

  // 协商记录状态
  const [negotiationData, setNegotiationData] = useState({
    topic: '',
    positions: {
      applicant: '',
      respondent: ''
    },
    progress: '',
    outcome: 'pending'
  });

  // 裁判辅助状态
  const [judgmentData, setJudgmentData] = useState({
    issue: '',
    facts: '',
    law: '',
    reasoning: '',
    conclusion: ''
  });

  const isArbitrator = currentRole === 'arbitrator';
  const isMediatorRole = currentRole === 'mediator';
  const canManageRecord = isArbitrator || isMediatorRole;

  if (!rec) {
    return (
      <div className="p-6">
        <Link href="/hearing/records"><Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1"/>返回</Button></Link>
        <div className="mt-6 text-muted-foreground">未找到该庭审记录</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/hearing/records"><Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1"/>返回</Button></Link>
          <h1 className="text-2xl font-bold">{rec.title}</h1>
          <Badge variant="secondary">{rec.status}</Badge>
        </div>

        {canManageRecord && (
          <div className="flex items-center gap-2">
            <Dialog open={showKeyPointDialog} onOpenChange={setShowKeyPointDialog}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-1"/>
                  添加关键点
                </Button>
              </DialogTrigger>
            </Dialog>

            <Dialog open={showNegotiationDialog} onOpenChange={setShowNegotiationDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <MessageSquare className="w-4 h-4 mr-1"/>
                  协商记录
                </Button>
              </DialogTrigger>
            </Dialog>

            {isArbitrator && (
              <Dialog open={showJudgmentDialog} onOpenChange={setShowJudgmentDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Gavel className="w-4 h-4 mr-1"/>
                    裁判辅助
                  </Button>
                </DialogTrigger>
              </Dialog>
            )}
          </div>
        )}
      </div>

      {/* 概要信息卡片 */}
      <Card>
        <CardHeader>
          <CardTitle>庭审概要</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4"/>
              <span>{new Date(rec.date).toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4"/>
              <span>{rec.participants} 人参与</span>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4"/>
              <span>证据 {rec.evidences.length} 项</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4"/>
              <span>要点 {rec.summary?.keyPoints ?? 0} 个</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 主要内容区域 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">概览</TabsTrigger>
          <TabsTrigger value="keypoints">关键点</TabsTrigger>
          <TabsTrigger value="evidence">证据</TabsTrigger>
          <TabsTrigger value="transcripts">记录</TabsTrigger>
          <TabsTrigger value="analysis">分析</TabsTrigger>
        </TabsList>

        {/* 概览标签页 */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-500" />
                  庭审进程
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm">庭审开始</span>
                    <span className="text-xs text-gray-500 ml-auto">14:00</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm">证据展示</span>
                    <span className="text-xs text-gray-500 ml-auto">14:15</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-sm">双方辩论</span>
                    <span className="text-xs text-gray-500 ml-auto">14:45</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                    <span className="text-sm text-gray-500">庭审结束</span>
                    <span className="text-xs text-gray-500 ml-auto">待定</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-orange-500" />
                  争议焦点
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="p-2 bg-orange-50 rounded border-l-4 border-orange-500">
                    <p className="text-sm font-medium">合同履行义务</p>
                    <p className="text-xs text-gray-600">双方对合同第三条履行义务存在争议</p>
                  </div>
                  <div className="p-2 bg-blue-50 rounded border-l-4 border-blue-500">
                    <p className="text-sm font-medium">损失赔偿范围</p>
                    <p className="text-xs text-gray-600">关于实际损失和预期利益的认定</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 关键点标签页 */}
        <TabsContent value="keypoints" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flag className="h-5 w-5 text-red-500" />
                  关键点记录
                </div>
                {canManageRecord && (
                  <Button size="sm" onClick={() => setShowKeyPointDialog(true)}>
                    <Plus className="w-4 h-4 mr-1"/>
                    添加关键点
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* 模拟关键点数据 */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className="bg-red-100 text-red-800">重要证据</Badge>
                        <span className="text-xs text-gray-500">14:25</span>
                      </div>
                      <h4 className="font-medium mb-1">合同原件展示</h4>
                      <p className="text-sm text-gray-600">申请人展示了双方签署的原始合同，明确了第三条款的具体内容和履行要求。</p>
                    </div>
                    {canManageRecord && (
                      <div className="flex items-center gap-1 ml-4">
                        <Button variant="ghost" size="sm">
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className="bg-blue-100 text-blue-800">关键陈述</Badge>
                        <span className="text-xs text-gray-500">14:40</span>
                      </div>
                      <h4 className="font-medium mb-1">被申请人抗辩</h4>
                      <p className="text-sm text-gray-600">被申请人提出不可抗力抗辩，声称因疫情影响无法按期履行合同义务。</p>
                    </div>
                    {canManageRecord && (
                      <div className="flex items-center gap-1 ml-4">
                        <Button variant="ghost" size="sm">
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 证据标签页 */}
        <TabsContent value="evidence" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-green-500" />
                证据材料
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {rec.evidences.length===0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>暂无证据材料</p>
                </div>
              ) : rec.evidences.map(e=> (
                <div key={e.id} className="p-3 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium">{e.name}</div>
                      {e.description && <div className="text-sm text-gray-600 mt-1">{e.description}</div>}
                    </div>
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI记录标签页 */}
        <TabsContent value="transcripts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-purple-500" />
                AI 庭审记录
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {rec.transcripts.length===0 ? (
                <div className="text-center py-8 text-gray-500">
                  <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>暂无AI记录</p>
                </div>
              ) : rec.transcripts.map(t=> (
                <div key={t.id} className="p-3 border rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="text-xs text-gray-500 mb-1">{new Date(t.ts).toLocaleString()}</div>
                      <div className="text-sm">{t.text}</div>
                      {t.isKey && <Badge className="mt-2 bg-yellow-100 text-yellow-800">关键点</Badge>}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 分析标签页 */}
        <TabsContent value="analysis" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="h-5 w-5 text-indigo-500" />
                庭审分析
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <h4 className="font-medium">双方观点对比</h4>
                  <div className="space-y-3">
                    <div className="p-3 bg-blue-50 rounded border-l-4 border-blue-500">
                      <p className="text-sm font-medium text-blue-800">申请人观点</p>
                      <p className="text-xs text-blue-600 mt-1">被申请人违约在先，应承担违约责任并赔偿损失</p>
                    </div>
                    <div className="p-3 bg-orange-50 rounded border-l-4 border-orange-500">
                      <p className="text-sm font-medium text-orange-800">被申请人观点</p>
                      <p className="text-xs text-orange-600 mt-1">因不可抗力导致无法履约，不应承担违约责任</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">争议要点</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm">合同履行义务认定</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm">不可抗力事由认定</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm">损失范围确定</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 添加关键点对话框 */}
      <Dialog open={showKeyPointDialog} onOpenChange={setShowKeyPointDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>添加关键点</DialogTitle>
            <DialogDescription>
              记录庭审过程中的重要事件、证据或陈述
            </DialogDescription>
          </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="keypoint-type">类型</Label>
              <select
                id="keypoint-type"
                className="w-full p-2 border rounded"
                value={keyPointData.type}
                onChange={(e) => setKeyPointData(prev => ({ ...prev, type: e.target.value }))}
              >
                <option value="evidence">重要证据</option>
                <option value="statement">关键陈述</option>
                <option value="objection">异议</option>
                <option value="ruling">裁决要点</option>
                <option value="procedure">程序事项</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="keypoint-importance">重要程度</Label>
              <select
                id="keypoint-importance"
                className="w-full p-2 border rounded"
                value={keyPointData.importance}
                onChange={(e) => setKeyPointData(prev => ({ ...prev, importance: e.target.value }))}
              >
                <option value="low">一般</option>
                <option value="normal">重要</option>
                <option value="high">非常重要</option>
                <option value="critical">关键</option>
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="keypoint-title">标题</Label>
            <Input
              id="keypoint-title"
              placeholder="请输入关键点标题"
              value={keyPointData.title}
              onChange={(e) => setKeyPointData(prev => ({ ...prev, title: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="keypoint-description">详细描述</Label>
            <Textarea
              id="keypoint-description"
              placeholder="请详细描述这个关键点..."
              rows={4}
              value={keyPointData.description}
              onChange={(e) => setKeyPointData(prev => ({ ...prev, description: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="keypoint-timestamp">时间点</Label>
            <Input
              id="keypoint-timestamp"
              type="time"
              value={keyPointData.timestamp}
              onChange={(e) => setKeyPointData(prev => ({ ...prev, timestamp: e.target.value }))}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowKeyPointDialog(false)}>
            取消
          </Button>
          <Button onClick={() => {
            alert('关键点已添加');
            setShowKeyPointDialog(false);
          }}>
            添加关键点
          </Button>
        </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 协商记录对话框 */}
      <Dialog open={showNegotiationDialog} onOpenChange={setShowNegotiationDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>协商记录</DialogTitle>
            <DialogDescription>
              记录双方协商过程和立场变化
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="negotiation-topic">协商议题</Label>
              <Input
                id="negotiation-topic"
                placeholder="请输入协商的具体议题"
                value={negotiationData.topic}
                onChange={(e) => setNegotiationData(prev => ({ ...prev, topic: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="applicant-position">申请人立场</Label>
                <Textarea
                  id="applicant-position"
                  placeholder="申请人的立场和要求..."
                  rows={3}
                  value={negotiationData.positions.applicant}
                  onChange={(e) => setNegotiationData(prev => ({
                    ...prev,
                    positions: { ...prev.positions, applicant: e.target.value }
                  }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="respondent-position">被申请人立场</Label>
                <Textarea
                  id="respondent-position"
                  placeholder="被申请人的立场和回应..."
                  rows={3}
                  value={negotiationData.positions.respondent}
                  onChange={(e) => setNegotiationData(prev => ({
                    ...prev,
                    positions: { ...prev.positions, respondent: e.target.value }
                  }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="negotiation-progress">协商进展</Label>
              <Textarea
                id="negotiation-progress"
                placeholder="记录协商过程中的重要进展..."
                rows={3}
                value={negotiationData.progress}
                onChange={(e) => setNegotiationData(prev => ({ ...prev, progress: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="negotiation-outcome">协商结果</Label>
              <select
                id="negotiation-outcome"
                className="w-full p-2 border rounded"
                value={negotiationData.outcome}
                onChange={(e) => setNegotiationData(prev => ({ ...prev, outcome: e.target.value }))}
              >
                <option value="pending">协商中</option>
                <option value="progress">有进展</option>
                <option value="agreement">达成一致</option>
                <option value="deadlock">陷入僵局</option>
                <option value="failed">协商失败</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNegotiationDialog(false)}>
              取消
            </Button>
            <Button onClick={() => {
              alert('协商记录已保存');
              setShowNegotiationDialog(false);
            }}>
              保存记录
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 裁判辅助对话框 */}
      <Dialog open={showJudgmentDialog} onOpenChange={setShowJudgmentDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>裁判辅助工具</DialogTitle>
            <DialogDescription>
              协助仲裁员分析案件事实、适用法律并形成裁决思路
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="judgment-issue">争议焦点</Label>
              <Textarea
                id="judgment-issue"
                placeholder="明确本案的主要争议焦点..."
                rows={2}
                value={judgmentData.issue}
                onChange={(e) => setJudgmentData(prev => ({ ...prev, issue: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="judgment-facts">事实认定</Label>
              <Textarea
                id="judgment-facts"
                placeholder="基于证据材料认定的案件事实..."
                rows={4}
                value={judgmentData.facts}
                onChange={(e) => setJudgmentData(prev => ({ ...prev, facts: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="judgment-law">法律适用</Label>
              <Textarea
                id="judgment-law"
                placeholder="适用的法律条文和法律原则..."
                rows={3}
                value={judgmentData.law}
                onChange={(e) => setJudgmentData(prev => ({ ...prev, law: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="judgment-reasoning">推理过程</Label>
              <Textarea
                id="judgment-reasoning"
                placeholder="从事实到结论的推理过程..."
                rows={4}
                value={judgmentData.reasoning}
                onChange={(e) => setJudgmentData(prev => ({ ...prev, reasoning: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="judgment-conclusion">裁决结论</Label>
              <Textarea
                id="judgment-conclusion"
                placeholder="初步的裁决结论和处理意见..."
                rows={3}
                value={judgmentData.conclusion}
                onChange={(e) => setJudgmentData(prev => ({ ...prev, conclusion: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowJudgmentDialog(false)}>
              取消
            </Button>
            <Button onClick={() => {
              alert('裁判辅助记录已保存');
              setShowJudgmentDialog(false);
            }}>
              保存分析
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

