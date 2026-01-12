import React, { useState, useEffect, ReactNode } from 'react';
import { PlaitElement, Viewport, PlaitTheme, Selection } from '@plait/core';
import { BoardChangeData } from './Board';

export interface WrapperProps {
  value: PlaitElement[];
  viewport?: Viewport;
  theme?: PlaitTheme;
  options?: any;
  plugins?: any[];
  onChange?: (data: BoardChangeData) => void;
  onSelectionChange?: (selection: Selection | null) => void;
  onViewportChange?: (viewport: Viewport) => void;
  onThemeChange?: (theme: any) => void;
  onValueChange?: (value: PlaitElement[]) => void;
  children: ReactNode;
}

export const Wrapper: React.FC<WrapperProps> = ({
  value,
  viewport,
  theme,
  options = {},
  plugins = [],
  onChange,
  onSelectionChange,
  onViewportChange,
  onThemeChange,
  onValueChange,
  children
}) => {
  const [currentValue, setCurrentValue] = useState<PlaitElement[]>(value);
  const [currentViewport, setCurrentViewport] = useState<Viewport | undefined>(viewport);
  const [currentTheme, setCurrentTheme] = useState<PlaitTheme | undefined>(theme);


  useEffect(() => {
    setCurrentValue(value);
  }, [value]);

  useEffect(() => {
    setCurrentViewport(viewport);
  }, [viewport]);

  useEffect(() => {
    setCurrentTheme(theme);
  }, [theme]);

  const handleChange = (data: BoardChangeData) => {
    setCurrentValue(data.children);
    setCurrentViewport(data.viewport);


    // 触发各种回调
    onChange?.(data);
    onValueChange?.(data.children);
    onViewportChange?.(data.viewport);
    onSelectionChange?.(data.selection);

    if (data.theme && data.theme !== currentTheme) {
      setCurrentTheme(data.theme);
      onThemeChange?.(data.theme);
    }
  };

  // 克隆children并传递props
  const childrenWithProps = React.Children.map(children, (child) => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child, {
        value: currentValue,
        viewport: currentViewport,
        theme: currentTheme,
        options,
        plugins,
        onChange: handleChange,
        ...child.props
      });
    }
    return child;
  });

  return <>{childrenWithProps}</>;
};
