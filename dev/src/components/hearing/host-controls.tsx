// src/components/hearing/host-controls.tsx
'use client';

// 主持控制（原型）：全体静音、指定发言、身份核对、邀请/请出证人、举手队列

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Users, MicOff, PersonStanding, CheckCheck, UserMinus2 } from 'lucide-react';

interface Participant {
  id: string;
  name: string;
  role: string;
  speaking?: boolean;
}

interface Props {
  participants: Participant[];
  onMuteAll?: () => void;
  onGrantSpeak?: (id: string) => void;
  onVerifyFlow?: () => void;
  onInviteWitness?: () => void;
  onRemoveWitness?: () => void;
  handQueue?: string[];
  onGrantNext?: () => void;
}

export function HostControls({ participants, onMuteAll, onGrantSpeak, onVerifyFlow, onInviteWitness, onRemoveWitness, handQueue = [], onGrantNext }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="bg-gray-700 border-gray-600 text-white">主持控制</Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl bg-gray-900 text-white border-gray-700">
        <DialogHeader>
          <DialogTitle className="flex items-center"><Users className="h-4 w-4 mr-2 text-orange-400" /> 主持控制</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-2 bg-gray-800 rounded-lg">
            <div>全体静音</div>
            <Button size="sm" className="bg-red-600 hover:bg-red-500" onClick={onMuteAll}><MicOff className="h-4 w-4 mr-1" /> 静音</Button>
          </div>

          {/* 举手队列 */}
          <div className="p-2 bg-gray-800 rounded-lg">
            <div className="mb-2 flex items-center justify-between">
              <div>举手队列</div>
              <Button size="sm" variant="outline" className="bg-gray-700 border-gray-600 text-white" disabled={!handQueue.length} onClick={onGrantNext}>授予下一个</Button>
            </div>
            {handQueue.length ? (
              <div className="space-y-1 text-sm">
                {handQueue.map((id) => {
                  const p = participants.find((x) => x.id === id);
                  return (
                    <div key={id} className="flex items-center justify-between p-2 bg-gray-700 rounded-md">
                      <div>{p?.name ?? id} <Badge className="bg-gray-600 ml-2">{p?.role ?? '参与人'}</Badge></div>
                      <Button size="sm" variant="outline" className="bg-gray-700 border-gray-600 text-white" onClick={() => onGrantSpeak?.(id)}><PersonStanding className="h-4 w-4 mr-1" /> 授予发言</Button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-xs text-gray-400">暂无举手</div>
            )}
          </div>

          {/* 指定发言 */}
          <div className="p-2 bg-gray-800 rounded-lg">
            <div className="mb-2">指定发言</div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {participants.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-2 bg-gray-700 rounded-md">
                  <div>{p.name} <Badge className="bg-gray-600 ml-2">{p.role}</Badge></div>
                  <Button size="sm" variant="outline" className="bg-gray-700 border-gray-600 text-white" onClick={() => onGrantSpeak?.(p.id)}>
                    <PersonStanding className="h-4 w-4 mr-1" /> 授予发言
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between p-2 bg-gray-800 rounded-lg">
            <div>身份核对流程</div>
            <Button size="sm" className="btn-primary" onClick={onVerifyFlow}><CheckCheck className="h-4 w-4 mr-1" /> 开始核对</Button>
          </div>
          <div className="flex items-center justify-between p-2 bg-gray-800 rounded-lg">
            <div>证人管理</div>
            <div className="space-x-2">
              <Button size="sm" variant="outline" className="bg-gray-700 border-gray-600 text-white" onClick={onInviteWitness}>邀请入庭</Button>
              <Button size="sm" variant="outline" className="bg-gray-700 border-gray-600 text-white" onClick={onRemoveWitness}><UserMinus2 className="h-4 w-4 mr-1" /> 请出</Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

