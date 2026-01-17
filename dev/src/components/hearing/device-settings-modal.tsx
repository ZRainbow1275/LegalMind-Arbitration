// dev/src/components/hearing/device-settings-modal.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Camera,
  Mic,
  Volume2,
  Monitor,
  Settings,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Play,
  Square,
  Wifi,
  Signal
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSettingsApplied?: () => void;
}

interface DeviceInfo {
  deviceId: string;
  label: string;
  kind: MediaDeviceKind;
}

interface DeviceSettings {
  camera: {
    deviceId: string;
    resolution: string;
    frameRate: number;
  };
  microphone: {
    deviceId: string;
    volume: number;
    noiseCancellation: boolean;
  };
  speaker: {
    deviceId: string;
    volume: number;
  };
  network: {
    quality: 'auto' | 'high' | 'medium' | 'low';
    bandwidth: number;
  };
}

export function DeviceSettingsModal({ isOpen, onClose, onSettingsApplied }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [currentStream, setCurrentStream] = useState<MediaStream | null>(null);
  const [isTestingAudio, setIsTestingAudio] = useState(false);
  const [networkStats, setNetworkStats] = useState({
    latency: 0,
    bandwidth: 0,
    packetLoss: 0
  });

  const [settings, setSettings] = useState<DeviceSettings>({
    camera: {
      deviceId: '',
      resolution: '640x480',
      frameRate: 30
    },
    microphone: {
      deviceId: '',
      volume: 80,
      noiseCancellation: true
    },
    speaker: {
      deviceId: '',
      volume: 70
    },
    network: {
      quality: 'auto',
      bandwidth: 1000
    }
  });

  useEffect(() => {
    if (isOpen) {
      loadDevices();
      testNetworkQuality();
    } else {
      stopCurrentStream();
    }

    return () => {
      stopCurrentStream();
    };
  }, [isOpen]);

  const loadDevices = async () => {
    try {
      // 请求权限
      await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      
      const deviceList = await navigator.mediaDevices.enumerateDevices();
      setDevices(deviceList.filter(device => device.label));
      
      // 设置默认设备
      const videoDevices = deviceList.filter(d => d.kind === 'videoinput');
      const audioInputs = deviceList.filter(d => d.kind === 'audioinput');
      const audioOutputs = deviceList.filter(d => d.kind === 'audiooutput');
      
      if (videoDevices.length > 0) {
        setSettings(prev => ({
          ...prev,
          camera: { ...prev.camera, deviceId: videoDevices[0].deviceId }
        }));
      }
      
      if (audioInputs.length > 0) {
        setSettings(prev => ({
          ...prev,
          microphone: { ...prev.microphone, deviceId: audioInputs[0].deviceId }
        }));
      }
      
      if (audioOutputs.length > 0) {
        setSettings(prev => ({
          ...prev,
          speaker: { ...prev.speaker, deviceId: audioOutputs[0].deviceId }
        }));
      }
    } catch (error) {
      console.error('获取设备列表失败:', error);
    }
  };

  const testNetworkQuality = async () => {
    // 模拟网络质量测试
    const startTime = Date.now();
    
    try {
      // 模拟延迟测试
      await fetch('/api/ping', { method: 'HEAD' }).catch(() => {});
      const latency = Date.now() - startTime;
      
      // 模拟带宽测试
      const bandwidth = Math.random() * 1000 + 500; // 500-1500 kbps
      const packetLoss = Math.random() * 5; // 0-5%
      
      setNetworkStats({
        latency,
        bandwidth,
        packetLoss
      });
    } catch (error) {
      console.error('网络测试失败:', error);
    }
  };

  const startCameraPreview = async () => {
    try {
      stopCurrentStream();
      
      const constraints: MediaStreamConstraints = {
        video: {
          deviceId: settings.camera.deviceId ? { exact: settings.camera.deviceId } : undefined,
          width: { ideal: parseInt(settings.camera.resolution.split('x')[0]) },
          height: { ideal: parseInt(settings.camera.resolution.split('x')[1]) },
          frameRate: { ideal: settings.camera.frameRate }
        }
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      
      setCurrentStream(stream);
    } catch (error) {
      console.error('摄像头预览失败:', error);
    }
  };

  const testMicrophone = async () => {
    try {
      setIsTestingAudio(true);
      
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: settings.microphone.deviceId ? { exact: settings.microphone.deviceId } : undefined,
          noiseSuppression: settings.microphone.noiseCancellation,
          echoCancellation: true
        }
      });
      
      // 模拟音频测试
      setTimeout(() => {
        stream.getTracks().forEach(track => track.stop());
        setIsTestingAudio(false);
      }, 3000);
    } catch (error) {
      console.error('麦克风测试失败:', error);
      setIsTestingAudio(false);
    }
  };

  const testSpeaker = () => {
    if (audioRef.current) {
      audioRef.current.volume = settings.speaker.volume / 100;
      audioRef.current.play();
    }
  };

  const stopCurrentStream = () => {
    if (currentStream) {
      currentStream.getTracks().forEach(track => track.stop());
      setCurrentStream(null);
    }
  };

  const applySettings = () => {
    // 保存设置到本地存储
    localStorage.setItem('hearing-device-settings', JSON.stringify(settings));
    onSettingsApplied?.();
    onClose();
  };

  const getDevicesByKind = (kind: MediaDeviceKind) => {
    return devices.filter(device => device.kind === kind);
  };

  const getNetworkQualityColor = () => {
    if (networkStats.latency < 100 && networkStats.packetLoss < 1) return 'text-green-600';
    if (networkStats.latency < 200 && networkStats.packetLoss < 3) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getNetworkQualityText = () => {
    if (networkStats.latency < 100 && networkStats.packetLoss < 1) return '优秀';
    if (networkStats.latency < 200 && networkStats.packetLoss < 3) return '良好';
    return '较差';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-orange-500" />
            设备设置
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="camera" className="flex-1 overflow-hidden">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="camera">摄像头</TabsTrigger>
            <TabsTrigger value="microphone">麦克风</TabsTrigger>
            <TabsTrigger value="speaker">扬声器</TabsTrigger>
            <TabsTrigger value="network">网络</TabsTrigger>
          </TabsList>

          <TabsContent value="camera" className="space-y-4 overflow-auto max-h-96">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Camera className="h-5 w-5" />
                    摄像头设置
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>选择摄像头</Label>
                    <Select
                      value={settings.camera.deviceId}
                      onValueChange={(value) => setSettings(prev => ({
                        ...prev,
                        camera: { ...prev.camera, deviceId: value }
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="选择摄像头设备" />
                      </SelectTrigger>
                      <SelectContent>
                        {getDevicesByKind('videoinput').map(device => (
                          <SelectItem key={device.deviceId} value={device.deviceId}>
                            {device.label || `摄像头 ${device.deviceId.slice(0, 8)}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>分辨率</Label>
                    <Select
                      value={settings.camera.resolution}
                      onValueChange={(value) => setSettings(prev => ({
                        ...prev,
                        camera: { ...prev.camera, resolution: value }
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1920x1080">1920x1080 (高清)</SelectItem>
                        <SelectItem value="1280x720">1280x720 (标清)</SelectItem>
                        <SelectItem value="640x480">640x480 (低清)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>帧率: {settings.camera.frameRate} fps</Label>
                    <Slider
                      value={[settings.camera.frameRate]}
                      onValueChange={([value]) => setSettings(prev => ({
                        ...prev,
                        camera: { ...prev.camera, frameRate: value }
                      }))}
                      min={15}
                      max={60}
                      step={15}
                      className="w-full"
                    />
                  </div>

                  <Button onClick={startCameraPreview} className="w-full">
                    <Play className="h-4 w-4 mr-2" />
                    开始预览
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">预览窗口</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden">
                    <video
                      ref={videoRef}
                      className="w-full h-full object-cover"
                      autoPlay
                      muted
                      playsInline
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="microphone" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Mic className="h-5 w-5" />
                  麦克风设置
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>选择麦克风</Label>
                  <Select
                    value={settings.microphone.deviceId}
                    onValueChange={(value) => setSettings(prev => ({
                      ...prev,
                      microphone: { ...prev.microphone, deviceId: value }
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择麦克风设备" />
                    </SelectTrigger>
                    <SelectContent>
                      {getDevicesByKind('audioinput').map(device => (
                        <SelectItem key={device.deviceId} value={device.deviceId}>
                          {device.label || `麦克风 ${device.deviceId.slice(0, 8)}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>音量: {settings.microphone.volume}%</Label>
                  <Slider
                    value={[settings.microphone.volume]}
                    onValueChange={([value]) => setSettings(prev => ({
                      ...prev,
                      microphone: { ...prev.microphone, volume: value }
                    }))}
                    min={0}
                    max={100}
                    step={5}
                    className="w-full"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="noise-cancellation"
                    checked={settings.microphone.noiseCancellation}
                    onCheckedChange={(checked) => setSettings(prev => ({
                      ...prev,
                      microphone: { ...prev.microphone, noiseCancellation: checked }
                    }))}
                  />
                  <Label htmlFor="noise-cancellation">噪音消除</Label>
                </div>

                <Button 
                  onClick={testMicrophone} 
                  disabled={isTestingAudio}
                  className="w-full"
                >
                  {isTestingAudio ? (
                    <>
                      <Square className="h-4 w-4 mr-2" />
                      测试中...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      测试麦克风
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="speaker" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Volume2 className="h-5 w-5" />
                  扬声器设置
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>选择扬声器</Label>
                  <Select
                    value={settings.speaker.deviceId}
                    onValueChange={(value) => setSettings(prev => ({
                      ...prev,
                      speaker: { ...prev.speaker, deviceId: value }
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择扬声器设备" />
                    </SelectTrigger>
                    <SelectContent>
                      {getDevicesByKind('audiooutput').map(device => (
                        <SelectItem key={device.deviceId} value={device.deviceId}>
                          {device.label || `扬声器 ${device.deviceId.slice(0, 8)}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>音量: {settings.speaker.volume}%</Label>
                  <Slider
                    value={[settings.speaker.volume]}
                    onValueChange={([value]) => setSettings(prev => ({
                      ...prev,
                      speaker: { ...prev.speaker, volume: value }
                    }))}
                    min={0}
                    max={100}
                    step={5}
                    className="w-full"
                  />
                </div>

                <Button onClick={testSpeaker} className="w-full">
                  <Play className="h-4 w-4 mr-2" />
                  测试扬声器
                </Button>

                <audio ref={audioRef} preload="auto">
                  <source src="/audio/test-tone.mp3" type="audio/mpeg" />
                </audio>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="network" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Wifi className="h-5 w-5" />
                  网络设置
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{networkStats.latency}ms</div>
                    <div className="text-sm text-gray-600">延迟</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{networkStats.bandwidth.toFixed(0)}kbps</div>
                    <div className="text-sm text-gray-600">带宽</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{networkStats.packetLoss.toFixed(1)}%</div>
                    <div className="text-sm text-gray-600">丢包率</div>
                  </div>
                </div>

                <div className="flex items-center justify-center">
                  <Badge className={getNetworkQualityColor()}>
                    <Signal className="h-3 w-3 mr-1" />
                    网络质量: {getNetworkQualityText()}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <Label>视频质量</Label>
                  <Select
                    value={settings.network.quality}
                    onValueChange={(value) =>
                      setSettings((prev) => ({
                        ...prev,
                        network: {
                          ...prev.network,
                          quality: value as DeviceSettings['network']['quality'],
                        },
                      }))
                    }
                    >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">自动调节</SelectItem>
                      <SelectItem value="high">高质量</SelectItem>
                      <SelectItem value="medium">中等质量</SelectItem>
                      <SelectItem value="low">低质量</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button onClick={testNetworkQuality} className="w-full">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  重新测试网络
                </Button>

                {networkStats.latency > 200 && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      网络延迟较高，可能影响庭审质量。建议检查网络连接或降低视频质量。
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <div className="flex items-center justify-between w-full">
            <div className="text-sm text-gray-600">
              设置将保存到本地，下次自动应用
            </div>
            
            <div className="flex items-center space-x-3">
              <Button variant="outline" onClick={onClose}>
                取消
              </Button>
              <Button onClick={applySettings} className="bg-orange-500 hover:bg-orange-600 text-white">
                <CheckCircle className="h-4 w-4 mr-2" />
                应用设置
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
