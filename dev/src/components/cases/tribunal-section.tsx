// dev/src/components/cases/tribunal-section.tsx
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { useTribunalStore } from '@/store/tribunal';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { UserPlus, Crown, Trash2, CheckCircle2, ArrowRight, Send } from 'lucide-react';
import { useRole } from '@/components/layout/role-switcher';
import { useConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { useNotificationHelpers } from '@/components/ui/notification';

interface Props {
  caseId: string;
  onOpenArbitratorSelection?: () => void;
}

export function TribunalSection({ caseId, onOpenArbitratorSelection }: Props){
  const { get, addArbitrator, removeArbitrator, setPresiding, confirm } = useTribunalStore();
  const { currentRole } = useRole();
  const router = useRouter();
  const tribunal = get(caseId) || { caseId, arbitrators: [], status: 'forming' as const };
  const { showConfirmation, ConfirmationDialog } = useConfirmationDialog();
  const notify = useNotificationHelpers();

  const selected = tribunal.arbitrators;
  const presiding = tribunal.presiding;
  const canConfirm = selected.length > 0 && !!presiding;
  const isArbitrator = currentRole === 'arbitrator';

  // 发送开庭通知
  const handleSendHearingNotice = () => {
    showConfirmation({
      title: '发送开庭通知',
      message: '确定要发送开庭通知吗？\n\n通知将发送给所有当事人和仲裁员，包含庭审时间和参与方式。',
      type: 'info',
      onConfirm: () => {
        // 这里应该调用API发送通知
        notify.success('开庭通知已发送', '通知已发送给所有相关人员');
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">案件 ID：{caseId}</div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={onOpenArbitratorSelection || (() => router.push(`/arbitrators?caseId=${caseId}`))}
          >
            <UserPlus className="w-4 h-4 mr-1"/>添加仲裁员
          </Button>
          <Button size="sm" disabled={!canConfirm} onClick={()=>confirm(caseId)}>
            <CheckCircle2 className="w-4 h-4 mr-1"/>确认组庭
          </Button>
          {tribunal.status === 'confirmed' && isArbitrator && (
            <Button size="sm" onClick={handleSendHearingNotice}>
              <Send className="w-4 h-4 mr-1"/>发送开庭通知
            </Button>
          )}
          {tribunal.status === 'confirmed' && isArbitrator && (
            <Button asChild size="sm">
              <Link href={`/hearing/online?caseId=${caseId}`}>主持庭审</Link>
            </Button>
          )}
        </div>

      </div>

      <Card>
        <CardContent className="p-4">
          {selected.length === 0 ? (
            <div className="text-sm text-muted-foreground">尚未选择仲裁员，点击“添加仲裁员”开始选择。</div>
          ) : (
            <div className="space-y-3">
              {selected.map((arbId)=> (
                <div key={arbId} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 text-white flex items-center justify-center">{arbId.slice(-2)}</div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">仲裁员 {arbId}</span>
                        {presiding===arbId && <Badge className="bg-yellow-100 text-yellow-800"><Crown className="w-3 h-3 mr-1"/>首席</Badge>}
                      </div>
                      <div className="text-xs text-muted-foreground">ID: {arbId}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={()=>setPresiding(caseId, arbId)} disabled={presiding===arbId}>
                      <Crown className="w-4 h-4 mr-1"/>设为首席
                    </Button>
                    <Button size="sm" variant="ghost" onClick={()=>removeArbitrator(caseId, arbId)}>
                      <Trash2 className="w-4 h-4"/>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {tribunal.status==='confirmed' && (
        <div className="p-3 rounded-md bg-green-50 text-green-700 text-sm flex items-center justify-between">
          <div>仲裁庭已确认，组庭时间：{new Date(tribunal.formedAt || '').toLocaleString()}</div>
          <Link className="underline flex items-center" href={`/hearing/online?caseId=${caseId}`}>
            前往在线庭审 <ArrowRight className="w-4 h-4 ml-1"/>
          </Link>
        </div>
      )}

      {/* 确认对话框 */}
      <ConfirmationDialog />
    </div>
  );
}
