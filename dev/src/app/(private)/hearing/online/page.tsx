// dev/src/app/(private)/hearing/online/page.tsx
'use client';

import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTribunalStore } from '@/store/tribunal';
import { mockCases } from '@/lib/mock-data';
import { getDemoHearingConfig, verifyDemoHearingCode } from '@/lib/demo-hearing-config';
import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useHearingStore, type EvidenceItem, type TranscriptItem } from '@/store/hearing';
import { useHearingRecordsStore } from '@/store/hearing-records';
import { IdentityVerificationModal } from '@/components/hearing/identity-verification-modal';
import { DeviceSettingsModal } from '@/components/hearing/device-settings-modal';
import { useRole } from '@/components/layout/role-switcher';
import { Video, Mic, MicOff, MonitorUp, ScreenShare, PhoneOff, Hand, Files, Shield, Settings, Users, AlertTriangle, Lock, Gavel, Scale, CheckCircle, MessageSquare, User, X } from 'lucide-react';

const EMPTY_EVIDENCES: EvidenceItem[] = [];
const EMPTY_TRANSCRIPTS: TranscriptItem[] = [];


export default function OnlineHearingPage(){
  const { currentRole } = useRole();
  const router = useRouter();

  const [muted, setMuted] = useState(false);
  const [cameraOn, setCameraOn] = useState(true);
  const [handRaised, setHandRaised] = useState(false);
  const [showIdentityModal, setShowIdentityModal] = useState(false);
  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [isIdentityVerified, setIsIdentityVerified] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [hearingType, setHearingType] = useState<'arbitration' | 'mediation'>('arbitration');
  const [hearingCode, setHearingCode] = useState('');
  const [showCodeEntry, setShowCodeEntry] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [hearingStarted, setHearingStarted] = useState(false);
  const [showMobileTools, setShowMobileTools] = useState(false);

  // 读取 URL 与本次庭审关联数据
  const searchParams = useSearchParams();
  const caseId = searchParams.get('caseId') || undefined;
  const mediationId = searchParams.get('mediationId') || undefined;
  const evidences = useHearingStore((s) => (caseId ? (s.evidencesByCase[caseId] ?? EMPTY_EVIDENCES) : EMPTY_EVIDENCES));
  const transcripts = useHearingStore((s) => (caseId ? (s.transcriptsByCase[caseId] ?? EMPTY_TRANSCRIPTS) : EMPTY_TRANSCRIPTS));
  const addEvidence = useHearingStore(s=>s.addEvidence);
  const removeEvidence = useHearingStore(s=>s.removeEvidence);
  const togglePresenting = useHearingStore(s=>s.togglePresenting);
  const moveEvidence = useHearingStore(s=>s.moveEvidence);
  const addTranscript = useHearingStore(s=>s.addTranscript);
  const toggleKeyPoint = useHearingStore(s=>s.toggleKeyPoint);
  const tribunal = useTribunalStore((s) => (caseId ? s.get(caseId) : undefined));
  const caseInfo = caseId ? mockCases.find(c=>c.id===caseId) : undefined;
  const demoHearingConfig = caseId ? getDemoHearingConfig(caseId) : null;

  // 权限控制逻辑
  const isArbitrator = currentRole === 'arbitrator';
  const isMediatorRole = currentRole === 'mediator';
  const canHostHearing = isArbitrator || isMediatorRole;

  // 确定庭审类型
  useEffect(() => {
    if (mediationId) {
      setHearingType('mediation');
    } else if (caseId) {
      setHearingType('arbitration');
    }
  }, [caseId, mediationId]);

  // 权限检查
  useEffect(() => {
    // 检查是否有权限进入庭审
    const hasPermission = checkHearingPermission();
    if (!hasPermission && !showCodeEntry) {
      setAccessDenied(true);
    }
  }, [caseId, mediationId, currentRole]);

  const checkHearingPermission = () => {
    // 1. 仲裁员/调解员总是有权限
    if (canHostHearing) return true;

    // 2. 如果有案件ID或调解ID，检查是否是相关当事人
    if (caseId || mediationId) {
      // 这里应该检查用户是否是该案件的当事人
      // 暂时返回true，实际应该查询数据库
      return true;
    }

    // 3. 没有相关权限，需要输入庭审码
    return false;
  };

  const handleCodeEntry = () => {
    if (hearingCode.trim()) {
      // 使用演示庭审码验证
      const isValid = caseId ? verifyDemoHearingCode(caseId, hearingCode) : hearingCode === '999999';

      if (isValid) {
        setShowCodeEntry(false);
        setAccessDenied(false);
        alert('庭审码验证成功，正在进入庭审...');
      } else {
        alert('庭审码错误，请重新输入。提示：case-001使用123456，case-002使用789012，演示庭审使用999999');
      }
    }
  };

  // 如果访问被拒绝，显示权限提示
  if (accessDenied && !showCodeEntry) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center space-y-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <Lock className="h-8 w-8 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">访问受限</h2>
            <p className="text-gray-600">
              您没有权限直接进入此庭审。请通过以下方式获取访问权限：
            </p>
            <div className="space-y-2">
              <Button
                className="w-full"
                onClick={() => setShowCodeEntry(true)}
              >
                输入庭审码
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.back()}
              >
                返回上一页
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 庭审码输入界面
  if (showCodeEntry) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 space-y-4">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8 text-blue-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">输入庭审码</h2>
              <p className="text-gray-600 mt-2">
                请输入由仲裁员或调解员提供的庭审码
              </p>
            </div>

            {/* 演示提示 */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">演示庭审码</h4>
              <div className="text-sm text-blue-700 space-y-1">
                <p>• case-001: <code className="bg-blue-100 px-1 rounded">123456</code> (建设工程合同纠纷)</p>
                <p>• case-002: <code className="bg-blue-100 px-1 rounded">789012</code> (软件开发合同争议)</p>
                <p>• 通用演示: <code className="bg-blue-100 px-1 rounded">999999</code></p>
              </div>
            </div>

            <div className="space-y-4">
              <Input
                placeholder="请输入6位庭审码"
                value={hearingCode}
                onChange={(e) => setHearingCode(e.target.value)}
                maxLength={6}
                className="text-center text-lg tracking-widest"
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowCodeEntry(false)}
                >
                  取消
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleCodeEntry}
                  disabled={hearingCode.length !== 6}
                >
                  进入庭审
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            {hearingType === 'arbitration' ? (
              <>
                <Gavel className="h-6 w-6 text-blue-600" />
                在线仲裁庭审
              </>
            ) : (
              <>
                <Scale className="h-6 w-6 text-green-600" />
                在线调解会议
              </>
            )}
          </h1>
          <p className="text-muted-foreground">
            {canHostHearing ? '主持人模式' : '参与者模式'} ·
            {hearingType === 'arbitration' ? '仲裁流程' : '调解流程'} ·
            身份验证完成
            {demoHearingConfig?.isDemo && (
              <Badge variant="secondary" className="ml-2 bg-orange-100 text-orange-800">
                演示模式
              </Badge>
            )}
          </p>
        </div>
          {caseId ? (
            caseInfo && (
              <div className="text-sm text-muted-foreground mt-1">
                案件：{caseInfo.caseNumber} · {caseInfo.title}
              </div>
            )
          ) : mediationId ? (
            <div className="text-sm text-muted-foreground mt-1">
              调解案件：{mediationId}
            </div>
          ) : (
            <div className="text-sm text-red-600 mt-1">
              未指定案件，部分功能不可用。
              <Link href="/cases" className="underline ml-2">返回案件列表</Link>
            </div>
          )}

        <div className="flex flex-wrap items-center gap-2">
          <Badge className="bg-green-500">已连接</Badge>
          {isIdentityVerified && (
            <Badge className="bg-blue-500">
              <Shield className="w-3 h-3 mr-1"/>
              已验证
            </Badge>
          )}
          {canHostHearing && (
            <Badge className="bg-purple-100 text-purple-800">
              主持人
            </Badge>
          )}
          <Badge variant="outline">
            {hearingType === 'arbitration' ? '仲裁庭审' : '调解会议'}
          </Badge>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowIdentityModal(true)}
          >
            <Shield className="w-4 h-4 mr-1"/>
            身份校验
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowDeviceModal(true)}
          >
            <Settings className="w-4 h-4 mr-1"/>
            设备设置
          </Button>
        </div>
      </div>

      {/* 视频布局 - 根据庭审状态和侧边栏状态调整 */}
      <div className={`grid gap-4 transition-all duration-300 ${
        sidebarCollapsed ? 'grid-cols-1' : 'grid-cols-1 xl:grid-cols-3'
      }`}>
        <Card className={`${sidebarCollapsed ? 'col-span-1' : 'xl:col-span-2'} ${
          hearingStarted ? 'h-[400px] md:h-[500px] lg:h-[600px]' : 'h-[300px] md:h-[350px] lg:h-[420px]'
        } transition-all duration-300`}>
          <CardContent className="p-4 h-full">
            {hearingStarted ? (
              // 庭审进行中的视频布局
              <div className="h-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-4">
                {/* 主持人视频 - 仲裁员/调解员 */}
                <div className="relative bg-gray-900 rounded-lg overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center text-white">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-2">
                        {hearingType === 'arbitration' ? (
                          <Gavel className="h-8 w-8" />
                        ) : (
                          <Scale className="h-8 w-8" />
                        )}
                      </div>
                      <p className="text-sm font-medium">
                        {hearingType === 'arbitration' ? '仲裁员' : '调解员'}
                      </p>
                      <p className="text-xs text-gray-300">主持人</p>
                    </div>
                  </div>
                  <div className="absolute top-2 left-2">
                    <Badge className="bg-purple-600">主持</Badge>
                  </div>
                </div>

                {/* 申请人视频 */}
                <div className="relative bg-gray-900 rounded-lg overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center text-white">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-2">
                        <User className="h-8 w-8" />
                      </div>
                      <p className="text-sm font-medium">申请人</p>
                      <p className="text-xs text-gray-300">张三</p>
                    </div>
                  </div>
                  <div className="absolute top-2 left-2">
                    <Badge className="bg-blue-600">申请人</Badge>
                  </div>
                  {handRaised && (
                    <div className="absolute top-2 right-2">
                      <Hand className="h-5 w-5 text-yellow-400" />
                    </div>
                  )}
                </div>

                {/* 被申请人视频 */}
                <div className="relative bg-gray-900 rounded-lg overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center text-white">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-orange-600 rounded-full flex items-center justify-center mx-auto mb-2">
                        <User className="h-8 w-8" />
                      </div>
                      <p className="text-sm font-medium">被申请人</p>
                      <p className="text-xs text-gray-300">李四公司</p>
                    </div>
                  </div>
                  <div className="absolute top-2 left-2">
                    <Badge className="bg-orange-600">被申请人</Badge>
                  </div>
                </div>
              </div>
            ) : (
              // 等待室状态
              <div className="h-full flex items-center justify-center bg-black/5 rounded-lg">
                <div className="text-center">
                  <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Video className="h-10 w-10 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">等待室</h3>
                  <p className="text-gray-600 mb-4">
                    {canHostHearing ? '您可以开始庭审' : '等待主持人开始庭审'}
                  </p>
                  {canHostHearing && (
                    <Button
                      onClick={() => {
                        setHearingStarted(true);
                        setSidebarCollapsed(true);
                        alert('庭审已开始');
                      }}
                      className="mb-2"
                    >
                      开始{hearingType === 'arbitration' ? '庭审' : '调解'}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        {!sidebarCollapsed && (
          <Card className="hidden xl:block">
            <CardContent className="p-0">
              <div className="p-3 border-b flex items-center justify-between">
                <h3 className="font-medium">庭审工具</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSidebarCollapsed(true)}
                  title="收起侧边栏"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            <Tabs defaultValue="ai">
            {tribunal && (
              <div className="p-3 border-t text-sm text-muted-foreground">
                已组庭成员：
                <span className="ml-2">
                  {tribunal.arbitrators.length>0 ? tribunal.arbitrators.join('、') : '暂无'}
                </span>
              </div>
            )}

              <TabsList className="grid grid-cols-3">
                <TabsTrigger value="ai">AI记录</TabsTrigger>
                <TabsTrigger value="evidence">证据</TabsTrigger>
                <TabsTrigger value="chat">交流</TabsTrigger>
              </TabsList>
              <TabsContent value="ai" className="p-4 text-sm space-y-3">
                {caseId ? (
                  <>
                    <div className="flex items-center gap-2">
                      <Input placeholder="输入要记录的内容..." onKeyDown={(e)=>{ if(e.key==='Enter'){ const v=(e.target as HTMLInputElement).value.trim(); if(v){ addTranscript(caseId, v); (e.target as HTMLInputElement).value=''; } } }} />
                      <Button size="sm" onClick={()=>{ const el=document.querySelector<HTMLInputElement>('input[placeholder=\"输入要记录的内容...\"]'); if(!el) return; const v=el.value.trim(); if(v){ addTranscript(caseId, v); el.value=''; } }}>记录</Button>
                    </div>
                    <div className="space-y-2 max-h-64 overflow-auto">
                      {transcripts.map(t=> (
                        <div key={t.id} className="flex items-start justify-between p-2 border rounded">
                          <div>
                            <div className="text-xs text-muted-foreground">{new Date(t.ts).toLocaleTimeString()}</div>
                            <div>{t.text}</div>
                          </div>
                          <Button size="sm" variant={t.isKey?'secondary':'outline'} onClick={()=>toggleKeyPoint(caseId, t.id)}>{t.isKey?'要点':'设为要点'}</Button>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-muted-foreground">请从案件详情进入在线庭审以启用记录。</div>
                )}
              </TabsContent>

              <TabsContent value="evidence" className="p-4 text-sm space-y-3">
                {caseId ? (
                  <>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Input id="evi-name" placeholder="证据名称" />
                        <Input id="evi-desc" placeholder="说明（可选）" />
                        <Button size="sm" onClick={()=>{ const n=(document.getElementById('evi-name') as HTMLInputElement); const d=(document.getElementById('evi-desc') as HTMLInputElement); const name=n?.value.trim(); if(name){ addEvidence(caseId, name, d?.value.trim()||undefined); if(n) n.value=''; if(d) d.value=''; } }}>添加</Button>
                      </div>
                    </div>

                    <div className="space-y-2 max-h-64 overflow-auto">
                      {evidences.map((e,idx)=> (
                        <div key={e.id} className="p-2 border rounded flex items-center justify-between">
                          <div>
                            <div className="font-medium">{e.name} {e.isPresenting && <Badge className="ml-2">展示中</Badge>}</div>
                            {e.description && <div className="text-xs text-muted-foreground">{e.description}</div>}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="outline" onClick={()=>togglePresenting(caseId, e.id)}>{e.isPresenting?'停止展示':'展示'}</Button>
                            <Button size="sm" variant="outline" onClick={()=>moveEvidence(caseId, e.id,'up')}>上移</Button>
                            <Button size="sm" variant="outline" onClick={()=>moveEvidence(caseId, e.id,'down')}>下移</Button>
                            <Button size="sm" variant="ghost" onClick={()=>removeEvidence(caseId, e.id)}>删除</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-muted-foreground">请从案件详情进入在线庭审以管理证据。</div>
                )}
              </TabsContent>

              <TabsContent value="chat" className="p-4 text-sm text-muted-foreground">
                庭审侧栏交流（稍后对接 IM）
              </TabsContent>
            </Tabs>
          </CardContent>
          </Card>
        )}

        {/* 侧边栏收缩时的展开按钮 - 桌面端 */}
        {sidebarCollapsed && (
          <div className="hidden xl:block fixed right-4 top-1/2 transform -translate-y-1/2 z-50">
            <Button
              onClick={() => setSidebarCollapsed(false)}
              className="h-12 w-12 rounded-full shadow-lg"
              title="展开侧边栏"
            >
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        )}

        {/* 移动端工具按钮 */}
        <div className="xl:hidden fixed right-4 bottom-20 z-50">
          <Button
            onClick={() => setShowMobileTools(true)}
            className="h-12 w-12 rounded-full shadow-lg bg-orange-500 hover:bg-orange-600 text-white"
            title="庭审工具"
          >
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* 底部控制条 */}
      <Card>
        <CardContent className="p-2 md:p-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1 md:gap-2">
            <Button variant={muted? 'destructive':'outline'} size="sm" onClick={()=>setMuted(!muted)}>
              {muted? <MicOff className="w-4 h-4 sm:mr-1"/> : <Mic className="w-4 h-4 sm:mr-1"/>}
              <span className="hidden sm:inline">{muted? '麦克风已静音':'麦克风' }</span>
            </Button>
            <Button variant={cameraOn? 'outline':'destructive'} size="sm" onClick={()=>setCameraOn(!cameraOn)}>
              <Video className="w-4 h-4 sm:mr-1"/>
              <span className="hidden sm:inline">{cameraOn? '摄像头开启':'摄像头已关闭'}</span>
            </Button>
            <Button variant="outline" size="sm">
              <ScreenShare className="w-4 h-4 sm:mr-1"/>
              <span className="hidden sm:inline">共享屏幕</span>
            </Button>
            {!canHostHearing && (
              <Button variant={handRaised? 'secondary':'outline'} size="sm" onClick={()=>setHandRaised(!handRaised)}>
                <Hand className="w-4 h-4 mr-1"/>{handRaised? '已举手':'举手发言'}
              </Button>
            )}

            {/* 流程控制按钮 - 仅主持人可见 */}
            {canHostHearing && hearingStarted && (
              <>
                {hearingType === 'arbitration' ? (
                  <>
                    <Button variant="outline" size="sm" onClick={() => alert('开始质证环节')}>
                      <Files className="w-4 h-4 mr-1"/>质证
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => alert('开始辩论环节')}>
                      <MessageSquare className="w-4 h-4 mr-1"/>辩论
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => alert('宣布休庭')}>
                      <Gavel className="w-4 h-4 mr-1"/>休庭
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" size="sm" onClick={() => alert('开始协商环节')}>
                      <MessageSquare className="w-4 h-4 mr-1"/>协商
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => alert('私下会谈')}>
                      <Users className="w-4 h-4 mr-1"/>私谈
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => alert('达成协议')}>
                      <CheckCircle className="w-4 h-4 mr-1"/>协议
                    </Button>
                  </>
                )}
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="destructive" size="sm"><PhoneOff className="w-4 h-4 mr-1"/>离开</Button>
          </div>
          <Button size="sm" onClick={()=>{
            if(!caseId) return;
            const evidences = useHearingStore.getState().evidencesByCase[caseId]||[];
            const transcripts = useHearingStore.getState().transcriptsByCase[caseId]||[];
            const keyPoints = transcripts.filter((t) => t.isKey).length;
            const title = `${caseInfo?.caseNumber || caseId} 庭审`;
            const id = useHearingRecordsStore.getState().addRecord({
              caseId,
              title,
              date: new Date().toISOString(),
              participants: tribunal?.arbitrators.length || 0,
              evidences: evidences.map((e) => ({ id: e.id, name: e.name, description: e.description })),
              transcripts: transcripts.map((t) => ({ id: t.id, text: t.text, isKey: t.isKey, ts: t.ts })),
              summary: { keyPoints, evidenceCount: evidences.length }
            });
            window.location.href = `/hearing/records/${id}`;
          }}>结束并生成记录</Button>
        </CardContent>
      </Card>

      {/* 身份校验模态框 */}
      <IdentityVerificationModal
        isOpen={showIdentityModal}
        onClose={() => setShowIdentityModal(false)}
        onVerificationComplete={(success) => {
          if (success) {
            setIsIdentityVerified(true);
          }
          setShowIdentityModal(false);
        }}
      />

      {/* 设备设置模态框 */}
      <DeviceSettingsModal
        isOpen={showDeviceModal}
        onClose={() => setShowDeviceModal(false)}
        onSettingsApplied={() => {
          // 设置应用后的回调
          console.log('设备设置已应用');
        }}
      />

      {/* 移动端庭审工具抽屉 */}
      <Sheet open={showMobileTools} onOpenChange={setShowMobileTools}>
        <SheetContent side="bottom" className="h-[80vh]">
          <SheetHeader>
            <SheetTitle>庭审工具</SheetTitle>
            <SheetDescription>
              管理庭审记录、证据和交流
            </SheetDescription>
          </SheetHeader>
          <div className="mt-4">
            <Tabs defaultValue="ai" className="space-y-4">
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="ai">AI记录</TabsTrigger>
                <TabsTrigger value="evidence">证据</TabsTrigger>
                <TabsTrigger value="chat">交流</TabsTrigger>
              </TabsList>

              <TabsContent value="ai" className="space-y-3">
                {caseId ? (
                  <>
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="输入要记录的内容..."
                        onKeyDown={(e)=>{
                          if(e.key==='Enter'){
                            const v=(e.target as HTMLInputElement).value.trim();
                            if(v){
                              addTranscript(caseId, v);
                              (e.target as HTMLInputElement).value='';
                            }
                          }
                        }}
                      />
                      <Button size="sm" onClick={()=>{
                        const el=document.querySelector<HTMLInputElement>('input[placeholder=\"输入要记录的内容...\"]');
                        if(!el) return;
                        const v=el.value.trim();
                        if(v){
                          addTranscript(caseId, v);
                          el.value='';
                        }
                      }}>记录</Button>
                    </div>
                    <div className="space-y-2 max-h-96 overflow-auto">
                      {transcripts.map(t=> (
                        <div key={t.id} className="flex items-start justify-between p-2 border rounded">
                          <div className="flex-1">
                            <div className="text-xs text-muted-foreground">{new Date(t.ts).toLocaleTimeString()}</div>
                            <div className="text-sm">{t.text}</div>
                          </div>
                          <Button size="sm" variant={t.isKey?'secondary':'outline'} onClick={()=>toggleKeyPoint(caseId, t.id)}>
                            {t.isKey?'要点':'设为要点'}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-muted-foreground text-center py-8">请从案件详情进入在线庭审以启用记录。</div>
                )}
              </TabsContent>

              <TabsContent value="evidence" className="space-y-3">
                {caseId ? (
                  <>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Input id="mobile-evi-name" placeholder="证据名称" />
                        <Button size="sm" onClick={()=>{
                          const n=(document.getElementById('mobile-evi-name') as HTMLInputElement);
                          const name=n?.value.trim();
                          if(name){
                            addEvidence(caseId, name);
                            if(n) n.value='';
                          }
                        }}>添加</Button>
                      </div>
                    </div>

                    <div className="space-y-2 max-h-96 overflow-auto">
                      {evidences.map((e)=> (
                        <div key={e.id} className="p-2 border rounded">
                          <div className="flex items-center justify-between mb-2">
                            <div className="font-medium text-sm">{e.name}</div>
                            {e.isPresenting && <Badge className="text-xs">展示中</Badge>}
                          </div>
                          {e.description && <div className="text-xs text-muted-foreground mb-2">{e.description}</div>}
                          <div className="flex items-center gap-1">
                            <Button size="sm" variant="outline" onClick={()=>togglePresenting(caseId, e.id)}>
                              {e.isPresenting?'停止展示':'展示'}
                            </Button>
                            <Button size="sm" variant="ghost" onClick={()=>removeEvidence(caseId, e.id)}>删除</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-muted-foreground text-center py-8">请从案件详情进入在线庭审以管理证据。</div>
                )}
              </TabsContent>

              <TabsContent value="chat" className="text-muted-foreground text-center py-8">
                庭审侧栏交流（稍后对接 IM）
              </TabsContent>
            </Tabs>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
