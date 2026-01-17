// src/components/layout/app-footer.tsx
'use client';

import Link from 'next/link';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  Scale, 
  Mail, 
  Phone, 
  MapPin, 
  ExternalLink,
  Shield,
  FileText,
  HelpCircle
} from 'lucide-react';

export function AppFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 主要内容区域 */}
        <div className="py-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* 品牌信息 */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
                <Scale className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">LegalMind</span>
            </div>
            <p className="text-gray-600 text-sm leading-relaxed">
              专业的在线仲裁平台，为您提供高效、透明、智能的争议解决服务。
            </p>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="bg-green-50 text-green-700">
                <Shield className="w-3 h-3 mr-1" />
                安全认证
              </Badge>
              <Badge variant="secondary" className="bg-blue-50 text-blue-700">
                ISO 27001
              </Badge>
            </div>
          </div>

          {/* 快速链接 */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
              快速链接
            </h3>
            <ul className="space-y-3">
              <li>
                <Link 
                  href="/about" 
                  className="text-gray-600 hover:text-primary-600 transition-colors text-sm"
                >
                  关于我们
                </Link>
              </li>
              <li>
                <Link 
                  href="/features" 
                  className="text-gray-600 hover:text-primary-600 transition-colors text-sm"
                >
                  产品功能
                </Link>
              </li>
              <li>
                <Link 
                  href="/pricing" 
                  className="text-gray-600 hover:text-primary-600 transition-colors text-sm"
                >
                  收费标准
                </Link>
              </li>
              <li>
                <Link 
                  href="/rules" 
                  className="text-gray-600 hover:text-primary-600 transition-colors text-sm"
                >
                  仲裁规则
                </Link>
              </li>
            </ul>
          </div>

          {/* 法律信息 */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
              法律信息
            </h3>
            <ul className="space-y-3">
              <li>
                <Link 
                  href="/terms" 
                  className="text-gray-600 hover:text-primary-600 transition-colors text-sm flex items-center"
                >
                  <FileText className="w-3 h-3 mr-2" />
                  服务条款
                </Link>
              </li>
              <li>
                <Link 
                  href="/privacy" 
                  className="text-gray-600 hover:text-primary-600 transition-colors text-sm flex items-center"
                >
                  <Shield className="w-3 h-3 mr-2" />
                  隐私政策
                </Link>
              </li>
              <li>
                <Link 
                  href="/disclaimer" 
                  className="text-gray-600 hover:text-primary-600 transition-colors text-sm flex items-center"
                >
                  <ExternalLink className="w-3 h-3 mr-2" />
                  免责声明
                </Link>
              </li>
              <li>
                <Link 
                  href="/help" 
                  className="text-gray-600 hover:text-primary-600 transition-colors text-sm flex items-center"
                >
                  <HelpCircle className="w-3 h-3 mr-2" />
                  帮助中心
                </Link>
              </li>
            </ul>
          </div>

          {/* 联系信息 */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
              联系我们
            </h3>
            <ul className="space-y-3">
              <li className="flex items-center text-gray-600 text-sm">
                <Phone className="w-4 h-4 mr-3 text-primary-500" />
                400-123-4567
              </li>
              <li className="flex items-center text-gray-600 text-sm">
                <Mail className="w-4 h-4 mr-3 text-primary-500" />
                support@legalmind.com
              </li>
              <li className="flex items-start text-gray-600 text-sm">
                <MapPin className="w-4 h-4 mr-3 mt-0.5 text-primary-500 flex-shrink-0" />
                <span>北京市朝阳区建国门外大街1号<br />国贸大厦A座20层</span>
              </li>
            </ul>
          </div>
        </div>

        <Separator />

        {/* 底部版权信息 */}
        <div className="py-6 flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
          <div className="text-sm text-gray-500">
            © {currentYear} LegalMind Arbitration Platform. 保留所有权利。
          </div>
          
          <div className="flex items-center space-x-6 text-sm text-gray-500">
            <span>京ICP备12345678号</span>
            <span>京公网安备11010502012345号</span>
            <span>版本 v1.0.0</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

// 简化版页脚，用于登录等公开页面
export function SimpleFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-6 flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-primary-500 rounded-md flex items-center justify-center">
              <Scale className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-semibold text-gray-900">LegalMind</span>
          </div>
          
          <div className="text-sm text-gray-500">
            © {currentYear} LegalMind. 保留所有权利。
          </div>
        </div>
      </div>
    </footer>
  );
}
