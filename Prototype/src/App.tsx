import { useState, useEffect } from 'react';
import { DrawnixLegalWorkspace } from './components/DrawnixLegalWorkspace';
import { ToastContainer } from './components/ui/Toast';
import { Button } from './components/ui/button';
import { Badge } from './components/ui/badge';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useUnifiedDataStore } from './lib/unified-data-manager';
import { AlertTriangle, Loader2 } from 'lucide-react';
import './App.css';

// Import Participant type if possible, or redefine locally for now to avoid circular dependency issues if types aren't exported centrally
interface Participant {
  id: string;
  name: string;
  avatar: string;
  status: 'online' | 'idle' | 'in-call' | 'offline';
  isSpeaking?: boolean;
}

function App() {
  const { initialized, currentVersion, initialize } = useUnifiedDataStore();
  const [initError, setInitError] = useState<string | null>(null);

  // Collaboration State (Lifted from Workspace)
  const [isCallActive, setIsCallActive] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([
    { id: '1', name: '李律师', avatar: 'https://i.pravatar.cc/150?u=1', status: 'online' },
    { id: '2', name: '张法务', avatar: 'https://i.pravatar.cc/150?u=2', status: 'idle' },
    { id: '3', name: '王顾问', avatar: 'https://i.pravatar.cc/150?u=3', status: 'in-call' },
    { id: '4', name: '赵助理', avatar: 'https://i.pravatar.cc/150?u=4', status: 'offline' },
    { id: 'me', name: '我', avatar: 'https://i.pravatar.cc/150?u=me', status: 'online' }
  ]);

  const handleStartCall = (selectedIds: string[], type: 'video' | 'audio') => {
    console.log(`[App] Starting ${type} call with:`, selectedIds);
    setIsCallActive(true);
    // Update participants status
    setParticipants(prev => prev.map(p =>
      selectedIds.includes(p.id) || p.id === 'me'
        ? { ...p, status: 'in-call' }
        : p
    ));
  };

  const handleEndCall = () => {
    console.log('[App] Ending call');
    setIsCallActive(false);
    // Reset participants status
    setParticipants(prev => prev.map(p =>
      p.status === 'in-call'
        ? { ...p, status: 'online' }
        : p
    ));
  };

  const handleJoinCall = () => {
    console.log('[App] Joining call');
    setIsCallActive(true);
    setParticipants(prev => prev.map(p =>
      p.id === 'me'
        ? { ...p, status: 'in-call' }
        : p
    ));
  };



  // 初始化数据系统
  useEffect(() => {
    const init = async () => {
      try {
        await initialize();
      } catch (error) {
        setInitError(error instanceof Error ? error.message : '初始化失败');
      }
    };
    init();
  }, [initialize]);

  // 如果未初始化，显示加载界面
  if (!initialized && !initError) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-white">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-orange-500 animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">正在初始化 LegalMind 工作台...</h2>
          <p className="text-sm text-gray-600">加载核心组件中</p>
        </div>
      </div>
    );
  }

  // 如果初始化失败，显示错误界面
  if (initError) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-white">
        <div className="text-center max-w-md">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">系统初始化失败</h2>
          <p className="text-sm text-gray-600 mb-4">{initError}</p>
          <Button onClick={() => window.location.reload()} className="bg-orange-500 hover:bg-orange-600">
            重新加载
          </Button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        console.error('[App] Global error:', error, errorInfo);
      }}
    >
      <div className="w-full h-screen overflow-hidden">
        {/* 系统状态指示器 - 绝对定位在左下角 */}
        <div className="absolute bottom-2 left-2 z-50 pointer-events-none">
          <Badge variant="secondary" className="bg-white/80 backdrop-blur text-xs text-gray-500 shadow-sm border-gray-200">
            v{currentVersion}
          </Badge>
        </div>

        {/* 主工作台 - 始终渲染 */}
        <DrawnixLegalWorkspace
          isCallActive={isCallActive}
          participants={participants}
          onStartCall={handleStartCall}
          onEndCall={handleEndCall}
          onJoinCall={handleJoinCall}
        />

        {/* Toast通知容器 */}
        <ToastContainer />
      </div>
    </ErrorBoundary>
  );
}

export default App;
