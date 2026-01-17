// src/components/debug/auth-status.tsx
'use client';

import { useUserStore } from '@/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export function AuthStatus() {
  const { currentUser, isAuthenticated, profile } = useUserStore();

  const handleClearStorage = () => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.reload();
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>身份验证状态</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <strong>认证状态:</strong>{' '}
          <Badge variant={isAuthenticated ? 'default' : 'destructive'}>
            {isAuthenticated ? '已登录' : '未登录'}
          </Badge>
        </div>
        
        {currentUser && (
          <div>
            <strong>用户信息:</strong>
            <pre className="text-xs bg-gray-100 p-2 rounded mt-1">
              {JSON.stringify(currentUser, null, 2)}
            </pre>
          </div>
        )}
        
        {profile && (
          <div>
            <strong>用户档案:</strong>
            <pre className="text-xs bg-gray-100 p-2 rounded mt-1">
              {JSON.stringify(profile, null, 2)}
            </pre>
          </div>
        )}
        
        <div>
          <strong>LocalStorage:</strong>
          <pre className="text-xs bg-gray-100 p-2 rounded mt-1">
            {typeof window !== 'undefined' ? 
              JSON.stringify({
                'user-storage': localStorage.getItem('user-storage'),
                'userRole': localStorage.getItem('userRole')
              }, null, 2) : 
              'N/A (SSR)'
            }
          </pre>
        </div>
        
        <Button onClick={handleClearStorage} variant="outline" size="sm">
          清除存储并刷新
        </Button>
      </CardContent>
    </Card>
  );
}
