// dev/src/app/test/page.tsx
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function TestPage() {
  const testItems = [
    { id: 1, name: '测试项目1' },
    { id: 2, name: '测试项目2' },
    { id: 3, name: '测试项目3' },
  ];

  return (
    <div className="min-h-screen p-8">
      <h1 className="text-2xl font-bold mb-8">测试页面</h1>
      
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">简单map测试</h2>
        <div className="grid grid-cols-1 gap-4">
          {testItems.map((item) => (
            <Card key={item.id}>
              <CardContent className="p-4">
                <p>{item.name}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <Button onClick={() => console.log('按钮点击测试')}>
          测试按钮
        </Button>
      </div>
    </div>
  );
}
