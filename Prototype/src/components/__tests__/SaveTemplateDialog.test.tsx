
import { render, screen, fireEvent } from '@testing-library/react';
import { SaveTemplateDialog } from '../SaveTemplateDialog';
import { vi } from 'vitest';

describe('SaveTemplateDialog', () => {
    it('renders correctly when open', () => {
        render(
            <SaveTemplateDialog
                isOpen={true}
                onClose={vi.fn()}
                onSave={vi.fn()}
            />
        );

        expect(screen.getByText('保存为模板')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('输入模板名称')).toBeInTheDocument();
    });

    it('does not render when closed', () => {
        render(
            <SaveTemplateDialog
                isOpen={false}
                onClose={vi.fn()}
                onSave={vi.fn()}
            />
        );

        expect(screen.queryByText('保存为模板')).not.toBeInTheDocument();
    });

    it('calls onSave with correct data when save button is clicked', () => {
        const onSave = vi.fn();
        render(
            <SaveTemplateDialog
                isOpen={true}
                onClose={vi.fn()}
                onSave={onSave}
            />
        );

        // Fill in the form
        fireEvent.change(screen.getByPlaceholderText('输入模板名称'), {
            target: { value: 'My New Template' }
        });
        fireEvent.change(screen.getByPlaceholderText('输入模板描述'), {
            target: { value: 'Test Description' }
        });

        // Click save
        fireEvent.click(screen.getByText('保存'));

        expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
            name: 'My New Template',
            description: 'Test Description',
            category: 'custom',
            complexity: 'medium'
        }));
    });
});
