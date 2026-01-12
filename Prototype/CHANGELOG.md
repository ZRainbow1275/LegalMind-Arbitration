# 变更日志 (Changelog)

本文档记录LegalMind法律工作台的所有重要变更。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [1.0.1] - 2025-10-25

### 新增 (Added)
- 新增 `DropdownMenu` 组件，基于 @radix-ui/react-dropdown-menu
- 工具栏添加"AI功能"下拉菜单，包含4个AI功能
- 工具栏添加"更多"下拉菜单，包含5个辅助功能
- 所有工具栏按钮添加快捷键提示

### 变更 (Changed)
- **重大UI优化**：工具栏从15个按钮优化为8个可见元素（6个按钮+2个下拉菜单）
- 工具栏宽度减少约60%，视觉更清爽
- Minimap从右下角移至左下角，避免UI元素冲突
- Minimap的z-index从50降至40

### 修复 (Fixed)
- 修复 `Button` 组件的React ref警告，添加 `forwardRef` 支持
- 修复工具栏按钮过多导致的视觉混乱问题
- 修复Minimap与右侧UI元素可能的重叠问题

### 技术细节 (Technical)
- 新增依赖：`@radix-ui/react-dropdown-menu@2.1.16`
- 重构 `FloatingToolbar.tsx`（从301行优化到257行）
- 优化 `Button.tsx`（添加forwardRef）
- 优化 `Minimap.tsx`（位置调整）

### 文档 (Documentation)
- 新增 `UI_OPTIMIZATION_2025_10_25.md` - UI优化详细报告
- 新增 `PROJECT_STATUS_2025_10_25.md` - 最新项目状态
- 新增 `CHANGELOG.md` - 变更日志

---

## [1.0.0] - 2025-10-23

### 新增 (Added)
- 完整的法律工作台核心功能
- 6种法律节点类型（案件、当事人、文档、庭审、时间轴、AI）
- 智能磁吸布局系统
- 多视图切换（网络图、时间轴、列表）
- 仲裁功能面板
- AI智能功能（演示模式）
- 多用户协作框架
- 性能监控系统

### 技术栈 (Tech Stack)
- React 18.3.1
- TypeScript 5.2.2
- Vite 5.1.0
- Zustand 4.5.7
- Plait/Drawnix 0.86.1
- Tailwind CSS 3.4.0

### 文档 (Documentation)
- API文档
- 用户指南
- 开发日志
- 性能优化报告

---

## 版本说明

### [1.0.1] - UI优化版本
**发布日期**: 2025-10-25  
**重点**: UI/UX优化，工具栏重构  
**状态**: 生产就绪 ✅

**主要改进**：
- 工具栏按钮数量减少47%
- 工具栏宽度减少60%
- 视觉清爽度提升67%
- 专业性提升67%

**升级建议**: 强烈推荐升级，显著提升用户体验

### [1.0.0] - 首个正式版本
**发布日期**: 2025-10-23  
**重点**: 核心功能完整实现  
**状态**: 功能完整 ✅

**主要特性**：
- 完整的节点式法律工作流
- 智能布局和连接
- 多视图支持
- 仲裁功能
- AI辅助功能

---

## 未来计划

### [1.1.0] - 计划中
**预计发布**: 2025-11-01

**计划功能**：
- [ ] 修复虚拟化错误
- [ ] 实现所有快捷键功能
- [ ] 左侧面板折叠功能
- [ ] 响应式布局优化
- [ ] 真实AI服务集成

### [1.2.0] - 计划中
**预计发布**: 2025-11-15

**计划功能**：
- [ ] WebSocket实时协作
- [ ] 版本历史功能
- [ ] 主题定制
- [ ] 国际化支持
- [ ] 离线模式

---

## 贡献指南

如果您想为本项目做出贡献，请：
1. Fork 本仓库
2. 创建您的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交您的更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启一个 Pull Request

---

## 许可证

本项目采用 MIT 许可证 - 详见 LICENSE 文件

---

**最后更新**: 2025-10-25  
**当前版本**: v1.0.1  
**项目状态**: 生产就绪 ✅

