import { forwardRef } from 'react';
import { Board as ReactPlaitBoard, PlaitBoardProps as ReactPlaitBoardProps } from '@plait-board/react-board';
import { PlaitElement, Viewport, Selection, PlaitTheme, PlaitBoard as PlaitBoardType } from '@plait/core';

export interface BoardChangeData {
    children: PlaitElement[];
    viewport: Viewport;
    selection: Selection | null;
    theme?: PlaitTheme;
    operations?: any[];
}

export interface BoardProps extends Omit<ReactPlaitBoardProps, 'onChange' | 'value'> {
    value: PlaitElement[];
    viewport?: Viewport;
    theme?: PlaitTheme;
    options?: any;
    plugins?: any[];
    onChange?: (data: BoardChangeData) => void;
    afterInitialize?: (board: PlaitBoardType) => void;
}

export const Board = forwardRef<any, BoardProps>((props, ref) => {
    const { onChange, afterInitialize, value, viewport, theme, options, plugins, ...rest } = props;

    const handleChange = (event: any) => {
        if (onChange) {
            onChange({
                children: event.children || value,
                viewport: event.viewport || viewport || { zoom: 1, scrollX: 0, scrollY: 0 },
                selection: event.selection || null,
                theme: event.theme || theme
            });
        }
    };

    // Cast props to any to bypass strict type checking of ReactPlaitBoard
    const boardProps = {
        ...rest,
        value,
        viewport,
        theme,
        options,
        plugins,
        ref,
        onChange: handleChange,
        onBoardInitialized: afterInitialize
    } as any;

    return <ReactPlaitBoard {...boardProps} />;
});
