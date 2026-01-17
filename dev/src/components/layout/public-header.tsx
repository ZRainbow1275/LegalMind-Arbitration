// src/components/layout/public-header.tsx
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Scale, Menu, X } from 'lucide-react';
import { useState } from 'react';

export function PublicHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigation = [
    { name: '产品介绍', href: '/about' },
    { name: '功能特色', href: '/features' },
    { name: '仲裁规则', href: '/rules' },
    { name: '费用标准', href: '/pricing' },
  ];

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-border sticky top-0 z-50 shadow-card animate-slide-up">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2 group hover-lift">
            <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg flex items-center justify-center shadow-brand group-hover:shadow-brand-lg transition-all duration-300 group-hover:scale-110">
              <Scale className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold text-gray-900 group-hover:text-orange-700 transition-colors">LegalMind</span>
              <span className="text-xs text-gray-600 -mt-1 group-hover:text-orange-500 transition-colors">Arbitrate</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {navigation.map((item, index) => (
              <Link
                key={item.name}
                href={item.href}
                className="nav-item-animate text-gray-600 hover:text-orange-700 transition-all duration-300 px-3 py-2 rounded-md relative"
                style={{animationDelay: `${index * 0.1}s`}}
              >
                {item.name}
              </Link>
            ))}
          </nav>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center space-x-4 animate-fade-in" style={{animationDelay: '0.5s'}}>
            <Link href="/login">
              <Button variant="ghost" size="sm" className="hover-lift">
                登录
              </Button>
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="hover-lift"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5 transition-transform duration-300 rotate-90" />
              ) : (
                <Menu className="w-5 h-5 transition-transform duration-300" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border bg-white/95 backdrop-blur-md animate-slide-up">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navigation.map((item, index) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="nav-item block px-3 py-2 text-gray-600 hover:text-orange-700 hover:bg-orange-50 transition-all duration-300 rounded-md animate-fade-in"
                  onClick={() => setMobileMenuOpen(false)}
                  style={{animationDelay: `${index * 0.1}s`}}
                >
                  {item.name}
                </Link>
              ))}
              <div className="pt-4 space-y-2 animate-fade-in" style={{animationDelay: '0.4s'}}>
                <Link href="/login" className="block">
                  <Button variant="ghost" size="sm" className="w-full justify-start hover-lift">
                    登录
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
