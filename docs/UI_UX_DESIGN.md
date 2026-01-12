# 🎨 LegalMind UI/UX Design Guide

## Design Philosophy
**"Authority through Design, Efficiency through Intelligence"**

The LegalMind Workbench must exude professionalism, trust, and modern efficiency. It should feel like a "Premium SaaS" (e.g., Linear, Raycast, Figma) rather than a traditional government tool.

## Visual Language

### Color Palette
- **Primary**: `orange-500` (#FF6B35) - Energy, Action (LegalMind Brand)
- **Secondary**: `slate-900` (#0F172A) - Authority, Stability
- **Background**: `gray-50` to `white` gradient - Clean, Airy
- **Surface**: Glassmorphism (White with 90% opacity + Blur) - Modern depth

### Typography
- **Font Family**: Inter (System Default)
- **Headings**: Bold, Tight tracking
- **Body**: Readable, Relaxed line-height

## Component Guidelines (shadcn/ui)

### Buttons
- **Primary**: `bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/20`
- **Secondary**: `bg-white border border-gray-200 hover:bg-gray-50 text-gray-700`
- **Ghost**: `hover:bg-orange-50 text-gray-600 hover:text-orange-600`

### Panels & Cards
- **Style**: Rounded-xl, Border-gray-100, Shadow-xl
- **Interaction**: Subtle scale up (1.02) on hover for interactive cards

### Animations
- **Transitions**: `duration-200 ease-out`
- **Micro-interactions**: Use for all button clicks and state changes.

## Workbench Layout
- **Canvas**: Full screen, infinite.
- **Floating Panels**:
    - **Toolbar**: Bottom center (Mac dock style).
    - **Properties**: Right side, collapsible.
    - **Navigation**: Top left, minimal.
- **Courtroom Mode**:
    - **Overlay**: Darkened backdrop.
    - **Video Grid**: Floating, draggable.

## Accessibility
- **Contrast**: WCAG AA compliant.
- **Keyboard**: Full navigation support (Shortcuts are critical).
