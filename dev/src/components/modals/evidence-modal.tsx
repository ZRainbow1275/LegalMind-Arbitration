// dev/src/components/modals/evidence-modal.tsx
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Upload,
  FileText,
  Image,
  Video,
  Download,
  Eye,
  MessageSquare,
  Calendar,
  Clock,
  User,
  Plus,
  Trash2,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  caseId: string;
}

// 模拟证据数据
const mockEvidences = [
  {
    id: 'ev-001',
    name: '合同原件.pdf',
    type: 'document',
    category: '合同文件',
    description: '双方签署的原始合同文件',
    uploadDate: '2024-11-10',
    uploadBy: '申请人',
    size: '2.5MB',
    status: 'submitted',
    crossExamination: [
      {
        id: 'ce-001',
        party: '被申请人',
        opinion: '对合同真实性无异议，但对第三条款的理解存在分歧',
        date: '2024-11-12',
        status: 'submitted'
      }
    ]
  },
  {
    id: 'ev-002',
    name: '付款凭证.jpg',
    type: 'image',
    category: '财务凭证',
    description: '银行转账凭证截图',
    uploadDate: '2024-11-11',
    uploadBy: '申请人',
    size: '1.2MB',
    status: 'submitted',
    crossExamination: []
  },
  {
    id: 'ev-003',
    name: '会议录音.mp3',
    type: 'audio',
    category: '录音录像',
    description: '双方协商会议录音',
    uploadDate: '2024-11-12',
    uploadBy: '申请人',
    size: '15.8MB',
    status: 'pending',
    crossExamination: []
  }
];

