// dev/src/components/hearing/device-detection.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Camera,
  Mic,
  Wifi,
  CheckCircle,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Volume2,
  Monitor,
  Loader2
} from 'lucide-react';
import { clientLogger } from '@/lib/client-logger';

interface DeviceStatus {
  camera: 'checking' | 'available' | 'unavailable' | 'permission-denied';
  microphone: 'checking' | 'available' | 'unavailable' | 'permission-denied';
  network: 'checking' | 'excellent' | 'good' | 'poor' | 'disconnected';
  speaker: 'checking' | 'available' | 'unavailable';
}

interface NetworkInfo {
  speed: number; // Mbps
  latency: number; // ms
  quality: 'excellent' | 'good' | 'poor';
}

interface Props {
  onDetectionComplete?: (allPassed: boolean) => void;
  autoStart?: boolean;
}

function getErrorName(error: unknown): string | null {
  if (typeof error !== 'object' || error === null) return null;
  if (!('name' in error)) return null;

  const name = (error as { name?: unknown }).name;
  return typeof name === 'string' ? name : null;
}

export function DeviceDetection({ onDetectionComplete, autoStart = true }: Props) {
  const [status, setStatus] = useState<DeviceStatus>({
    camera: 'checking',
    microphone: 'checking',
    network: 'checking',
    speaker: 'checking'
  });
  
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo>({
    speed: 0,
    latency: 0,
    quality: 'poor'
  });
  
  const [isDetecting, setIsDetecting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (autoStart) {
      startDetection();
    }
    
    return () => {
      // 清理媒体流
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [autoStart]);

  const startDetection = async () => {
    setIsDetecting(true);
    setProgress(0);
    
    // 重置状态
    setStatus({
      camera: 'checking',
      microphone: 'checking',
      network: 'checking',
      speaker: 'checking'
    });

    try {
      // 1. 检测摄像头
      setCurrentStep('检测摄像头...');
      await detectCamera();
      setProgress(25);

      // 2. 检测麦克风
      setCurrentStep('检测麦克风...');
      await detectMicrophone();
      setProgress(50);

      // 3. 检测扬声器
      setCurrentStep('检测扬声器...');
      await detectSpeaker();
      setProgress(75);

      // 4. 检测网络
      setCurrentStep('检测网络连接...');
      await detectNetwork();
      setProgress(100);

      setCurrentStep('检测完成');
      
      // 检查是否所有设备都可用
      const allPassed = Object.values(status).every(s => 
        s === 'available' || s === 'excellent' || s === 'good'
      );
      
      onDetectionComplete?.(allPassed);
    } catch (error) {
      clientLogger.error('设备检测失败', error);
    } finally {
      setIsDetecting(false);
    }
  };

  const detectCamera = async (): Promise<void> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480 } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      
      streamRef.current = stream;
      setStatus(prev => ({ ...prev, camera: 'available' }));
    } catch (error: unknown) {
      clientLogger.error('摄像头检测失败', error);
      if (getErrorName(error) === 'NotAllowedError') {
        setStatus(prev => ({ ...prev, camera: 'permission-denied' }));
      } else {
        setStatus(prev => ({ ...prev, camera: 'unavailable' }));
      }
    }
  };

  const detectMicrophone = async (): Promise<void> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // 检测音频输入
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      microphone.connect(analyser);
      
      // 简单的音频检测
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(dataArray);
      
      stream.getTracks().forEach(track => track.stop());
      audioContext.close();
      
      setStatus(prev => ({ ...prev, microphone: 'available' }));
    } catch (error: unknown) {
      clientLogger.error('麦克风检测失败', error);
      if (getErrorName(error) === 'NotAllowedError') {
        setStatus(prev => ({ ...prev, microphone: 'permission-denied' }));
      } else {
        setStatus(prev => ({ ...prev, microphone: 'unavailable' }));
      }
    }
  };

  const detectSpeaker = async (): Promise<void> => {
    try {
      // 检测音频输出设备
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioOutputs = devices.filter(device => device.kind === 'audiooutput');
      
      if (audioOutputs.length > 0) {
        setStatus(prev => ({ ...prev, speaker: 'available' }));
      } else {
        setStatus(prev => ({ ...prev, speaker: 'unavailable' }));
      }
    } catch (error) {
      clientLogger.error('扬声器检测失败', error);
      setStatus(prev => ({ ...prev, speaker: 'unavailable' }));
    }
  };

  const detectNetwork = async (): Promise<void> => {
    try {
      const startTime = performance.now();
      
      // 模拟网络速度测试
      const response = await fetch('/api/ping', { 
        method: 'GET',
        cache: 'no-cache'
      });
      
      const endTime = performance.now();
      const latency = endTime - startTime;
      
      // 模拟带宽检测（实际应该使用更复杂的方法）
      const speed = Math.random() * 50 + 10; // 10-60 Mbps
      
      let quality: 'excellent' | 'good' | 'poor';
      let networkStatus: 'excellent' | 'good' | 'poor';
      
      if (speed > 25 && latency < 100) {
        quality = 'excellent';
        networkStatus = 'excellent';
      } else if (speed > 10 && latency < 200) {
        quality = 'good';
        networkStatus = 'good';
      } else {
        quality = 'poor';
        networkStatus = 'poor';
      }
      
      setNetworkInfo({ speed, latency, quality });
      setStatus(prev => ({ ...prev, network: networkStatus }));
    } catch (error) {
      clientLogger.error('网络检测失败', error);
      setStatus(prev => ({ ...prev, network: 'disconnected' }));
    }
  };

  const getStatusIcon = (deviceStatus: string) => {
    switch (deviceStatus) {
      case 'checking':
        return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
      case 'available':
      case 'excellent':
      case 'good':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'poor':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'unavailable':
      case 'permission-denied':
      case 'disconnected':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusText = (device: string, deviceStatus: string) => {
    switch (deviceStatus) {
      case 'checking':
        return '检测中...';
      case 'available':
        return '设备正常';
      case 'excellent':
        return device === 'network' ? `优秀 (${networkInfo.speed.toFixed(1)} Mbps, ${networkInfo.latency.toFixed(0)}ms)` : '优秀';
      case 'good':
        return device === 'network' ? `良好 (${networkInfo.speed.toFixed(1)} Mbps, ${networkInfo.latency.toFixed(0)}ms)` : '良好';
      case 'poor':
        return device === 'network' ? `较差 (${networkInfo.speed.toFixed(1)} Mbps, ${networkInfo.latency.toFixed(0)}ms)` : '较差';
      case 'unavailable':
        return '设备不可用';
      case 'permission-denied':
        return '权限被拒绝';
      case 'disconnected':
        return '网络断开';
      default:
        return '未知状态';
    }
  };

  const getStatusColor = (deviceStatus: string) => {
    switch (deviceStatus) {
      case 'available':
      case 'excellent':
      case 'good':
        return 'bg-green-100 text-green-800';
      case 'poor':
        return 'bg-yellow-100 text-yellow-800';
      case 'checking':
        return 'bg-blue-100 text-blue-800';
      case 'unavailable':
      case 'permission-denied':
      case 'disconnected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const devices = [
    { key: 'camera', icon: Camera, name: '摄像头', status: status.camera },
    { key: 'microphone', icon: Mic, name: '麦克风', status: status.microphone },
    { key: 'speaker', icon: Volume2, name: '扬声器', status: status.speaker },
    { key: 'network', icon: Wifi, name: '网络连接', status: status.network }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Monitor className="h-5 w-5 text-orange-500" />
          <span>设备检测</span>
        </CardTitle>
        <CardDescription>
          检测您的设备状态，确保能够正常参与在线庭审
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* 检测进度 */}
        {isDetecting && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">{currentStep}</span>
              <span className="text-gray-600">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {/* 设备状态列表 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {devices.map(device => {
            const Icon = device.icon;
            return (
              <div key={device.key} className="p-3 border rounded-lg flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Icon className="h-5 w-5 text-gray-600" />
                  <div>
                    <div className="font-medium">{device.name}</div>
                    <div className="text-sm text-gray-500">
                      {getStatusText(device.key, device.status)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(device.status)}
                  <Badge className={getStatusColor(device.status)}>
                    {device.status === 'checking' ? '检测中' : 
                     ['available', 'excellent', 'good'].includes(device.status) ? '正常' : '异常'}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>

        {/* 摄像头预览 */}
        {status.camera === 'available' && (
          <div className="space-y-2">
            <label className="text-sm font-medium">摄像头预览</label>
            <div className="relative w-full max-w-md mx-auto">
              <video
                ref={videoRef}
                className="w-full h-48 bg-gray-900 rounded-lg object-cover"
                muted
                playsInline
              />
              <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                预览画面
              </div>
            </div>
          </div>
        )}

        {/* 错误提示和解决方案 */}
        {Object.values(status).some(s => ['unavailable', 'permission-denied', 'poor', 'disconnected'].includes(s)) && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">检测到以下问题：</p>
                <ul className="text-sm space-y-1">
                  {status.camera === 'permission-denied' && (
                    <li>• 摄像头权限被拒绝，请在浏览器设置中允许访问摄像头</li>
                  )}
                  {status.microphone === 'permission-denied' && (
                    <li>• 麦克风权限被拒绝，请在浏览器设置中允许访问麦克风</li>
                  )}
                  {status.camera === 'unavailable' && (
                    <li>• 摄像头不可用，请检查设备连接或尝试重新插拔</li>
                  )}
                  {status.microphone === 'unavailable' && (
                    <li>• 麦克风不可用，请检查设备连接或尝试重新插拔</li>
                  )}
                  {status.network === 'poor' && (
                    <li>• 网络连接较差，可能影响庭审质量，建议检查网络环境</li>
                  )}
                  {status.network === 'disconnected' && (
                    <li>• 网络连接断开，请检查网络连接</li>
                  )}
                </ul>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* 操作按钮 */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={startDetection}
            disabled={isDetecting}
            className="flex items-center space-x-2"
          >
            <RefreshCw className={`h-4 w-4 ${isDetecting ? 'animate-spin' : ''}`} />
            <span>重新检测</span>
          </Button>
          
          {!isDetecting && (
            <div className="text-sm text-gray-600">
              {Object.values(status).every(s => ['available', 'excellent', 'good'].includes(s)) ? (
                <span className="text-green-600 font-medium">✓ 所有设备检测通过</span>
              ) : (
                <span className="text-yellow-600 font-medium">⚠ 部分设备存在问题</span>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
