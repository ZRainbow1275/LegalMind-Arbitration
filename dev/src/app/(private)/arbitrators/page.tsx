// dev/src/app/(private)/arbitrators/page.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Search,
  Star,
  MapPin,
  Briefcase,
  Award,
  Users,
  Scale,
  Eye,
  Heart,
  MessageSquare,
  Globe
} from 'lucide-react';

type ArbitratorCard = {
  id: string;
  name: string;
  title: string;
  specialties: string[];
  experience: number;
  cases: number;
  rating: number;
  location: string;
  education: string;
  languages: string[];
  fee: string;
  available: boolean;
  bio: string;
};

// 仲裁员数据
const arbitrators: ArbitratorCard[] = [
  {
    id: 'arb-001',
    name: '张明华',
    title: '高级仲裁员',
    specialties: ['合同纠纷', '公司法', '投资争议', '国际贸易'],
    experience: 15,
    cases: 120,
    rating: 4.8,
    location: '北京',
    education: '清华大学法学院 法学博士',
    languages: ['中文', '英文'],
    fee: '5000/天',
    available: true,
    bio: '资深商事仲裁专家，专注于合同纠纷和投资争议解决，具有丰富的国际仲裁经验。'
  },
  {
    id: 'arb-002',
    name: '李晓红',
    title: '资深仲裁员',
    specialties: ['劳动争议', '知识产权', '建设工程', '医疗纠纷'],
    experience: 12,
    cases: 95,
    rating: 4.9,
    location: '上海',
    education: '复旦大学法学院 法学硕士',
    languages: ['中文', '英文', '日文'],
    fee: '4500/天',
    available: true,
    bio: '劳动法和知识产权领域专家，曾处理多起重大劳动争议案件。'
  },
  {
    id: 'arb-003',
    name: '王建国',
    title: '首席仲裁员',
    specialties: ['金融争议', '证券纠纷', '保险理赔', '银行业务'],
    experience: 20,
    cases: 200,
    rating: 4.7,
    location: '深圳',
    education: '中国政法大学 法学博士',
    languages: ['中文', '英文'],
    fee: '6000/天',
    available: false,
    bio: '金融法领域权威专家，在证券、银行、保险等金融争议解决方面经验丰富。'
  },
  {
    id: 'arb-004',
    name: '陈雅琴',
    title: '高级仲裁员',
    specialties: ['国际贸易', '海商法', '跨境投资', '涉外合同'],
    experience: 18,
    cases: 150,
    rating: 4.8,
    location: '广州',
    education: '中山大学法学院 法学博士',
    languages: ['中文', '英文', '法文'],
    fee: '5500/天',
    available: true,
    bio: '国际商事仲裁专家，精通国际贸易法和海商法，具有丰富的跨境争议处理经验。'
  },
  {
    id: 'arb-005',
    name: '刘德华',
    title: '专业仲裁员',
    specialties: ['房地产', '建设工程', '土地使用权', '物业管理'],
    experience: 10,
    cases: 80,
    rating: 4.6,
    location: '成都',
    education: '西南政法大学 法学硕士',
    languages: ['中文'],
    fee: '3500/天',
    available: true,
    bio: '房地产和建设工程领域专家，对建筑工程质量、工程款支付等争议有丰富处理经验。'
  }
];

