// src/components/layout/public-footer.tsx
import Link from 'next/link';
import { Scale } from 'lucide-react';

export function PublicFooter() {
  const footerLinks = {
    product: [
      { name: '产品介绍', href: '/about' },
      { name: '功能特色', href: '/features' },
      { name: '价格方案', href: '/pricing' },
      { name: '案例展示', href: '/cases' },
    ],
    legal: [
      { name: '仲裁规则', href: '/rules' },
      { name: '隐私政策', href: '/privacy' },
      { name: '服务条款', href: '/terms' },
      { name: '免责声明', href: '/disclaimer' },
    ],
    support: [
      { name: '联系我们', href: '/contact' },
      { name: '技术支持', href: '/support' },
      { name: '意见反馈', href: '/feedback' },
      { name: '常见问题', href: '/faq' },
    ],
    company: [
      { name: '关于我们', href: '/company' },
      { name: '新闻动态', href: '/news' },
      { name: '加入我们', href: '/careers' },
      { name: '合作伙伴', href: '/partners' },
    ],
  };

  return (
    <footer className="bg-white border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Brand Section */}
          <div className="lg:col-span-1">
            <Link href="/" className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
                <Scale className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold text-foreground">LegalMind</span>
                <span className="text-xs text-muted-foreground -mt-1">Arbitrate</span>
              </div>
            </Link>
            <p className="text-sm text-muted-foreground mb-4">
              革命性的在线商业仲裁平台，为您提供安全、高效、AI赋能的数字化仲裁体验。
            </p>
            <p className="text-xs text-muted-foreground">
              © 2024 LegalMind. 保留所有权利。
            </p>
          </div>

          {/* Product Links */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-4">产品服务</h3>
            <ul className="space-y-2">
              {footerLinks.product.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-primary-500 transition-colors duration-200"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-4">法律条款</h3>
            <ul className="space-y-2">
              {footerLinks.legal.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-primary-500 transition-colors duration-200"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support Links */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-4">支持帮助</h3>
            <ul className="space-y-2">
              {footerLinks.support.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-primary-500 transition-colors duration-200"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-4">关于公司</h3>
            <ul className="space-y-2">
              {footerLinks.company.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-primary-500 transition-colors duration-200"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="mt-8 pt-8 border-t border-border">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-xs text-muted-foreground">
              赣江新区国际仲裁院授权 | ICP备案号：赣ICP备2024000000号
            </p>
            <div className="flex items-center space-x-4 mt-4 md:mt-0">
              <span className="text-xs text-muted-foreground">技术支持：</span>
              <span className="text-xs font-medium text-primary-500">LegalMind Tech</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
