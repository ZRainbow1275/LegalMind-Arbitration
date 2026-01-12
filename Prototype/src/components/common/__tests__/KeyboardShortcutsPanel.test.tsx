
import { render, screen, fireEvent } from '@testing-library/react';
import { KeyboardShortcutsPanel } from '../KeyboardShortcutsPanel';
import { vi } from 'vitest';

describe('KeyboardShortcutsPanel', () => {
    it('renders nothing when closed', () => {
        render(<KeyboardShortcutsPanel isOpen={false} onClose={vi.fn()} />);
        expect(screen.queryByText('快捷键提示')).not.toBeInTheDocument();
    });

    it('renders when open', () => {
        render(<KeyboardShortcutsPanel isOpen={true} onClose={vi.fn()} />);
        expect(screen.getByText('快捷键提示')).toBeInTheDocument();
    });

    it('filters shortcuts based on search query', () => {
        render(<KeyboardShortcutsPanel isOpen={true} onClose={vi.fn()} />);

        const searchInput = screen.getByPlaceholderText('搜索快捷键...');
        fireEvent.change(searchInput, { target: { value: '保存' } });

        expect(screen.getByText('保存')).toBeInTheDocument();
        // Assuming '撤销' is not matched by '保存'
        expect(screen.queryByText('撤销')).not.toBeInTheDocument();
    });

    it('calls onClose when close button is clicked', () => {
        const onClose = vi.fn();
        render(<KeyboardShortcutsPanel isOpen={true} onClose={onClose} />);

        const closeButton = screen.getByLabelText('关闭');
        fireEvent.click(closeButton);

        expect(onClose).toHaveBeenCalled();
    });
});