export default function ArbitratorsPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');
  const [experienceFilter, setExperienceFilter] = useState('all');
  const [availableOnly, setAvailableOnly] = useState(false);
  const [sortBy, setSortBy] = useState('rating');

  // 获取所有专业领域
  const allSpecialties = [...new Set(arbitrators.flatMap(arb => arb.specialties))];

  // 处理发送消息
  const handleSendMessage = (arbitrator: ArbitratorCard) => {
    // 跳转到消息页面，并预填收件人信息
    const messageData = {
      recipientId: arbitrator.id,
      recipientName: arbitrator.name,
      recipientType: 'arbitrator',
      subject: `咨询仲裁员${arbitrator.name}`,
      template: 'arbitrator-inquiry'
    };

    // 将数据存储到sessionStorage，供消息页面使用
    sessionStorage.setItem('newMessageData', JSON.stringify(messageData));

    // 跳转到消息页面
    router.push('/messages?action=compose');
  };

  // 处理预约咨询
  const handleBookConsultation = (arbitrator: ArbitratorCard) => {
    // 跳转到日程页面，并预填预约信息
    const consultationData = {
      arbitratorId: arbitrator.id,
      arbitratorName: arbitrator.name,
      type: 'consultation',
      title: `与${arbitrator.name}的咨询预约`,
      description: `预约咨询仲裁员${arbitrator.name}，专业领域：${arbitrator.specialties.join('、')}`,
      fee: arbitrator.fee
    };

    // 将数据存储到sessionStorage，供日程页面使用
    sessionStorage.setItem('newConsultationData', JSON.stringify(consultationData));

    // 跳转到日程页面
    router.push('/schedule?action=book-consultation');
  };

  // 获取所有地区
  const allLocations = [...new Set(arbitrators.map(arb => arb.location))];

  // 筛选和排序仲裁员
  const filteredArbitrators = arbitrators
    .filter(arb => {
      const matchesSearch = arb.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           arb.specialties.some(s => s.toLowerCase().includes(searchTerm.toLowerCase())) ||
                           arb.bio.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesSpecialty = specialtyFilter === 'all' || arb.specialties.includes(specialtyFilter);
      const matchesLocation = locationFilter === 'all' || arb.location === locationFilter;
      const matchesExperience = experienceFilter === 'all' ||
                               (experienceFilter === '5-10' && arb.experience >= 5 && arb.experience <= 10) ||
                               (experienceFilter === '10-15' && arb.experience >= 10 && arb.experience <= 15) ||
                               (experienceFilter === '15+' && arb.experience >= 15);
      const matchesAvailable = !availableOnly || arb.available;

      return matchesSearch && matchesSpecialty && matchesLocation && matchesExperience && matchesAvailable;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          return b.rating - a.rating;
        case 'experience':
          return b.experience - a.experience;
        case 'cases':
          return b.cases - a.cases;
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">仲裁员库</h1>
          <p className="text-gray-600 mt-1">
            浏览和选择专业的仲裁员，找到最适合您案件的专家
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Badge variant="outline" className="px-3 py-1">
            共 {arbitrators.length} 名仲裁员
          </Badge>
          <Badge className="bg-green-500 text-white px-3 py-1">
            {arbitrators.filter(a => a.available).length} 名可用
          </Badge>
        </div>
      </div>

      {/* 搜索和筛选 */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* 搜索栏 */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="搜索仲裁员姓名、专业领域或关键词..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* 筛选条件 */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <Select value={specialtyFilter} onValueChange={setSpecialtyFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="专业领域" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部领域</SelectItem>
                  {allSpecialties.map(specialty => (
                    <SelectItem key={specialty} value={specialty}>{specialty}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="地区" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部地区</SelectItem>
                  {allLocations.map(location => (
                    <SelectItem key={location} value={location}>{location}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={experienceFilter} onValueChange={setExperienceFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="经验年限" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部经验</SelectItem>
                  <SelectItem value="5-10">5-10年</SelectItem>
                  <SelectItem value="10-15">10-15年</SelectItem>
                  <SelectItem value="15+">15年以上</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue placeholder="排序方式" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rating">按评分排序</SelectItem>
                  <SelectItem value="experience">按经验排序</SelectItem>
                  <SelectItem value="cases">按案件数排序</SelectItem>
                  <SelectItem value="name">按姓名排序</SelectItem>
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
          </div>
        </CardContent>
      </Card>

      {/* 结果统计 */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          找到 {filteredArbitrators.length} 名符合条件的仲裁员
        </div>
      </div>

      {/* 仲裁员列表 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredArbitrators.map(arbitrator => (
          <Card
            key={arbitrator.id}
            className={`hover:shadow-lg transition-all duration-300 ${!arbitrator.available ? 'opacity-75' : ''}`}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                    {arbitrator.name.charAt(0)}
                  </div>
                  <div>
                    <CardTitle className="text-lg">{arbitrator.name}</CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      <Scale className="h-4 w-4" />
                      {arbitrator.title}
                      {!arbitrator.available && (
                        <Badge variant="secondary" className="text-xs">暂不可用</Badge>
                      )}
                    </CardDescription>
                  </div>
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

            <CardContent className="space-y-4">
              {/* 专业领域 */}
              <div className="flex flex-wrap gap-1">
                {arbitrator.specialties.slice(0, 3).map(specialty => (
                  <Badge key={specialty} variant="secondary" className="text-xs">
                    {specialty}
                  </Badge>
                ))}
                {arbitrator.specialties.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{arbitrator.specialties.length - 3}
                  </Badge>
                )}
              </div>

              {/* 基本信息 */}
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
                  <Award className="h-3 w-3" />
                  {arbitrator.fee}
                </div>
                <div className="flex items-center gap-1">
                  <Globe className="h-3 w-3" />
                  {arbitrator.languages.join('、')}
                </div>
              </div>

              {/* 简介 */}
              <p className="text-xs text-gray-500 line-clamp-2">
                {arbitrator.bio}
              </p>

              {/* 操作按钮 */}
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    title="收藏仲裁员"
                  >
                    <Heart className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSendMessage(arbitrator)}
                    title="发送消息"
                    className="hover:bg-blue-50 hover:text-blue-600"
                  >
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex items-center space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleBookConsultation(arbitrator)}
                    className="border-green-500 text-green-600 hover:bg-green-50"
                  >
                    预约咨询
                  </Button>
                  <Button
                    size="sm"
                    className="bg-orange-500 hover:bg-orange-600 text-white"
                    asChild
                  >
                    <Link href={`/arbitrators/${arbitrator.id}`}>
                      <Eye className="h-4 w-4 mr-2" />
                      查看详情
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 空状态 */}
      {filteredArbitrators.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">未找到匹配的仲裁员</h3>
            <p className="text-gray-500 mb-4">尝试调整搜索条件或筛选器</p>
            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm('');
                setSpecialtyFilter('all');
                setLocationFilter('all');
                setExperienceFilter('all');
                setAvailableOnly(false);
              }}
            >
              重置筛选条件
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
