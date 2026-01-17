// dev/src/app/(private)/settings/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { HelpCircle, Search, Video, MessageSquare, Phone as PhoneIcon, Mail as MailIcon, Clock as ClockIcon, FileText as FileTextIcon, Download as DownloadIcon } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';
import type { HelpCategory, FAQItem } from '@/config/help';
import { helpCategories as helpCategoriesConfig, faqData as faqDataConfig } from '@/config/help';
import { useRole } from '@/components/layout/role-switcher';
import { useUserStore } from '@/store';
import { logger } from '@/lib/logger';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  User,
  Bell,
  Shield,
  Palette,
  Globe,
  Database,
  Key,
  Mail,
  Phone,
  MapPin,
  Camera,
  Save,
  RefreshCw,
  Trash2,
  Download,
  Upload,
  Monitor,
  Smartphone
} from 'lucide-react';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');
  const searchParams = useSearchParams();
  const router = useRouter();
  const { currentRole } = useRole();
  const { currentUser, profile: userProfile } = useUserStore();
  const isVerified = userProfile?.verificationStatus === 'verified';
  useEffect(() => {
    const t = searchParams.get('tab') || 'profile';
    if (t !== activeTab) setActiveTab(t);
  }, [searchParams, activeTab]);
  useEffect(() => {
    const params = new URLSearchParams();
    if(activeTab !== 'profile') params.set('tab', activeTab);
    router.replace(`/settings${params.toString()?`?${params}`:''}`);    
  }, [activeTab, router]);
  const NOTIFICATIONS_DEFAULT = {
    email: true,
    push: true,
    sms: false,
    caseUpdates: true,
    deadlineReminders: true,
    systemAlerts: false
  };
  const [notifications, setNotifications] = useState(NOTIFICATIONS_DEFAULT);

  // 获取角色显示名称
  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'arbitrator': return '仲裁员';
      case 'applicant': return '申请人';
      case 'respondent': return '被申请人';
      default: return '用户';
    }
  };

  // 动态生成profile默认值的函数
  const getProfileDefault = useCallback(() => ({
    name:
      (userProfile && 'realName' in userProfile ? userProfile.realName : null) ||
      (userProfile && 'companyName' in userProfile ? userProfile.companyName : null) ||
      currentUser?.email?.split('@')[0] ||
      '用户',
    email: currentUser?.email || 'user@example.com',
    phone: userProfile?.phone || '138****1234',
    title: getRoleDisplayName(currentRole),
    department: currentRole === 'arbitrator' ? '商事仲裁部' : '当事人',
    location: userProfile?.address || '未设置',
    bio: currentRole === 'arbitrator'
      ? '专注于商事争议解决，具有丰富仲裁经验。'
      : '平台注册用户，参与仲裁案件处理。'
  }), [currentRole, userProfile, currentUser]);

  const [profile, setProfile] = useState(() => getProfileDefault());

  // 当角色切换时更新profile
  useEffect(() => {
    const newProfile = getProfileDefault();
    setProfile(prev => ({
      ...prev,
      title: newProfile.title,
      department: newProfile.department,
      bio: newProfile.bio
    }));
  }, [getProfileDefault]);

  // 从本地存储加载设置
  useEffect(()=>{
    try {
      const p = localStorage.getItem('settings_profile');
      if(p){
        const parsed = JSON.parse(p);
        if(parsed && typeof parsed==='object') {
          // 合并保存的设置和当前角色信息
          const currentDefaults = getProfileDefault();
          setProfile({
            ...parsed,
            title: currentDefaults.title,
            department: currentDefaults.department,
            bio: currentDefaults.bio
          });
        }
      }
    } catch (e) {
      logger.error({ err: e }, 'Failed to load settings_profile from localStorage');
    }
    try {
      const n = localStorage.getItem('settings_notifications');
      if(n){ const parsed = JSON.parse(n); if(parsed && typeof parsed==='object') setNotifications(parsed); }
    } catch (e) {
      logger.error({ err: e }, 'Failed to load settings_notifications from localStorage');
    }
  }, [getProfileDefault]);

	  // 帮助中心数据与状态
	  const [helpTab, setHelpTab] = useState('docs');
	  const [helpSearch, setHelpSearch] = useState('');

	  const helpCategories: HelpCategory[] = helpCategoriesConfig;

	  const faqData: FAQItem[] = faqDataConfig;

	  const filteredCategories = helpCategories.filter((category) =>
	    category.title.toLowerCase().includes(helpSearch.toLowerCase()) ||
	    category.description.toLowerCase().includes(helpSearch.toLowerCase()) ||
	    category.articles.some((a) => a.title.toLowerCase().includes(helpSearch.toLowerCase()))
	  );
	  const filteredFAQs = faqData.filter((faq) =>
	    faq.question.toLowerCase().includes(helpSearch.toLowerCase()) ||
	    faq.answer.toLowerCase().includes(helpSearch.toLowerCase()) ||
	    faq.category.toLowerCase().includes(helpSearch.toLowerCase())
	  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* 页面头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">系统设置</h1>
          <p className="text-gray-600 mt-1">管理您的账户和系统偏好设置</p>
        </div>
      </div>

      {/* 设置标签页 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="profile">个人资料</TabsTrigger>
          <TabsTrigger value="notifications">通知设置</TabsTrigger>
          <TabsTrigger value="security">安全设置</TabsTrigger>
          <TabsTrigger value="appearance">外观设置</TabsTrigger>
          <TabsTrigger value="system">系统设置</TabsTrigger>
          <TabsTrigger value="data">数据管理</TabsTrigger>
          <TabsTrigger value="help">帮助与支持</TabsTrigger>
        </TabsList>

        {/* 个人资料 */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                个人信息
              </CardTitle>
              <CardDescription>管理您的个人资料和联系信息</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 头像设置 */}
              <div className="flex items-center gap-6">
                <Avatar className="h-24 w-24">
                  <AvatarFallback className="text-lg bg-gradient-to-r from-orange-500 to-orange-600 text-white">张</AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <Button variant="outline" size="sm">
                    <Camera className="h-4 w-4 mr-2" />
                    更换头像
                  </Button>
                  <p className="text-sm text-gray-500">支持 JPG、PNG 格式，建议尺寸 200x200</p>
                </div>
              </div>

              <Separator />

              {/* 基本信息 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">姓名</Label>
                  <Input
                    id="name"
                    value={profile.name}
                    onChange={(e) => setProfile({...profile, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="title">当前身份</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="title"
                      value={getRoleDisplayName(currentRole)}
                      disabled
                      className="bg-gray-50"
                    />
                    <Badge variant="outline" className="text-xs">
                      {currentRole === 'arbitrator' ? '仲裁员' : '当事人'}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500">
                    身份由系统根据您的邮箱自动识别，如需变更请联系管理员
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">邮箱</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile({...profile, email: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">电话</Label>
                  <Input
                    id="phone"
                    value={profile.phone}
                    onChange={(e) => setProfile({...profile, phone: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">部门</Label>
                  <Select value={profile.department} onValueChange={(value) => setProfile({...profile, department: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="商事仲裁部">商事仲裁部</SelectItem>
                      <SelectItem value="劳动仲裁部">劳动仲裁部</SelectItem>
                      <SelectItem value="知识产权部">知识产权部</SelectItem>
                      <SelectItem value="国际仲裁部">国际仲裁部</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">所在地</Label>
                  <Input
                    id="location"
                    value={profile.location}
                    onChange={(e) => setProfile({...profile, location: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">个人简介</Label>
                <Textarea
                  id="bio"
                  value={profile.bio}
                  onChange={(e) => setProfile({...profile, bio: e.target.value})}
                  rows={3}
                />
              </div>

              {/* 实名认证状态 */}
              <div className="space-y-4 p-4 border border-border rounded-lg bg-gray-50">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">实名认证状态</h4>
                    <p className="text-sm text-gray-600">完成实名认证以使用完整功能</p>
                    </div>
                    <Badge
                      variant={isVerified ? "default" : "secondary"}
                      className={isVerified ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}
                    >
                      {isVerified ? "已认证" : "未认证"}
                    </Badge>
                  </div>

                  {!isVerified && (
                    <div className="space-y-3">
                      <p className="text-sm text-gray-600">
                        请上传身份证件完成实名认证，认证后可享受完整的仲裁服务。
                      </p>
                    <Button
                      size="sm"
                      onClick={() => {
                          // 模拟认证过程
                          const confirmed = confirm('确认开始实名认证流程？\n\n这是一个模拟过程，点击确认后将标记为已认证。');
                          if (confirmed) {
                            // 更新用户认证状态
                            const { setProfile: updateUserProfile } = useUserStore.getState();
                            if (!currentUser?.id) {
                              alert('请先登录后再进行实名认证');
                              return;
                            }

                            if (!userProfile) {
                              alert('未找到用户认证资料，请先完善个人/企业资料');
                              return;
                            }

                            updateUserProfile({
                              ...userProfile,
                              verificationStatus: 'verified',
                              verifiedAt: new Date().toISOString(),
                            });
                            alert('实名认证完成！');
                          }
                        }}
                      >
                        开始认证
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={()=>{ setProfile(getProfileDefault()); localStorage.removeItem('settings_profile'); }}>重置</Button>     
                <Button onClick={()=>{ localStorage.setItem('settings_profile', JSON.stringify(profile)); alert('已保存'); }}>
                  <Save className="h-4 w-4 mr-2" />
                  保存更改
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 通知设置 */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                通知偏好
              </CardTitle>
              <CardDescription>选择您希望接收的通知类型和方式</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 通知方式 */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">通知方式</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">邮件通知</Label>
                      <p className="text-sm text-gray-500">通过邮件接收重要通知</p>
                    </div>
                    <Switch
                      checked={notifications.email}
                      onCheckedChange={(checked) => setNotifications({...notifications, email: checked})}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">推送通知</Label>
                      <p className="text-sm text-gray-500">在浏览器中显示推送通知</p>
                    </div>
                    <Switch
                      checked={notifications.push}
                      onCheckedChange={(checked) => setNotifications({...notifications, push: checked})}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">短信通知</Label>
                      <p className="text-sm text-gray-500">通过短信接收紧急通知</p>
                    </div>
                    <Switch
                      checked={notifications.sms}
                      onCheckedChange={(checked) => setNotifications({...notifications, sms: checked})}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* 通知内容 */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">通知内容</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">案件更新</Label>
                      <p className="text-sm text-gray-500">案件状态变更时通知</p>
                    </div>
                    <Switch
                      checked={notifications.caseUpdates}
                      onCheckedChange={(checked) => setNotifications({...notifications, caseUpdates: checked})}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">截止日期提醒</Label>
                      <p className="text-sm text-gray-500">重要截止日期前提醒</p>
                    </div>
                    <Switch
                      checked={notifications.deadlineReminders}
                      onCheckedChange={(checked) => setNotifications({...notifications, deadlineReminders: checked})}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">系统公告</Label>
                      <p className="text-sm text-gray-500">系统维护和更新通知</p>
                    </div>
                    <Switch
                      checked={notifications.systemAlerts}
                      onCheckedChange={(checked) => setNotifications({...notifications, systemAlerts: checked})}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={()=>{ setNotifications(NOTIFICATIONS_DEFAULT); localStorage.removeItem('settings_notifications'); }}>重置</Button>
                <Button onClick={()=>{ localStorage.setItem('settings_notifications', JSON.stringify(notifications)); alert('已保存'); }}>
                  <Save className="h-4 w-4 mr-2" />
                  保存设置
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 安全设置 */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                账户安全
              </CardTitle>
              <CardDescription>管理您的密码和安全设置</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 密码设置 */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">密码管理</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="current-password">当前密码</Label>
                    <Input id="current-password" type="password" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-password">新密码</Label>
                    <Input id="new-password" type="password" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">确认新密码</Label>
                    <Input id="confirm-password" type="password" />
                  </div>
                  <Button>更新密码</Button>
                </div>
              </div>

              <Separator />

              {/* 两步验证 */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">两步验证</h3>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">启用两步验证</Label>
                    <p className="text-sm text-gray-500">为您的账户添加额外的安全保护</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">未启用</Badge>
                    <Button variant="outline" size="sm">设置</Button>
                  </div>
                </div>
              </div>

              <Separator />

              {/* 安全警报 */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">安全警报</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">异常登录提醒</Label>
                      <p className="text-sm text-gray-500">检测到异常登录时发送邮件通知</p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">新设备登录</Label>
                      <p className="text-sm text-gray-500">在新设备登录时发送验证码</p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">密码修改通知</Label>
                      <p className="text-sm text-gray-500">密码被修改时立即通知</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>
              </div>

              <Separator />

              {/* 设备管理 */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">已登录设备</h3>
                  <Button variant="outline" size="sm">
                    注销所有设备
                  </Button>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <Monitor className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium">Windows PC - Chrome</p>
                        <p className="text-sm text-gray-500">当前设备 • 北京 • 刚刚活跃</p>
                      </div>
                    </div>
                    <Badge variant="secondary">当前</Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Smartphone className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium">iPhone - Safari</p>
                        <p className="text-sm text-gray-500">上海 • 2小时前</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      注销
                    </Button>
                  </div>
                </div>
              </div>

              <Separator />

              {/* 登录记录 */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">最近登录</h3>
                <div className="space-y-3">
                  {[
                    { device: 'Chrome on Windows', location: '北京市', time: '2024-01-30 09:15', current: true },
                    { device: 'Safari on iPhone', location: '北京市', time: '2024-01-29 18:30', current: false },
                    { device: 'Chrome on Windows', location: '上海市', time: '2024-01-28 14:20', current: false },
                  ].map((session, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{session.device}</p>
                        <p className="text-sm text-gray-500">{session.location} • {session.time}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {session.current && <Badge variant="secondary">当前会话</Badge>}
                        {!session.current && <Button variant="ghost" size="sm">终止</Button>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 外观设置 */}
        <TabsContent value="appearance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                外观偏好
              </CardTitle>
              <CardDescription>自定义系统的外观和主题</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>主题模式</Label>
                  <Select defaultValue="light">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">浅色模式</SelectItem>
                      <SelectItem value="dark">深色模式</SelectItem>
                      <SelectItem value="system">跟随系统</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>语言设置</Label>
                  <Select defaultValue="zh-CN">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="zh-CN">简体中文</SelectItem>
                      <SelectItem value="zh-TW">繁体中文</SelectItem>
                      <SelectItem value="en-US">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>时区设置</Label>
                  <Select defaultValue="Asia/Shanghai">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Asia/Shanghai">北京时间 (UTC+8)</SelectItem>
                      <SelectItem value="Asia/Hong_Kong">香港时间 (UTC+8)</SelectItem>
                      <SelectItem value="UTC">协调世界时 (UTC)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end">
                <Button>
                  <Save className="h-4 w-4 mr-2" />
                  保存设置
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 系统设置 */}
        <TabsContent value="system" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                系统配置
              </CardTitle>
              <CardDescription>管理系统级别的设置和偏好</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">基础设置</h3>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">自动保存</Label>
                    <p className="text-sm text-gray-500">自动保存表单数据</p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">离线模式</Label>
                    <p className="text-sm text-gray-500">在网络不稳定时启用离线功能</p>
                  </div>
                  <Switch />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">数据同步</Label>
                    <p className="text-sm text-gray-500">自动同步数据到云端</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">会话管理</h3>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">会话超时</Label>
                      <p className="text-sm text-gray-500">设置自动登出时间</p>
                    </div>
                    <Select defaultValue="30">
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15分钟</SelectItem>
                        <SelectItem value="30">30分钟</SelectItem>
                        <SelectItem value="60">1小时</SelectItem>
                        <SelectItem value="120">2小时</SelectItem>
                        <SelectItem value="0">永不超时</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">超时警告</Label>
                      <p className="text-sm text-gray-500">在会话即将过期时提醒</p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">记住登录状态</Label>
                      <p className="text-sm text-gray-500">在此设备上保持登录</p>
                    </div>
                    <Switch />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">AI助手设置</h3>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">启用AI助手</Label>
                      <p className="text-sm text-gray-500">显示悬浮AI助手按钮</p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">智能建议</Label>
                      <p className="text-sm text-gray-500">根据页面内容显示智能建议</p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">语音交互</Label>
                      <p className="text-sm text-gray-500">启用语音输入和播报</p>
                    </div>
                    <Switch />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-base">AI响应速度</Label>
                    <Select defaultValue="normal">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fast">快速响应</SelectItem>
                        <SelectItem value="normal">标准响应</SelectItem>
                        <SelectItem value="detailed">详细响应</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">系统信息</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-gray-500">版本号</Label>
                    <p>LegalMind v2.1.0</p>
                  </div>
                  <div>
                    <Label className="text-gray-500">最后更新</Label>
                    <p>2024-01-30</p>
                  </div>
                  <div>
                    <Label className="text-gray-500">许可证</Label>
                    <p>企业版</p>
                  </div>
                  <div>
                    <Label className="text-gray-500">支持到期</Label>
                    <p>2024-12-31</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 数据管理 */}
        <TabsContent value="data" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                数据管理
              </CardTitle>
              <CardDescription>管理您的数据导入、导出和备份</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">数据导出</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">案件数据</p>
                      <p className="text-sm text-gray-500">导出所有案件信息和相关文档</p>
                    </div>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      导出
                    </Button>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">个人数据</p>
                      <p className="text-sm text-gray-500">导出个人资料和设置信息</p>
                    </div>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      导出
                    </Button>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">数据导入</h3>
                <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg text-center">
                  <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 mb-2">拖拽文件到此处或点击上传</p>
                  <Button variant="outline" size="sm">选择文件</Button>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium text-red-600">危险操作</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border border-red-200 rounded-lg bg-red-50">
                    <div>
                      <p className="font-medium text-red-800">清除缓存</p>
                      <p className="text-sm text-red-600">清除所有本地缓存数据</p>
                    </div>
                    <Button variant="outline" size="sm">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      清除
                    </Button>
                  </div>
                  <div className="flex items-center justify-between p-3 border border-red-200 rounded-lg bg-red-50">
                    <div>
                      <p className="font-medium text-red-800">删除账户</p>
                      <p className="text-sm text-red-600">永久删除账户和所有相关数据</p>
                    </div>
                    <Button variant="destructive" size="sm">
                      <Trash2 className="h-4 w-4 mr-2" />
                      删除
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

	        </TabsContent>

        {/* 帮助与支持 */}
        <TabsContent value="help" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5" />
                帮助中心
              </CardTitle>
              <CardDescription>搜索文档、浏览常见问题、联系支持与下载资源</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* 搜索 */}
              <div className="relative max-w-2xl">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input value={helpSearch} onChange={(e) => setHelpSearch(e.target.value)} placeholder="搜索帮助文档、常见问题..." className="pl-12 py-3 text-base" />
              </div>

              {/* 快速链接（保留） */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="card hover-lift cursor-pointer">
                  <CardContent className="p-6 text-center">
                    <Video className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">视频教程</h3>
                    <p className="text-gray-600 text-sm">观看详细的操作演示视频</p>
                  </CardContent>
                </Card>
                <Card className="card hover-lift cursor-pointer">
                  <CardContent className="p-6 text-center">
                    <MessageSquare className="h-12 w-12 text-green-600 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">在线客服</h3>
                    <p className="text-gray-600 text-sm">与客服人员实时沟通</p>
                  </CardContent>
                </Card>
                <Card className="card hover-lift cursor-pointer">
                  <CardContent className="p-6 text-center">
                    <PhoneIcon className="h-12 w-12 text-orange-600 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">电话支持</h3>
                    <p className="text-gray-600 text-sm">400-123-4567</p>
                  </CardContent>
                </Card>
              </div>

              {/* 主要内容标签页：帮助文档 | 常见问题 | 联系我们 | 下载中心 */}
              <Tabs value={helpTab} onValueChange={setHelpTab} className="animate-slide-up">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="docs">帮助文档</TabsTrigger>
                  <TabsTrigger value="faq">常见问题</TabsTrigger>
                  <TabsTrigger value="contact">联系我们</TabsTrigger>
                  <TabsTrigger value="downloads">下载中心</TabsTrigger>
                </TabsList>

                {/* 帮助文档 */}
                <TabsContent value="docs" className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {filteredCategories.map((category) => {
                      const Icon = category.icon as React.ComponentType<{ className?: string }>;
                      return (
                        <Card key={category.id} className="card">
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <Icon className={`h-5 w-5 ${category.color}`} />
                              <span>{category.title}</span>
                            </CardTitle>
                            <CardDescription>{category.description}</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              {category.articles.map((article) => (
                                <div key={article.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer">
                                  <div>
                                    <h4 className="font-medium text-gray-900 text-sm">{article.title}</h4>
                                    <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                                      <span>{article.views} 次查看</span>
                                      <span>{article.helpful}% 有帮助</span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </TabsContent>

                {/* 常见问题 */}
                <TabsContent value="faq" className="space-y-4">
                  {filteredFAQs.map((faq) => (
                    <Card key={faq.id} className="card">
                      <CardContent className="p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">{faq.question}</h3>
                        <Badge variant="outline" className="mb-3">{faq.category}</Badge>
                        <p className="text-gray-700 leading-relaxed">{faq.answer}</p>
                      </CardContent>
                    </Card>
                  ))}
                </TabsContent>

                {/* 联系我们 */}
                <TabsContent value="contact">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <PhoneIcon className="h-5 w-5 text-green-500" />
                          电话支持
                        </CardTitle>
                        <CardDescription>紧急问题可直接拨打客服热线</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center space-x-3">
                          <PhoneIcon className="h-4 w-4 text-gray-400" />
                          <div>
                            <p className="font-medium">客服热线</p>
                            <p className="text-sm text-gray-600">400-123-4567</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <MailIcon className="h-4 w-4 text-gray-400" />
                          <div>
                            <p className="font-medium">邮箱支持</p>
                            <p className="text-sm text-gray-600">support@legalmind.com</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <ClockIcon className="h-4 w-4 text-gray-400" />
                          <div>
                            <p className="font-medium">服务时间</p>
                            <p className="text-sm text-gray-600">工作日 9:00-18:00</p>
                          </div>
                        </div>
                        <Button variant="outline" className="w-full">发起工单</Button>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <MessageSquare className="h-5 w-5 text-blue-500" />
                          在线客服
                        </CardTitle>
                        <CardDescription>与客服人员实时沟通</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Button className="w-full btn-primary">打开在线客服</Button>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* 下载中心 */}
                <TabsContent value="downloads">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[
                      { title: '用户操作手册', desc: '平台使用指南和操作说明', version: 'v2.1', size: '5.2MB' },
                      { title: '仲裁规则文件', desc: '完整仲裁规则与程序说明', version: 'v1.8', size: '3.1MB' },
                    ].map((item, index) => (
                      <Card key={index} className="card">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-start space-x-3">
                              <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center">
                                <FileTextIcon className="h-6 w-6 text-red-600" />
                              </div>
                              <div>
                                <h3 className="font-semibold text-gray-900">{item.title}</h3>
                                <p className="text-sm text-gray-600 mt-1">{item.desc}</p>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4 text-sm text-gray-500">
                              <span>{item.version}</span>
                              <span>{item.size}</span>
                            </div>
                            <Button size="sm" variant="outline" onClick={async () => {
                              const isAuthed = typeof window !== 'undefined' && localStorage.getItem('user-storage')
                                ? JSON.parse(localStorage.getItem('user-storage') as string)?.state?.isAuthenticated
                                : false;
                              if (!isAuthed) {
                                alert('请先登录再下载');
                                return;
                              }
                              try {
                                const res = await fetch(`/api/mock-download?file=${encodeURIComponent(item.title)}.txt`, {
                                  headers: { 'x-mock-auth': '1' }
                                });
                                if (!res.ok) {
                                  alert('下载失败');
                                  return;
                                }
                                const blob = await res.blob();
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `${item.title}.txt`;
                                document.body.appendChild(a);
                                a.click();
                                a.remove();
                                URL.revokeObjectURL(url);
                              } catch (e) {
                                console.error(e);
                                alert('下载异常');
                              }
                            }}>
                              <DownloadIcon className="h-4 w-4 mr-2" />
                              下载
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}

                    {/* 更多条目示例 */}
                    {[
                      { title: '模板文书合集', desc: '常用文书模板（立案通知、开庭传票等）', version: 'v1.2', size: '1.7MB' },
                      { title: '证据清单模板', desc: '标准化证据清单模板', version: 'v1.0', size: '0.9MB' },
                      { title: '开庭注意事项', desc: '线上/线下开庭的准备清单', version: 'v1.3', size: '0.6MB' },
                    ].map((item, index) => (
                      <Card key={`more-${index}`} className="card">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-start space-x-3">
                              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                                <FileTextIcon className="h-6 w-6 text-blue-600" />
                              </div>
                              <div>
                                <h3 className="font-semibold text-gray-900">{item.title}</h3>
                                <p className="text-sm text-gray-600 mt-1">{item.desc}</p>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4 text-sm text-gray-500">
                              <span>{item.version}</span>
                              <span>{item.size}</span>
                            </div>
                            <Button size="sm" variant="outline">
                              <DownloadIcon className="h-4 w-4 mr-2" />
                              下载
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      );
    }
