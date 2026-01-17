// dev/src/components/modals/arbitrator-selection-modal.tsx
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useTribunalStore } from '@/store/tribunal';
import {
  Search,
  Star,
  MapPin,
  Briefcase,
  GraduationCap,
  Award,
  Users,
  Scale,
  CheckCircle,
  Clock
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  caseId: string;
}

// 模拟仲裁员数据
const mockArbitrators = [
  {
    id: 'arb-001',
    name: '张明华',
    title: '高级仲裁员',
    specialties: ['合同纠纷', '公司法', '投资争议'],
    experience: 15,
    cases: 120,
    rating: 4.8,
    location: '北京',
    education: '清华大学法学院',
    languages: ['中文', '英文'],
    fee: '5000/天',
    available: true,
    bio: '资深商事仲裁专家，专注于合同纠纷和投资争议解决，具有丰富的国际仲裁经验。'
  },
  {
    id: 'arb-002',
    name: '李晓红',
    title: '资深仲裁员',
    specialties: ['劳动争议', '知识产权', '建设工程'],
    experience: 12,
    cases: 95,
    rating: 4.9,
    location: '上海',
    education: '复旦大学法学院',
    languages: ['中文', '英文', '日文'],
    fee: '4500/天',
    available: true,
    bio: '劳动法和知识产权领域专家，曾处理多起重大劳动争议案件。'
  },
  {
    id: 'arb-003',
    name: '王建国',
    title: '首席仲裁员',
    specialties: ['金融争议', '证券纠纷', '保险理赔'],
    experience: 20,
    cases: 200,
    rating: 4.7,
    location: '深圳',
    education: '中国政法大学',
    languages: ['中文', '英文'],
    fee: '6000/天',
    available: false,
    bio: '金融法领域权威专家，在证券、银行、保险等金融争议解决方面经验丰富。'
  },
  {
    id: 'arb-004',
    name: '陈雅琴',
    title: '高级仲裁员',
    specialties: ['国际贸易', '海商法', '跨境投资'],
    experience: 18,
    cases: 150,
    rating: 4.8,
    location: '广州',
    education: '中山大学法学院',
    languages: ['中文', '英文', '法文'],
    fee: '5500/天',
    available: true,
    bio: '国际商事仲裁专家，精通国际贸易法和海商法，具有丰富的跨境争议处理经验。'
  }
];

