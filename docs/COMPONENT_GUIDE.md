# 🎨 LegalMind仲裁平台 - 组件指南

**版本**：v1.0  
**最后更新**：2025-10-09  
**UI框架**：shadcn/ui + Tailwind CSS

---

## 📋 目录

1. [设计系统](#设计系统)
2. [组件库](#组件库)
3. [使用指南](#使用指南)
4. [最佳实践](#最佳实践)

---

## 设计系统

### 品牌色彩

**主色调**：
- **橙色**（#FF6B35）：主要操作、强调元素
- **白色**（#FFFFFF）：背景、卡片
- **灰色**（#F5F5F5）：次要背景

**语义色彩**：
- **成功**：#10B981（绿色）
- **警告**：#F59E0B（黄色）
- **错误**：#EF4444（红色）
- **信息**：#3B82F6（蓝色）

### 字体系统

**字体家族**：
```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
```

**字体大小**：
- **标题1**：32px / 2rem
- **标题2**：24px / 1.5rem
- **标题3**：20px / 1.25rem
- **正文**：16px / 1rem
- **小字**：14px / 0.875rem

### 间距系统

```css
spacing: {
  xs: 4px,
  sm: 8px,
  md: 16px,
  lg: 24px,
  xl: 32px,
  2xl: 48px
}
```

### 圆角系统

```css
borderRadius: {
  sm: 4px,
  md: 8px,
  lg: 12px,
  xl: 16px,
  full: 9999px
}
```

---

## 组件库

### 基础组件

#### Button - 按钮
```tsx
import { Button } from '@/components/ui/button';

// 主要按钮
<Button variant="default">提交</Button>

// 次要按钮
<Button variant="outline">取消</Button>

// 危险按钮
<Button variant="destructive">删除</Button>

// 尺寸
<Button size="sm">小按钮</Button>
<Button size="default">默认按钮</Button>
<Button size="lg">大按钮</Button>
```

#### Card - 卡片
```tsx
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

<Card>
  <CardHeader>
    <CardTitle>卡片标题</CardTitle>
  </CardHeader>
  <CardContent>
    卡片内容
  </CardContent>
</Card>
```

#### Input - 输入框
```tsx
import { Input } from '@/components/ui/input';

<Input 
  type="text" 
  placeholder="请输入..." 
  value={value}
  onChange={(e) => setValue(e.target.value)}
/>
```

#### Select - 选择器
```tsx
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

<Select value={value} onValueChange={setValue}>
  <SelectTrigger>
    <SelectValue placeholder="请选择" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="option1">选项1</SelectItem>
    <SelectItem value="option2">选项2</SelectItem>
  </SelectContent>
</Select>
```

#### Dialog - 对话框
```tsx
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

<Dialog>
  <DialogTrigger asChild>
    <Button>打开对话框</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>对话框标题</DialogTitle>
    </DialogHeader>
    <div>对话框内容</div>
  </DialogContent>
</Dialog>
```

### 业务组件

#### CaseCard - 案件卡片
```tsx
import { CaseCard } from '@/components/cases/CaseCard';

<CaseCard
  caseNumber="2025-001"
  title="合同纠纷案"
  status="pending"
  amount={100000}
  createdAt="2025-10-09"
  onClick={() => navigate(`/cases/${caseId}`)}
/>
```

#### DocumentUploader - 文档上传器
```tsx
import { DocumentUploader } from '@/components/documents/DocumentUploader';

<DocumentUploader
  caseId="case_123"
  onUploadSuccess={(document) => {
    console.log('上传成功', document);
  }}
  onUploadError={(error) => {
    console.error('上传失败', error);
  }}
/>
```

#### HearingRoom - 庭审室
```tsx
import { HearingRoom } from '@/components/hearings/HearingRoom';

<HearingRoom
  hearingId="hearing_123"
  isArbitrator={true}
  onEnd={() => {
    console.log('庭审结束');
  }}
/>
```

---

## 使用指南

### 安装依赖

```bash
pnpm add @radix-ui/react-dialog @radix-ui/react-select
pnpm add tailwindcss-animate class-variance-authority clsx tailwind-merge
pnpm add lucide-react
```

### 配置Tailwind

```js
// tailwind.config.js
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#FF6B35',
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
        info: '#3B82F6',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
```

### 创建新组件

```tsx
// src/components/ui/my-component.tsx
import * as React from 'react';
import { cn } from '@/lib/utils';

interface MyComponentProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'outline';
}

const MyComponent = React.forwardRef<HTMLDivElement, MyComponentProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'base-styles',
          variant === 'default' && 'default-styles',
          variant === 'outline' && 'outline-styles',
          className
        )}
        {...props}
      />
    );
  }
);

MyComponent.displayName = 'MyComponent';

export { MyComponent };
```

---

## 最佳实践

### 1. 组件设计原则

- **单一职责**：每个组件只做一件事
- **可复用性**：设计通用的组件接口
- **可组合性**：支持组件嵌套和组合
- **可访问性**：遵循ARIA规范

### 2. 样式管理

- 使用Tailwind CSS工具类
- 避免内联样式
- 使用`cn()`函数合并类名
- 提取重复样式为组件

### 3. 状态管理

- 使用React Hooks管理本地状态
- 使用Zustand管理全局状态
- 避免过度使用Context

### 4. 性能优化

- 使用React.memo避免不必要的重渲染
- 使用useMemo和useCallback缓存计算结果
- 懒加载大型组件
- 虚拟化长列表

### 5. 类型安全

- 为所有组件定义TypeScript接口
- 使用泛型提高组件灵活性
- 避免使用any类型

### 6. 测试

- 为关键组件编写单元测试
- 使用@testing-library/react测试组件
- 测试用户交互和边界情况

---

## 组件清单

### UI组件（shadcn/ui）

- ✅ Button - 按钮
- ✅ Card - 卡片
- ✅ Input - 输入框
- ✅ Select - 选择器
- ✅ Dialog - 对话框
- ✅ Dropdown - 下拉菜单
- ✅ Tabs - 标签页
- ✅ Table - 表格
- ✅ Badge - 徽章
- ✅ Avatar - 头像
- ✅ Tooltip - 提示
- ✅ Toast - 通知

### 业务组件

- ✅ CaseCard - 案件卡片
- ✅ CaseList - 案件列表
- ✅ CaseDetail - 案件详情
- ✅ DocumentUploader - 文档上传器
- ✅ DocumentViewer - 文档查看器
- ✅ HearingRoom - 庭审室
- ✅ HearingScheduler - 庭审排期
- ✅ ArbitratorSelector - 仲裁员选择器
- ✅ TimelineViewer - 时间轴查看器
- ✅ NotificationCenter - 通知中心

---

## 相关文档

- [技术栈](TECHNICAL_STACK.md)
- [API参考](API_REFERENCE.md)
- [工作台指南](WORKSPACE_GUIDE.md)

---

**文档维护者**：LegalMind开发团队  
**最后更新**：2025-10-09

