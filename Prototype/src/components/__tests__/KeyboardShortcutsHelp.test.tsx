import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { KeyboardShortcutsHelp } from '../KeyboardShortcutsHelp';
import type { KeyboardShortcut } from '../../hooks/useKeyboardShortcuts';

describe('KeyboardShortcutsHelp', () => {
    const mockShortcuts: KeyboardShortcut[] = [
        { key: 's', ctrl: true, description: '保存', action: () => { } },
        { key: 'z', ctrl: true, description: '撤销', action: () => { } },
        { key: 'y', ctrl: true, description: '重做', action: () => { } },
        { key: 'f', ctrl: true, description: '搜索', action: () => { } },
    ];

    const mockOnClose = vi.fn();

    it('should render search input', () => {
        render(<KeyboardShortcutsHelp shortcuts={mockShortcuts} onClose={mockOnClose} />);
        expect(screen.getByPlaceholderText('搜索快捷键...')).toBeInTheDocument();
    });

    it('should filter shortcuts based on search query', () => {
        render(<KeyboardShortcutsHelp shortcuts={mockShortcuts} onClose={mockOnClose} />);

        const input = screen.getByPlaceholderText('搜索快捷键...');
        fireEvent.change(input, { target: { value: '保存' } });

        expect(screen.getByText('保存')).toBeInTheDocument();
        expect(screen.queryByText('撤销')).not.toBeInTheDocument();
    });

    it('should show no results message when no matches found', () => {
        render(<KeyboardShortcutsHelp shortcuts={mockShortcuts} onClose={mockOnClose} />);

        const input = screen.getByPlaceholderText('搜索快捷键...');
        fireEvent.change(input, { target: { value: 'non-existent' } });

        expect(screen.getByText('未找到匹配的快捷键')).toBeInTheDocument();
    });

    it('should close on escape key', () => {
        render(<KeyboardShortcutsHelp shortcuts={mockShortcuts} onClose={mockOnClose} />);
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(mockOnClose).toHaveBeenCalled();
    });

    it('should close on close button click', () => {
        render(<KeyboardShortcutsHelp shortcuts={mockShortcuts} onClose={mockOnClose} />);
        const closeButton = screen.getByText('×');
        fireEvent.click(closeButton);
        expect(mockOnClose).toHaveBeenCalled();
    });
});
