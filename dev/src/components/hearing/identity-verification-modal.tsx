// dev/src/components/hearing/identity-verification-modal.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Camera,
  UserCheck,
  CheckCircle,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Shield,
  Eye,
  EyeOff,
  Scan
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onVerificationComplete?: (success: boolean) => void;
}

interface VerificationStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
}

export function IdentityVerificationModal({ isOpen, onClose, onVerificationComplete }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [verificationProgress, setVerificationProgress] = useState(0);
  const [showPreview, setShowPreview] = useState(true);

  const [steps, setSteps] = useState<VerificationStep[]>([
    {
      id: 'camera-setup',
      title: '摄像头准备',
      description: '启动摄像头并调整位置',
      status: 'pending'
    },
    {
      id: 'face-detection',
      title: '人脸检测',
      description: '检测并定位人脸位置',
      status: 'pending'
    },
    {
      id: 'liveness-check',
      title: '活体检测',
      description: '验证真实人脸，防止照片欺骗',
      status: 'pending'
    },
    {
      id: 'identity-match',
      title: '身份比对',
      description: '与实名认证信息进行比对',
      status: 'pending'
    }
  ]);

  // 模拟用户信息
  const userInfo = {
    name: '张某',
    idNumber: '110101199001011234',
    role: '申请人'
  };

  useEffect(() => {
    if (isOpen) {
      startCameraSetup();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCameraSetup = async () => {
    try {
      updateStepStatus('camera-setup', 'in-progress');
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraStream(stream);
      updateStepStatus('camera-setup', 'completed');
      
      // 自动进入下一步
      setTimeout(() => {
        setCurrentStep(1);
        startFaceDetection();
      }, 1000);
    } catch (error) {
      console.error('摄像头启动失败:', error);
      updateStepStatus('camera-setup', 'failed');
    }
  };

  const startFaceDetection = async () => {
    updateStepStatus('face-detection', 'in-progress');
    
    // 模拟人脸检测过程
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    updateStepStatus('face-detection', 'completed');
    
    setTimeout(() => {
      setCurrentStep(2);
      startLivenessCheck();
    }, 500);
  };

  const startLivenessCheck = async () => {
    updateStepStatus('liveness-check', 'in-progress');
    
    // 模拟活体检测过程
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    updateStepStatus('liveness-check', 'completed');
    
    setTimeout(() => {
      setCurrentStep(3);
      startIdentityMatch();
    }, 500);
  };

  const startIdentityMatch = async () => {
    updateStepStatus('identity-match', 'in-progress');
    setIsVerifying(true);
    
    // 模拟身份比对过程
    for (let i = 0; i <= 100; i += 10) {
      setVerificationProgress(i);
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    updateStepStatus('identity-match', 'completed');
    setIsVerifying(false);
    
    // 验证完成
    setTimeout(() => {
      onVerificationComplete?.(true);
    }, 1000);
  };

  const updateStepStatus = (stepId: string, status: VerificationStep['status']) => {
    setSteps(prev => prev.map(step => 
      step.id === stepId ? { ...step, status } : step
    ));
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const imageData = canvas.toDataURL('image/jpeg');
        setCapturedImage(imageData);
      }
    }
  };

  const retryVerification = () => {
    setCurrentStep(0);
    setVerificationProgress(0);
    setCapturedImage(null);
    setSteps(prev => prev.map(step => ({ ...step, status: 'pending' })));
    startCameraSetup();
  };

  const getStepIcon = (step: VerificationStep) => {
    switch (step.status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'in-progress':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'failed':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      default:
        return <div className="h-5 w-5 rounded-full border-2 border-gray-300" />;
    }
  };

  const allStepsCompleted = steps.every(step => step.status === 'completed');
  const hasFailedSteps = steps.some(step => step.status === 'failed');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-orange-500" />
            身份校验
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 左侧：摄像头预览 */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">实时预览</CardTitle>
                <CardDescription>请确保面部清晰可见，光线充足</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden relative">
                    {showPreview ? (
                      <video
                        ref={videoRef}
                        className="w-full h-full object-cover"
                        autoPlay
                        muted
                        playsInline
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <div className="text-center">
                          <EyeOff className="h-12 w-12 mx-auto mb-2" />
                          <p>预览已关闭</p>
                        </div>
                      </div>
                    )}
                    
                    {/* 人脸框指示 */}
                    {currentStep >= 1 && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-48 h-64 border-2 border-green-400 rounded-lg animate-pulse">
                          <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
                            <Badge className="bg-green-500 text-white">
                              <Scan className="h-3 w-3 mr-1" />
                              检测中
                            </Badge>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowPreview(!showPreview)}
                    >
                      {showPreview ? (
                        <>
                          <EyeOff className="h-4 w-4 mr-2" />
                          关闭预览
                        </>
                      ) : (
                        <>
                          <Eye className="h-4 w-4 mr-2" />
                          显示预览
                        </>
                      )}
                    </Button>
                    
                    {currentStep >= 1 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={capturePhoto}
                      >
                        <Camera className="h-4 w-4 mr-2" />
                        拍照
                      </Button>
                    )}
                  </div>
                </div>
                
                <canvas ref={canvasRef} className="hidden" />
              </CardContent>
            </Card>

            {/* 用户信息 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">验证信息</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">姓名：</span>
                    <span className="font-medium">{userInfo.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">身份证：</span>
                    <span className="font-medium">
                      {userInfo.idNumber.replace(/(\d{6})\d{8}(\d{4})/, '$1********$2')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">角色：</span>
                    <span className="font-medium">{userInfo.role}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 右侧：验证步骤 */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">验证进度</CardTitle>
                <CardDescription>
                  {allStepsCompleted ? '验证完成' : `第 ${currentStep + 1} / ${steps.length} 步`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {steps.map((step, index) => (
                    <div
                      key={step.id}
                      className={`flex items-start space-x-3 p-3 rounded-lg transition-colors ${
                        index === currentStep ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'
                      }`}
                    >
                      <div className="flex-shrink-0 mt-0.5">
                        {getStepIcon(step)}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{step.title}</h4>
                        <p className="text-sm text-gray-600">{step.description}</p>
                        {step.status === 'in-progress' && step.id === 'identity-match' && (
                          <div className="mt-2">
                            <Progress value={verificationProgress} className="h-2" />
                            <p className="text-xs text-gray-500 mt-1">
                              比对进度: {verificationProgress}%
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 验证结果 */}
            {allStepsCompleted && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-700">
                  <div className="font-medium mb-1">身份验证成功！</div>
                  <div className="text-sm">
                    您的身份已通过验证，可以正常参与庭审。验证时间：{new Date().toLocaleString()}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {hasFailedSteps && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-medium mb-1">验证失败</div>
                  <div className="text-sm mb-2">
                    请检查摄像头权限和网络连接，确保面部清晰可见。
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={retryVerification}
                    className="mt-2"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    重新验证
                  </Button>
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>

        <DialogFooter>
          <div className="flex items-center justify-between w-full">
            <div className="text-sm text-gray-600">
              {isVerifying ? '正在验证身份...' : '请配合完成身份验证'}
            </div>
            
            <div className="flex items-center space-x-3">
              <Button variant="outline" onClick={onClose}>
                取消
              </Button>
              {allStepsCompleted && (
                <Button onClick={onClose} className="bg-green-600 hover:bg-green-700 text-white">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  验证完成
                </Button>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
