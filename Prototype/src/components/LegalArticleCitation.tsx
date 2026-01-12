/**
 * 法律条文引用组件
 * 提供法律条文的搜索、查看和引用功能
 */

import React, { useState, useEffect } from 'react';
import { LegalNode } from './DrawnixLegalWorkspace';
import { LegalArticle, LegalArticlesDatabase } from '../lib/legal-articles-database';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  BookOpen,
  Search,
  X,
  Plus,
  Check,
  FileText,
  Calendar,
} from 'lucide-react';

interface LegalArticleCitationProps {
  nodes: LegalNode[];
  selectedNodeId?: string;
  onClose: () => void;
  onCiteArticle?: (nodeId: string, articleId: string) => void;
}

export const LegalArticleCitation: React.FC<LegalArticleCitationProps> = ({
  nodes,
  selectedNodeId,
  onClose,
  onCiteArticle,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<LegalArticle[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<LegalArticle | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('全部');
  const [citedArticles, setCitedArticles] = useState<Set<string>>(new Set());

  // 初始化：加载所有条文
  useEffect(() => {
    const allArticles = LegalArticlesDatabase.getAllArticles();
    setSearchResults(allArticles);
  }, []);

  // 初始化：加载已引用的条文
  useEffect(() => {
    if (selectedNodeId) {
      const node = nodes.find(n => n.id === selectedNodeId);
      if (node && node.data.metadata?.citedArticles) {
        setCitedArticles(new Set(node.data.metadata.citedArticles));
      }
    }
  }, [selectedNodeId, nodes]);

  // 搜索条文
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    const results = LegalArticlesDatabase.searchArticles(query);

    // 按分类过滤
    if (selectedCategory !== '全部') {
      const filtered = results.filter(article => article.category === selectedCategory);
      setSearchResults(filtered);
    } else {
      setSearchResults(results);
    }
  };

  // 切换分类
  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);

    if (category === '全部') {
      const results = LegalArticlesDatabase.searchArticles(searchQuery);
      setSearchResults(results);
    } else {
      const results = LegalArticlesDatabase.getArticlesByCategory(category);
      if (searchQuery) {
        const filtered = results.filter(article =>
          article.law.toLowerCase().includes(searchQuery.toLowerCase()) ||
          article.article.toLowerCase().includes(searchQuery.toLowerCase()) ||
          article.content.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setSearchResults(filtered);
      } else {
        setSearchResults(results);
      }
    }
  };

  // 引用条文
  const handleCiteArticle = (articleId: string) => {
    if (!selectedNodeId) {
      alert('请先选择一个节点');
      return;
    }

    const newCited = new Set(citedArticles);
    if (newCited.has(articleId)) {
      newCited.delete(articleId);
    } else {
      newCited.add(articleId);
    }
    setCitedArticles(newCited);

    if (onCiteArticle) {
      onCiteArticle(selectedNodeId, articleId);
    }
  };

  // 获取所有分类
  const categories = ['全部', ...LegalArticlesDatabase.getAllCategories()];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-7xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* 标题栏 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-white">
          <div className="flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-orange-600" />
            <div>
              <h2 className="text-2xl font-bold text-gray-800">法律条文库</h2>
              <p className="text-sm text-gray-600">
                {searchResults.length} 条结果
                {selectedNodeId && ` · 已引用 ${citedArticles.size} 条`}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="hover:bg-orange-100"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* 搜索栏 */}
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="text"
                placeholder="搜索法律名称、条文编号、关键词..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border-orange-200 focus:border-orange-500 focus:ring-orange-500"
              />
            </div>
          </div>

          {/* 分类筛选 */}
          <div className="flex items-center gap-2 mt-4 flex-wrap">
            {categories.map((category) => (
              <Badge
                key={category}
                variant={selectedCategory === category ? 'default' : 'outline'}
                className={`cursor-pointer ${selectedCategory === category
                    ? 'bg-orange-500 hover:bg-orange-600 text-white'
                    : 'hover:bg-orange-50 border-orange-200'
                  }`}
                onClick={() => handleCategoryChange(category)}
              >
                {category}
              </Badge>
            ))}
          </div>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 左侧：搜索结果列表 */}
            <div>
              <h3 className="text-lg font-bold text-gray-800 mb-4">搜索结果</h3>
              <div className="space-y-3">
                {searchResults.map((article) => {
                  const isCited = citedArticles.has(article.id);
                  const isSelected = selectedArticle?.id === article.id;

                  return (
                    <Card
                      key={article.id}
                      className={`cursor-pointer transition-all ${isSelected
                          ? 'border-orange-500 shadow-md'
                          : 'border-orange-200 hover:border-orange-300'
                        }`}
                      onClick={() => setSelectedArticle(article)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-bold text-orange-600">{article.article}</span>
                              <Badge variant="outline" className="text-xs border-orange-200">
                                {article.category}
                              </Badge>
                              {isCited && (
                                <Badge className="text-xs bg-green-500">
                                  <Check className="w-3 h-3 mr-1" />
                                  已引用
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm text-gray-600 mb-1">{article.law}</div>
                            <div className="text-xs text-gray-500 line-clamp-2">{article.content}</div>
                          </div>
                          {selectedNodeId && (
                            <Button
                              size="sm"
                              variant={isCited ? 'outline' : 'default'}
                              className={
                                isCited
                                  ? 'ml-2 border-green-500 text-green-600 hover:bg-green-50'
                                  : 'ml-2 bg-orange-500 hover:bg-orange-600'
                              }
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCiteArticle(article.id);
                              }}
                            >
                              {isCited ? (
                                <>
                                  <Check className="w-4 h-4 mr-1" />
                                  已引用
                                </>
                              ) : (
                                <>
                                  <Plus className="w-4 h-4 mr-1" />
                                  引用
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* 右侧：条文详情 */}
            <div>
              {selectedArticle ? (
                <Card className="border-orange-200 sticky top-0">
                  <CardHeader className="bg-gradient-to-r from-orange-50 to-white">
                    <CardTitle className="text-xl font-bold text-gray-800 flex items-center gap-2">
                      <FileText className="w-6 h-6 text-orange-600" />
                      条文详情
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      {/* 法律名称 */}
                      <div>
                        <div className="text-sm text-gray-500 mb-1">法律名称</div>
                        <div className="font-medium text-gray-800">{selectedArticle.law}</div>
                      </div>

                      {/* 条文编号 */}
                      <div>
                        <div className="text-sm text-gray-500 mb-1">条文编号</div>
                        <div className="text-2xl font-bold text-orange-600">{selectedArticle.article}</div>
                      </div>

                      {/* 分类 */}
                      <div>
                        <div className="text-sm text-gray-500 mb-1">分类</div>
                        <Badge variant="outline" className="border-orange-200">
                          {selectedArticle.category}
                        </Badge>
                      </div>

                      {/* 条文内容 */}
                      <div>
                        <div className="text-sm text-gray-500 mb-2">条文内容</div>
                        <div className="p-4 bg-gray-50 rounded-lg text-sm text-gray-700 leading-relaxed">
                          {selectedArticle.content}
                        </div>
                      </div>

                      {/* 关键词 */}
                      <div>
                        <div className="text-sm text-gray-500 mb-2">关键词</div>
                        <div className="flex flex-wrap gap-2">
                          {selectedArticle.keywords.map((keyword, index) => (
                            <Badge key={index} variant="outline" className="text-xs border-gray-300">
                              {keyword}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {/* 生效日期 */}
                      {selectedArticle.effectiveDate && (
                        <div>
                          <div className="text-sm text-gray-500 mb-1 flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            生效日期
                          </div>
                          <div className="text-sm text-gray-700">{selectedArticle.effectiveDate}</div>
                        </div>
                      )}

                      {/* 引用按钮 */}
                      {selectedNodeId && (
                        <Button
                          className={
                            citedArticles.has(selectedArticle.id)
                              ? 'w-full border-green-500 text-green-600 hover:bg-green-50'
                              : 'w-full bg-orange-500 hover:bg-orange-600 text-white'
                          }
                          variant={citedArticles.has(selectedArticle.id) ? 'outline' : 'default'}
                          onClick={() => handleCiteArticle(selectedArticle.id)}
                        >
                          {citedArticles.has(selectedArticle.id) ? (
                            <>
                              <Check className="w-4 h-4 mr-2" />
                              已引用此条文
                            </>
                          ) : (
                            <>
                              <Plus className="w-4 h-4 mr-2" />
                              引用此条文
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-orange-200">
                  <CardContent className="p-12 text-center">
                    <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">点击左侧条文查看详情</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>

        {/* 底部操作栏 */}
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {selectedNodeId ? (
                <span>已为当前节点引用 {citedArticles.size} 条法律条文</span>
              ) : (
                <span>请先选择一个节点以引用法律条文</span>
              )}
            </div>
            <Button
              onClick={onClose}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              完成
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

