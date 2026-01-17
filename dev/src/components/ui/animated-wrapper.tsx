// dev/src/components/ui/animated-wrapper.tsx
'use client';

import React, { useEffect, useState, useRef } from 'react';
import { cn } from '@/lib/utils';

interface AnimatedWrapperProps {
  children: React.ReactNode;
  animation?: 'fade-in' | 'slide-up' | 'slide-down' | 'slide-left' | 'slide-right' | 'scale-in' | 'bounce-in';
  delay?: number;
  duration?: number;
  className?: string;
  trigger?: 'immediate' | 'scroll' | 'hover' | 'click';
  threshold?: number;
}

export function AnimatedWrapper({
  children,
  animation = 'fade-in',
  delay = 0,
  duration = 500,
  className,
  trigger = 'immediate',
  threshold = 0.1
}: AnimatedWrapperProps) {
  const [isVisible, setIsVisible] = useState(trigger === 'immediate');
  const [isAnimating, setIsAnimating] = useState(false);
  const elementRef = useRef<HTMLDivElement | null>(null);

  // 滚动触发动画
  useEffect(() => {
    if (trigger === 'scroll' && elementRef.current) {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setTimeout(() => {
              setIsVisible(true);
              setIsAnimating(true);
            }, delay);
          }
        },
        { threshold }
      );

      observer.observe(elementRef.current);
      return () => observer.disconnect();
    }
  }, [trigger, delay, threshold]);

  // 立即触发动画
  useEffect(() => {
    if (trigger === 'immediate') {
      setTimeout(() => {
        setIsVisible(true);
        setIsAnimating(true);
      }, delay);
    }
  }, [trigger, delay]);

  const handleClick = () => {
    if (trigger === 'click') {
      setIsVisible(true);
      setIsAnimating(true);
    }
  };

  const handleMouseEnter = () => {
    if (trigger === 'hover') {
      setIsVisible(true);
      setIsAnimating(true);
    }
  };

  const getAnimationClass = () => {
    if (!isAnimating) return '';
    
    switch (animation) {
      case 'fade-in':
        return 'animate-fade-in';
      case 'slide-up':
        return 'animate-slide-up';
      case 'slide-down':
        return 'animate-slide-down';
      case 'slide-left':
        return 'animate-slide-left';
      case 'slide-right':
        return 'animate-slide-right';
      case 'scale-in':
        return 'animate-scale-in';
      case 'bounce-in':
        return 'animate-bounce-in';
      default:
        return 'animate-fade-in';
    }
  };

  const getInitialStyle = () => {
    if (isVisible) return {};
    
    switch (animation) {
      case 'fade-in':
        return { opacity: 0 };
      case 'slide-up':
        return { opacity: 0, transform: 'translateY(30px)' };
      case 'slide-down':
        return { opacity: 0, transform: 'translateY(-30px)' };
      case 'slide-left':
        return { opacity: 0, transform: 'translateX(30px)' };
      case 'slide-right':
        return { opacity: 0, transform: 'translateX(-30px)' };
      case 'scale-in':
        return { opacity: 0, transform: 'scale(0.8)' };
      case 'bounce-in':
        return { opacity: 0, transform: 'scale(0.3)' };
      default:
        return { opacity: 0 };
    }
  };

  return (
    <div
      ref={elementRef}
      className={cn(
        'transition-all ease-out',
        isAnimating && getAnimationClass(),
        className
      )}
      style={{
        ...getInitialStyle(),
        animationDuration: `${duration}ms`,
        transitionDuration: `${duration}ms`
      }}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
    >
      {children}
    </div>
  );
}

// 预设动画组件
export function FadeIn({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <AnimatedWrapper animation="fade-in" delay={delay} className={className}>
      {children}
    </AnimatedWrapper>
  );
}

export function SlideUp({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <AnimatedWrapper animation="slide-up" delay={delay} className={className}>
      {children}
    </AnimatedWrapper>
  );
}

export function SlideDown({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <AnimatedWrapper animation="slide-down" delay={delay} className={className}>
      {children}
    </AnimatedWrapper>
  );
}

export function SlideLeft({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <AnimatedWrapper animation="slide-left" delay={delay} className={className}>
      {children}
    </AnimatedWrapper>
  );
}

export function SlideRight({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <AnimatedWrapper animation="slide-right" delay={delay} className={className}>
      {children}
    </AnimatedWrapper>
  );
}

export function ScaleIn({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <AnimatedWrapper animation="scale-in" delay={delay} className={className}>
      {children}
    </AnimatedWrapper>
  );
}

export function BounceIn({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <AnimatedWrapper animation="bounce-in" delay={delay} className={className}>
      {children}
    </AnimatedWrapper>
  );
}

// 滚动触发动画组件
export function ScrollReveal({ 
  children, 
  animation = 'slide-up', 
  delay = 0, 
  threshold = 0.1,
  className 
}: { 
  children: React.ReactNode; 
  animation?: AnimatedWrapperProps['animation'];
  delay?: number; 
  threshold?: number;
  className?: string;
}) {
  return (
    <AnimatedWrapper 
      animation={animation} 
      delay={delay} 
      trigger="scroll" 
      threshold={threshold}
      className={className}
    >
      {children}
    </AnimatedWrapper>
  );
}

// 交错动画组件
export function StaggeredAnimation({ 
  children, 
  staggerDelay = 100,
  animation = 'slide-up',
  className 
}: { 
  children: React.ReactNode[]; 
  staggerDelay?: number;
  animation?: AnimatedWrapperProps['animation'];
  className?: string;
}) {
  return (
    <div className={className}>
      {React.Children.map(children, (child, index) => (
        <AnimatedWrapper 
          key={index}
          animation={animation} 
          delay={index * staggerDelay}
        >
          {child}
        </AnimatedWrapper>
      ))}
    </div>
  );
}
