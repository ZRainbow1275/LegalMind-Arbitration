// src/app/(private)/hearings/[id]/waiting/page.tsx
'use client';

// 等候室页面：开庭前15分钟，完成设备检测、身份核验、庭审须知确认、材料预览与私聊
// 支持仲裁庭审和调解庭审两种类型，作为进入庭审的统一前置环节
// 说明：本页为高保真原型，使用本地 mock 与占位交互，不接入真实设备或服务。

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { HearingAccessGuard } from '@/components/hearing/hearing-access-guard';
import { useRole } from '@/components/layout/role-switcher';
import { getDemoHearingConfig } from '@/lib/demo-hearing-config';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Camera,
  Mic,
  Wifi,
  CheckCircle2,
  AlertTriangle,
  UserCheck2,
  ShieldCheck,
  FileText,
  MessageSquare,
  Send,
  ArrowLeft,
  Play,
} from 'lucide-react';

interface EvidenceItem {
  id: string;
  name: string;
  type: 'pdf' | 'image' | 'video' | 'other';
  submittedAt: string;
}

interface ChatMessage {
  id: string;
  from: 'me' | 'agent' | 'secretary';
  content: string;
  time: string;
}

export default function HearingWaitingPage() {
  const params = useParams<{ id: string }>();
  const hearingId = params?.id ?? 'hearing-001';
  const { currentRole } = useRole();

  // 获取演示庭审配置
  const demoConfig = getDemoHearingConfig(hearingId);

  // 检测庭审类型（仲裁或调解）
  const hearingType = demoConfig?.type || (hearingId.includes('mediation') ? 'mediation' : 'arbitration');
  const isMediation = hearingType === 'mediation';

  // 根据庭审类型设置标题和描述
  const hearingTitle = isMediation ? '调解庭审' : '仲裁庭审';
  const hearingDescription = isMediation
    ? '即将开始在线调解，请完成准备工作'
    : '即将开始仲裁庭审，请完成准备工作';

  // 步骤状态
  const [cameraOk, setCameraOk] = useState<boolean>(false);
  const [micOk, setMicOk] = useState<boolean>(false);
  const [networkOk, setNetworkOk] = useState<boolean>(false);
  const [identityVerified, setIdentityVerified] = useState<boolean>(false);
  const [rulesConfirmed, setRulesConfirmed] = useState<boolean>(false);

  // 私聊
  const [activeChannel, setActiveChannel] = useState<'agent' | 'secretary'>('agent');
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'm1',
      from: 'secretary',
      content: '欢迎进入等候室，请按指引完成设备检测与身份核验。',
      time: '09:14',
    },
    {
      id: 'm2',
      from: 'agent',
      content: '我已在会议室，稍后就开庭。若有问题随时在这里说。',
      time: '09:15',
    },
  ]);

  // 材料预览（只读）
  const evidenceList: EvidenceItem[] = useMemo(
    () => [
      { id: 'e1', name: '合同正文.pdf', type: 'pdf', submittedAt: '2025-01-10' },
      { id: 'e2', name: '对账单扫描件.png', type: 'image', submittedAt: '2025-01-11' },
      { id: 'e3', name: '付款记录.mp4', type: 'video', submittedAt: '2025-01-12' },
      { id: 'e4', name: '往来邮件汇总.pdf', type: 'pdf', submittedAt: '2025-01-12' },
    ],
    []
  );

  // 模拟自动检测流程（原型演示）
  useEffect(() => {
    const t1 = setTimeout(() => setCameraOk(true), 600);
    const t2 = setTimeout(() => setMicOk(true), 1000);
    const t3 = setTimeout(() => setNetworkOk(true), 1400);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  const allReady = cameraOk && micOk && networkOk && identityVerified && rulesConfirmed;

  function statusBadge(ok: boolean) {
    return ok ? (
      <Badge className="bg-green-600">已通过</Badge>
    ) : (
      <Badge className="bg-yellow-500">检测中</Badge>
    );
  }

  function handleSend() {
    if (!chatInput.trim()) return;
    const now = new Date();
    const msg: ChatMessage = {
      id: `m-${now.getTime()}`,
      from: 'me',
      content: chatInput.trim(),
      time: now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, msg]);
    setChatInput('');
  }

  return (
    <HearingAccessGuard
      hearingId={hearingId}
      caseId={demoConfig?.caseId || "case-001"}
      hearingCode={demoConfig?.hearingCode || "123456"}
      startTime={demoConfig?.startTime ? new Date(demoConfig.startTime).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : "10:00"}
      requiresVerification={true}
    >
      <div className="min-h-screen bg-gray-900 text-white">
      {/* 顶栏 */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link href={`/hearings/${hearingId}`} className="text-gray-300 hover:text-white flex items-center">
              <ArrowLeft className="h-4 w-4 mr-2" /> 返回{hearingTitle}详情
            </Link>
            <Separator orientation="vertical" className="h-6 bg-gray-600" />
            <span className="text-sm text-gray-300">等候室 · {hearingDescription}</span>
            {demoConfig?.isDemo && (
              <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-800">
                演示模式
              </Badge>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <Badge className={isMediation ? "bg-green-600" : "bg-orange-600"}>
              {isMediation ? '调解前' : '开庭前'}
            </Badge>
            <Badge className="bg-blue-600">未入庭</Badge>
            {demoConfig && (
              <span className="text-sm text-gray-300">
                案件: {demoConfig.caseNumber}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-12 gap-4 p-4 h-[calc(100vh-72px)]">
        {/* 左侧主面板（步骤卡片） */}
        <div className="col-span-12 lg:col-span-8 flex flex-col space-y-4 overflow-y-auto pr-1">
          {/* 设备检测 */}
          <Card className="bg-gray-800 border-gray-700 animate-fade-in">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <ShieldCheck className="h-5 w-5 text-orange-400" />
                <span>设备检测</span>
              </CardTitle>
              <CardDescription className="text-gray-300">
                自动检测摄像头、麦克风与网络状况，确保您可以顺利参加在线庭审。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-3 bg-gray-700 rounded-lg flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Camera className="h-4 w-4 text-gray-300" />
                    <span className="text-sm">摄像头</span>
                  </div>
                  {statusBadge(cameraOk)}
                </div>
                <div className="p-3 bg-gray-700 rounded-lg flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Mic className="h-4 w-4 text-gray-300" />
                    <span className="text-sm">麦克风</span>
                  </div>
                  {statusBadge(micOk)}
                </div>
                <div className="p-3 bg-gray-700 rounded-lg flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Wifi className="h-4 w-4 text-gray-300" />
                    <span className="text-sm">网络</span>
                  </div>
                  {statusBadge(networkOk)}
                </div>
              </div>
              <div className="text-xs text-gray-400">
                如果检测未通过，请检查系统权限或切换设备。稍后可在直播庭审页面中再次测试。
              </div>
            </CardContent>
          </Card>

          {/* 身份核验 */}
          <Card className="bg-gray-800 border-gray-700 animate-fade-in" style={{ animationDelay: '0.05s' }}>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <UserCheck2 className="h-5 w-5 text-orange-400" />
                <span>身份核验</span>
              </CardTitle>
              <CardDescription className="text-gray-300">
                通过人脸识别与实名认证信息比对，确认参与人身份。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-gray-700 p-4 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center font-bold">我</div>
                  <div>
                    <div className="text-sm">张某（申请人）</div>
                    <div className="text-xs text-gray-400">身份证尾号 1234</div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {identityVerified ? (
                    <Badge className="bg-green-600 flex items-center"><CheckCircle2 className="h-3 w-3 mr-1" /> 已通过</Badge>
                  ) : (
                    <Button size="sm" className="btn-primary" onClick={() => setIdentityVerified(true)}>
                      一键核验
                    </Button>
                  )}
                </div>
              </div>
              <div className="text-xs text-gray-400">原型占位：实际场景下将调用 OCR/活体检测/比对服务。</div>
            </CardContent>
          </Card>

          {/* 庭审须知 */}
          <Card className="bg-gray-800 border-gray-700 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className={`h-5 w-5 ${isMediation ? 'text-green-400' : 'text-orange-400'}`} />
                <span>{isMediation ? '调解须知' : '庭审须知'}</span>
              </CardTitle>
              <CardDescription className="text-gray-300">
                请认真阅读并确认遵守{isMediation ? '调解纪律' : '庭审纪律'}与注意事项。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600">
                    阅读{isMediation ? '调解' : '庭审'}须知
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl bg-gray-800 text-white border-gray-700">
                  <DialogHeader>
                    <DialogTitle>在线{isMediation ? '调解' : '庭审'}须知</DialogTitle>
                  </DialogHeader>
                  <div className="text-sm text-gray-200 space-y-3 max-h-[50vh] overflow-y-auto">
                    <p>1. 保持网络稳定与环境安静，避免随意中断。</p>
                    {isMediation ? (
                      <>
                        <p>2. 遵循调解员指导，积极参与调解过程，诚信协商。</p>
                        <p>3. 尊重对方当事人，保持理性沟通，避免情绪化表达。</p>
                        <p>4. 调解过程保密，不得向外泄露调解内容和过程。</p>
                        <p>5. 如达成调解协议，应认真履行协议内容。</p>
                      </>
                    ) : (
                      <>
                        <p>2. 遵循主持仲裁员指令，未经许可请勿发言。</p>
                        <p>3. 禁止私自录音录像与传播，尊重隐私与合规要求。</p>
                        <p>4. 证据展示须经许可，并按流程进行标注与说明。</p>
                        <p>5. 违反纪律可能导致警告或移除等措施。</p>
                      </>
                    )}
                  </div>
                  <div className="flex justify-end">
                    <Button className="btn-primary" onClick={() => setRulesConfirmed(true)}>我已阅读并同意</Button>
                  </div>
                </DialogContent>
              </Dialog>
              <div className="text-sm">当前状态：{rulesConfirmed ? <span className="text-green-400">已同意</span> : <span className="text-yellow-400">待确认</span>}</div>
            </CardContent>
          </Card>

          {/* 材料预览（只读） */}
          <Card className="bg-gray-800 border-gray-700 animate-fade-in" style={{ animationDelay: '0.15s' }}>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-orange-400" />
                <span>材料预览</span>
              </CardTitle>
              <CardDescription className="text-gray-300">
                您已提交的证据材料清单（只读）。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                {evidenceList.map((e) => (
                  <div key={e.id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-md bg-gradient-to-r from-gray-500 to-gray-600 flex items-center justify-center text-xs">
                        {e.type === 'pdf' ? 'PDF' : e.type === 'image' ? 'IMG' : e.type === 'video' ? 'VID' : 'DOC'}
                      </div>
                      <div>
                        <div className="text-sm">{e.name}</div>
                        <div className="text-xs text-gray-400">提交时间：{e.submittedAt}</div>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" className="bg-gray-600 border-gray-500 text-white hover:bg-gray-500">预览</Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 完成并进入按钮 */}
          <div className="sticky bottom-0 bg-gray-900 pt-2 pb-4">
            <div className="p-3 bg-gray-800 border border-gray-700 rounded-lg flex items-center justify-between">
              <div className="text-sm text-gray-300">
                完成条件：设备检测、身份核验、阅读须知 → 全部完成后可进入{isMediation ? '调解' : '庭审'}。
              </div>
              <div className="flex items-center space-x-2">
                {allReady ? (
                  <Badge className="bg-green-600">准备就绪</Badge>
                ) : (
                  <Badge className="bg-yellow-500">未完成</Badge>
                )}
                <Link href={`/hearings/${hearingId}/live`}>
                  <Button disabled={!allReady} className={`btn-ripple shadow-brand flex items-center ${
                    isMediation ? 'bg-green-600 hover:bg-green-700' : 'btn-primary'
                  }`} onClick={()=>{
                    try { sessionStorage.setItem(`witness_waiting_${hearingId}`, JSON.stringify(['w1-证人甲','w2-证人乙'])); } catch {}
                  }}>
                    <Play className="h-4 w-4 mr-2" /> 进入{isMediation ? '调解' : '庭审'}
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* 右侧：私聊与帮助 */}
        <div className="col-span-12 lg:col-span-4 flex flex-col h-full">
          <Card className="bg-gray-800 border-gray-700 h-full flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center"><MessageSquare className="h-5 w-5 mr-2 text-orange-400" /> 私聊</span>
                <div className="flex items-center bg-gray-700 rounded-md p-1">
                  <Button size="sm" variant={activeChannel === 'agent' ? 'default' : 'ghost'} className={activeChannel === 'agent' ? 'btn-primary h-7 px-2' : 'h-7 px-2'} onClick={() => setActiveChannel('agent')}>代理人</Button>
                  <Button size="sm" variant={activeChannel === 'secretary' ? 'default' : 'ghost'} className={activeChannel === 'secretary' ? 'btn-primary h-7 px-2' : 'h-7 px-2'} onClick={() => setActiveChannel('secretary')}>书记员</Button>
                </div>
              </CardTitle>
              <CardDescription className="text-gray-300">与本方代理或仲裁庭书记员沟通程序性问题。</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {messages.map((m) => (
                  <div key={m.id} className={`max-w-[80%] p-2 rounded-lg text-sm ${m.from === 'me' ? 'ml-auto bg-orange-600' : 'bg-gray-700'}`}>
                    <div className="opacity-80 text-xs mb-1">
                      {m.from === 'me' ? '我' : m.from === 'agent' ? '代理人' : '书记员'} · {m.time}
                    </div>
                    <div>{m.content}</div>
                  </div>
                ))}
              </div>
              <div className="pt-3">
                <div className="flex items-center space-x-2">
                  <Input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder={`发消息给${activeChannel === 'agent' ? '代理人' : '书记员'}...`}
                    className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSend();
                    }}
                  />
                  <Button onClick={handleSend} className="btn-primary" size="sm">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          <div className="text-xs text-gray-400 mt-2">
            注：原型仅展示交互流程与视觉语言，真实环境将启用加密通道与消息审计。
          </div>
        </div>
      </div>
    </div>
    </HearingAccessGuard>
  );
}

