// src/components/hearing/evidence-panel.tsx
'use client';

// 证据展示面板（原型）：支持 PDF/图片/视频展示占位，含简单标注工具占位

import { useMemo, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { FileText, Highlighter, Eraser, ZoomIn, ZoomOut, Image, Film } from 'lucide-react';

export interface EvidenceItem {
  id: string;
  name: string;
  type: 'pdf' | 'image' | 'video' | 'other';
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  list?: EvidenceItem[];
  onComment?: (evidenceId: string) => void; // 发表质证意见回调
}

export function EvidencePanel({ open, onOpenChange, list, onComment }: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [tool, setTool] = useState<'highlight' | 'erase' | 'none'>('none');
  const [zoom, setZoom] = useState(100);

  const items: EvidenceItem[] = useMemo(
    () =>
      list?.length
        ? list
        : [
            { id: 'e1', name: '合同正文.pdf', type: 'pdf' },
            { id: 'e2', name: '对账单.png', type: 'image' },
            { id: 'e3', name: '付款记录.mp4', type: 'video' },
          ],
    [list]
  );

  const active = useMemo(() => items.find((i) => i.id === activeId) ?? items[0], [items, activeId]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[90vw] sm:w-[720px] bg-gray-900 text-white border-gray-700">
        <SheetHeader>
          <SheetTitle className="flex items-center">
            <FileText className="h-4 w-4 mr-2 text-orange-400" /> 证据展示
          </SheetTitle>
        </SheetHeader>
        <div className="h-full flex flex-col pt-2">
          {/* 工具栏 */}
          <div className="flex items-center justify-between bg-gray-800 border border-gray-700 rounded-lg p-2">
            <div className="flex items-center space-x-2">
              <Button size="sm" variant={tool === 'highlight' ? 'default' : 'outline'} className={tool === 'highlight' ? 'btn-primary' : 'bg-gray-700 border-gray-600 text-white'} onClick={() => setTool('highlight')}>
                <Highlighter className="h-4 w-4 mr-1" /> 高亮
              </Button>
              <Button size="sm" variant={tool === 'erase' ? 'default' : 'outline'} className={tool === 'erase' ? 'btn-primary' : 'bg-gray-700 border-gray-600 text-white'} onClick={() => setTool('erase')}>
                <Eraser className="h-4 w-4 mr-1" /> 橡皮
              </Button>
              <Separator orientation="vertical" className="h-6 bg-gray-600" />
              <Button size="sm" variant="outline" className="bg-gray-700 border-gray-600 text-white" onClick={() => setZoom((z) => Math.min(200, z + 10))}>
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="outline" className="bg-gray-700 border-gray-600 text-white" onClick={() => setZoom((z) => Math.max(50, z - 10))}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Badge className="bg-gray-700">{zoom}%</Badge>
            </div>
            <div className="text-xs text-gray-400">原型占位：标注与同步将接入实时通道</div>
          </div>

          <div className="flex-1 grid grid-cols-12 gap-3 mt-3 min-h-0">
            {/* 列表 */}
            <div className="col-span-12 md:col-span-5 lg:col-span-4 overflow-y-auto space-y-2">
              {items.map((e) => (
                <button
                  key={e.id}
                  onClick={() => setActiveId(e.id)}
                  className={`w-full text-left p-3 rounded-lg border ${active.id === e.id ? 'border-orange-500 bg-gray-800' : 'border-gray-700 bg-gray-800 hover:bg-gray-700'}`}
                >
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-md bg-gradient-to-r from-gray-500 to-gray-600 flex items-center justify-center text-xs">
                      {e.type === 'pdf' ? 'PDF' : e.type === 'image' ? <Image className="h-4 w-4" /> : e.type === 'video' ? <Film className="h-4 w-4" /> : 'DOC'}
                    </div>
                    <div className="truncate text-sm">{e.name}</div>
                  </div>
                </button>
              ))}
            </div>

            {/* 预览区 */}
            <div className="col-span-12 md:col-span-7 lg:col-span-8 bg-gray-800 border border-gray-700 rounded-lg flex items-center justify-center">
              <div className="text-center p-6">
                <div className="mb-3 text-sm text-gray-300">预览占位（{active?.type?.toUpperCase()}）</div>
                <div className="w-[90%] aspect-video bg-gray-700 rounded-lg flex items-center justify-center">
                  <span className="text-gray-400">{active?.name}</span>
                </div>

	            <div className="mt-4 flex items-center justify-end">
	              <Button size="sm" className="btn-primary" onClick={()=> active?.id && onComment?.(active.id)}>
	                发表质证意见
	              </Button>
	            </div>

                <div className="text-xs text-gray-400 mt-2">缩放：{zoom}% · 工具：{tool}</div>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

