// dev/src/app/(private)/hearing/records/page.tsx
// NOTE: page uses store data if available
'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, FileText, Calendar, Users, Eye } from 'lucide-react';
import { useHearingRecordsStore } from '@/store/hearing-records';

export default function HearingRecordsPage(){
  const records = useHearingRecordsStore(s=>s.records);
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">庭审记录</h1>
          <p className="text-muted-foreground">查看历史庭审的记录与摘要</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="搜索庭审记录..." className="pl-10" />
            </div>
          </div>

          <div className="space-y-3">
            {records.map((r)=> (
              <Card key={r.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="w-4 h-4 text-primary-500" />
                      <CardTitle className="text-base">{r.title}</CardTitle>
                      <Badge variant="secondary" className="bg-primary-50 text-primary-700">{r.status}</Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {r.date}</span>
                      <span className="flex items-center gap-1"><Users className="w-4 h-4" /> {r.participants} 人</span>
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/hearing/records/${r.id}`}><Eye className="w-4 h-4 mr-1"/> 查看详情</Link>
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