export function EvidenceModal({ isOpen, onClose, caseId }: Props) {
  const [activeTab, setActiveTab] = useState('list');
  const [selectedEvidence, setSelectedEvidence] = useState<string | null>(null);
  const [newEvidence, setNewEvidence] = useState({
    name: '',
    category: '',
    description: '',
    file: null as File | null
  });
  const [crossExaminationText, setCrossExaminationText] = useState('');

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setNewEvidence(prev => ({
        ...prev,
        name: file.name,
        file
      }));
    }
  };

  const handleSubmitEvidence = () => {
    if (!newEvidence.name || !newEvidence.category || !newEvidence.description) {
      alert('请填写完整的证据信息');
      return;
    }
    
    alert('证据提交成功！');
    setNewEvidence({
      name: '',
      category: '',
      description: '',
      file: null
    });
    setActiveTab('list');
  };

  const handleSubmitCrossExamination = () => {
    if (!crossExaminationText.trim()) {
      alert('请输入质证意见');
      return;
    }
    
    alert('质证意见提交成功！');
    setCrossExaminationText('');
    setSelectedEvidence(null);
  };

  const getEvidenceIcon = (type: string) => {
    switch (type) {
      case 'document': return FileText;
      case 'image': return Image;
      case 'audio':
      case 'video': return Video;
      default: return FileText;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'submitted': return '已提交';
      case 'pending': return '待审核';
      case 'rejected': return '被驳回';
      default: return '未知';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-xl">举证质证</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="list">证据列表</TabsTrigger>
            <TabsTrigger value="submit">提交证据</TabsTrigger>
            <TabsTrigger value="cross-exam">质证意见</TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="space-y-4 overflow-auto max-h-96">
            <div className="grid grid-cols-1 gap-4">
              {mockEvidences.map(evidence => {
                const Icon = getEvidenceIcon(evidence.type);
                return (
                  <Card key={evidence.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Icon className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{evidence.name}</CardTitle>
                            <CardDescription className="flex items-center gap-2 mt-1">
                              <Badge variant="outline">{evidence.category}</Badge>
                              <Badge className={getStatusColor(evidence.status)}>
                                {getStatusText(evidence.status)}
                              </Badge>
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setSelectedEvidence(evidence.id);
                              setActiveTab('cross-exam');
                            }}
                          >
                            <MessageSquare className="h-4 w-4 mr-2" />
                            质证
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-3">
                      <p className="text-sm text-gray-600">{evidence.description}</p>
                      
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center space-x-4">
                          <span className="flex items-center">
                            <User className="h-3 w-3 mr-1" />
                            {evidence.uploadBy}
                          </span>
                          <span className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            {evidence.uploadDate}
                          </span>
                          <span>{evidence.size}</span>
                        </div>
                      </div>

                      {/* 质证意见 */}
                      {evidence.crossExamination.length > 0 && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                          <h4 className="text-sm font-medium mb-2 flex items-center">
                            <MessageSquare className="h-4 w-4 mr-2" />
                            质证意见
                          </h4>
                          {evidence.crossExamination.map(ce => (
                            <div key={ce.id} className="text-sm">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-medium">{ce.party}</span>
                                <span className="text-gray-500">{ce.date}</span>
                              </div>
                              <p className="text-gray-700">{ce.opinion}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="submit" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>提交新证据</CardTitle>
                <CardDescription>上传证据文件并填写相关信息</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="file-upload">选择文件</Label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600 mb-2">
                      点击选择文件或拖拽文件到此处
                    </p>
                    <p className="text-xs text-gray-500">
                      支持 PDF、DOC、DOCX、JPG、PNG、MP3、MP4 格式，单个文件不超过 50MB
                    </p>
                    <input
                      id="file-upload"
                      type="file"
                      className="hidden"
                      onChange={handleFileUpload}
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.mp3,.mp4"
                    />
                    <Button 
                      variant="outline" 
                      className="mt-3"
                      onClick={() => document.getElementById('file-upload')?.click()}
                    >
                      选择文件
                    </Button>
                  </div>
                  {newEvidence.name && (
                    <div className="flex items-center space-x-2 p-2 bg-blue-50 rounded">
                      <FileText className="h-4 w-4 text-blue-600" />
                      <span className="text-sm">{newEvidence.name}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">证据类别</Label>
                  <Select value={newEvidence.category} onValueChange={(value) => 
                    setNewEvidence(prev => ({ ...prev, category: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="选择证据类别" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="合同文件">合同文件</SelectItem>
                      <SelectItem value="财务凭证">财务凭证</SelectItem>
                      <SelectItem value="通信记录">通信记录</SelectItem>
                      <SelectItem value="录音录像">录音录像</SelectItem>
                      <SelectItem value="鉴定报告">鉴定报告</SelectItem>
                      <SelectItem value="其他">其他</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">证据说明</Label>
                  <Textarea
                    id="description"
                    placeholder="请详细说明该证据的内容和证明目的..."
                    value={newEvidence.description}
                    onChange={(e) => setNewEvidence(prev => ({ ...prev, description: e.target.value }))}
                    rows={4}
                  />
                </div>

                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    请确保上传的证据真实有效。虚假证据将承担相应的法律责任。
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cross-exam" className="space-y-4">
            {selectedEvidence ? (
              <Card>
                <CardHeader>
                  <CardTitle>质证意见</CardTitle>
                  <CardDescription>
                    对证据 “{mockEvidences.find(e => e.id === selectedEvidence)?.name}” 发表质证意见
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="cross-examination">质证意见</Label>
                    <Textarea
                      id="cross-examination"
                      placeholder="请发表您对该证据的质证意见，包括对证据真实性、合法性、关联性的认定..."
                      value={crossExaminationText}
                      onChange={(e) => setCrossExaminationText(e.target.value)}
                      rows={6}
                    />
                  </div>

                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      质证意见一经提交不可修改，请仔细核对后提交。
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>请先在证据列表中选择要质证的证据</p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <div className="flex items-center justify-between w-full">
            <div className="text-sm text-gray-600">
              {activeTab === 'list' && `共 ${mockEvidences.length} 项证据`}
              {activeTab === 'submit' && '请填写完整信息后提交'}
              {activeTab === 'cross-exam' && selectedEvidence && '请发表质证意见'}
            </div>
            
            <div className="flex items-center space-x-3">
              <Button variant="outline" onClick={onClose}>
                关闭
              </Button>
              {activeTab === 'submit' && (
                <Button onClick={handleSubmitEvidence} className="bg-orange-500 hover:bg-orange-600 text-white">
                  提交证据
                </Button>
              )}
              {activeTab === 'cross-exam' && selectedEvidence && (
                <Button onClick={handleSubmitCrossExamination} className="bg-orange-500 hover:bg-orange-600 text-white">
                  提交质证意见
                </Button>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
