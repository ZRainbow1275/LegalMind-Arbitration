# Project Memory

## Current Context
**Task**: Legal Workbench Optimization (14 Principles)
**Date**: 2025-11-26
**Goal**: Transform Prototype into a premium, integrated Legal Workbench.
**Status**: Phase 8 (Documentation & Handover)

## Key Decisions
- **Tech Stack**: React + Vite + @plait/core (Drawnix). No migration to Angular.
- **Architecture**: Single Workspace Model. Courtroom and AI features will be integrated as panels/modes within the main canvas, not separate pages.
- **Design**: "Premium" aesthetic using shadcn/ui + Tailwind + Framer Motion.
- **Performance**: Adopted "Advanced Virtualization" (QuadTree-based) for handling large graphs (10k+ nodes).

## Achievements
- **Canvas Virtualization**: Successfully implemented viewport-based culling for nodes and connections.
- **UI Consistency**: Unified all floating panels with glassmorphism and smooth animations.
- **Empty States**: Added `CanvasEmptyState` for better onboarding.
- **Mobile Support**: Verified and optimized layout for mobile devices.
- **Code Quality**: Cleaned up unused code and console logs.

## Active Principles
1. **Drawnix Base**: Leverage Plait's capabilities.
2. **Integration**: Courtroom/AI inside Workbench.
3. **Collaboration**: Real-time sync (Figma-like).
4. **Consistency**: Unified UI components.
5. **Context7**: Learning best practices.
6. **Ecosystem**: Modular design.
7. **Minimal Dev**: Avoid overengineering.
8. **Docs First**: Keep docs updated.
9. **Memory**: Keep this file updated.
10. **Read Docs**: Always read before acting.
11. **Stage-based**: Debug-free milestones.
12. **Bug-free**: Zero errors goal.
13. **Folders**: `docs`, `Prototype`, `dev`.
14. **Best Practices**: Continuous learning.