export function ArbitratorSelectionModal({ isOpen, onClose, caseId }: Props) {
  const { get, addArbitrator, removeArbitrator, setPresiding, confirm } = useTribunalStore();
  const tribunal = get(caseId) || { caseId, arbitrators: [], status: 'forming' };
  
  const [searchTerm, setSearchTerm] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');
  const [availableOnly, setAvailableOnly] = useState(true);
  const [selectedTab, setSelectedTab] = useState('browse');

  const filteredArbitrators = mockArbitrators.filter(arb => {
    const matchesSearch = arb.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         arb.specialties.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesSpecialty = specialtyFilter === 'all' || arb.specialties.includes(specialtyFilter);
    const matchesLocation = locationFilter === 'all' || arb.location === locationFilter;
    const matchesAvailable = !availableOnly || arb.available;
    
    return matchesSearch && matchesSpecialty && matchesLocation && matchesAvailable;
  });

  const selectedArbitrators = mockArbitrators.filter(arb => tribunal.arbitrators.includes(arb.id));
  const presidingArbitrator = mockArbitrators.find(arb => arb.id === tribunal.presiding);

  const handleSelectArbitrator = (arbitratorId: string) => {
    if (tribunal.arbitrators.includes(arbitratorId)) {
      removeArbitrator(caseId, arbitratorId);
    } else {
      addArbitrator(caseId, arbitratorId);
    }
  };

  const handleSetPresiding = (arbitratorId: string) => {
    setPresiding(caseId, arbitratorId);
  };

  const handleConfirmTribunal = () => {
    if (tribunal.arbitrators.length > 0 && tribunal.presiding) {
      confirm(caseId);
      onClose();
    }
  };

  const getSpecialties = () => {
    const allSpecialties = mockArbitrators.flatMap(arb => arb.specialties);
    return [...new Set(allSpecialties)];
  };

  const getLocations = () => {
    const allLocations = mockArbitrators.map(arb => arb.location);
    return [...new Set(allLocations)];
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-xl">仲裁员选择</DialogTitle>
        </DialogHeader>

        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="flex-1 overflow-hidden">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="browse">浏览仲裁员</TabsTrigger>
            <TabsTrigger value="selected">已选仲裁员 ({selectedArbitrators.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="browse" className="flex-1 overflow-hidden">
            <div className="space-y-4 h-full">
              {/* 搜索和筛选 */}
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="搜索仲裁员姓名或专业领域..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <Select value={specialtyFilter} onValueChange={setSpecialtyFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="专业领域" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部领域</SelectItem>
                    {getSpecialties().map(specialty => (
                      <SelectItem key={specialty} value={specialty}>{specialty}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={locationFilter} onValueChange={setLocationFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="地区" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部地区</SelectItem>
                    {getLocations().map(location => (
                      <SelectItem key={location} value={location}>{location}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="available"
                    checked={availableOnly}
                    onCheckedChange={setAvailableOnly}
                  />
                  <Label htmlFor="available" className="text-sm">仅显示可用</Label>
                </div>
              </div>

              {/* 仲裁员列表 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 overflow-auto max-h-96">
                {filteredArbitrators.map(arbitrator => (
                  <Card 
                    key={arbitrator.id} 
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      tribunal.arbitrators.includes(arbitrator.id) ? 'ring-2 ring-orange-500' : ''
                    } ${!arbitrator.available ? 'opacity-60' : ''}`}
                    onClick={() => arbitrator.available && handleSelectArbitrator(arbitrator.id)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg flex items-center gap-2">
                            {arbitrator.name}
                            {tribunal.arbitrators.includes(arbitrator.id) && (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            )}
                            {!arbitrator.available && (
                              <Clock className="h-5 w-5 text-gray-400" />
                            )}
                          </CardTitle>
                          <CardDescription className="flex items-center gap-2 mt-1">
                            <Scale className="h-4 w-4" />
                            {arbitrator.title}
                          </CardDescription>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 text-yellow-500 fill-current" />
                            <span className="text-sm font-medium">{arbitrator.rating}</span>
                          </div>
                          <div className="text-xs text-gray-500">{arbitrator.cases} 案件</div>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-3">
                      <div className="flex flex-wrap gap-1">
                        {arbitrator.specialties.map(specialty => (
                          <Badge key={specialty} variant="secondary" className="text-xs">
                            {specialty}
                          </Badge>
                        ))}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Briefcase className="h-3 w-3" />
                          {arbitrator.experience}年经验
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {arbitrator.location}
                        </div>
                        <div className="flex items-center gap-1">
                          <GraduationCap className="h-3 w-3" />
                          {arbitrator.education}
                        </div>
                        <div className="flex items-center gap-1">
                          <Award className="h-3 w-3" />
                          {arbitrator.fee}
                        </div>
                      </div>
                      
                      <p className="text-xs text-gray-500 line-clamp-2">
                        {arbitrator.bio}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="selected" className="space-y-4">
            {selectedArbitrators.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>尚未选择仲裁员</p>
                <p className="text-sm">请在“浏览仲裁员”标签页中选择合适的仲裁员</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">已选仲裁员</h3>
                  <Badge variant="outline">
                    {selectedArbitrators.length} 人
                  </Badge>
                </div>
                
                <div className="space-y-3">
                  {selectedArbitrators.map(arbitrator => (
                    <Card key={arbitrator.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div>
                            <h4 className="font-medium flex items-center gap-2">
                              {arbitrator.name}
                              {tribunal.presiding === arbitrator.id && (
                                <Badge className="bg-orange-500 text-white">首席仲裁员</Badge>
                              )}
                            </h4>
                            <p className="text-sm text-gray-600">{arbitrator.title}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {tribunal.presiding !== arbitrator.id && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSetPresiding(arbitrator.id)}
                            >
                              设为首席
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeArbitrator(caseId, arbitrator.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            移除
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <div className="flex items-center justify-between w-full">
            <div className="text-sm text-gray-600">
              {selectedArbitrators.length > 0 && (
                <>
                  已选择 {selectedArbitrators.length} 名仲裁员
                  {presidingArbitrator && (
                    <span className="ml-2">
                      • 首席：{presidingArbitrator.name}
                    </span>
                  )}
                </>
              )}
            </div>
            
            <div className="flex items-center space-x-3">
              <Button variant="outline" onClick={onClose}>
                取消
              </Button>
              <Button
                onClick={handleConfirmTribunal}
                disabled={selectedArbitrators.length === 0 || !tribunal.presiding}
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                确认仲裁庭组成
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
