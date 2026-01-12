import * as React from "react"
import { cn } from "../../lib/utils"
import { ChevronDown, Check } from "lucide-react"

const SelectContext = React.createContext<{
    value: any;
    onValueChange: (value: any) => void;
    open: boolean;
    setOpen: (open: boolean) => void;
} | null>(null);

const Select: React.FC<{ value: any; onValueChange: (value: any) => void; children: React.ReactNode }> = ({ value, onValueChange, children }) => {
    const [open, setOpen] = React.useState(false);
    return (
        <SelectContext.Provider value={{ value, onValueChange, open, setOpen }}>
            <div className="relative">{children}</div>
        </SelectContext.Provider>
    );
};

const SelectTrigger = React.forwardRef<
    HTMLButtonElement,
    React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, children, ...props }, ref) => {
    const context = React.useContext(SelectContext);
    return (
        <button
            ref={ref}
            type="button"
            onClick={() => context?.setOpen(!context.open)}
            className={cn(
                "flex h-10 w-full items-center justify-between rounded-md border border-gray-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:cursor-not-allowed disabled:opacity-50",
                className
            )}
            {...props}
        >
            {children}
            <ChevronDown className="h-4 w-4 opacity-50" />
        </button>
    );
});
SelectTrigger.displayName = "SelectTrigger"

const SelectValue = React.forwardRef<
    HTMLSpanElement,
    React.HTMLAttributes<HTMLSpanElement> & { placeholder?: string }
>(({ className, placeholder, ...props }, ref) => {
    const context = React.useContext(SelectContext);
    return (
        <span
            ref={ref}
            className={cn("block truncate", className)}
            {...props}
        >
            {context?.value || placeholder}
        </span>
    );
});
SelectValue.displayName = "SelectValue"

const SelectContent = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement> & { position?: string }
>(({ className, children, position = "popper", ...props }, ref) => {
    const context = React.useContext(SelectContext);
    if (!context?.open) return null;

    return (
        <div
            ref={ref}
            className={cn(
                "absolute z-50 min-w-[8rem] overflow-hidden rounded-md border bg-white text-gray-950 shadow-md animate-in fade-in-80",
                position === "popper" && "translate-y-1",
                className
            )}
            {...props}
        >
            <div className="p-1">
                {children}
            </div>
        </div>
    );
});
SelectContent.displayName = "SelectContent"

const SelectItem = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement> & { value: string }
>(({ className, children, value, ...props }, ref) => {
    const context = React.useContext(SelectContext);
    const isSelected = context?.value === value;

    return (
        <div
            ref={ref}
            className={cn(
                "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-gray-100 focus:bg-gray-100 data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
                className
            )}
            onClick={() => {
                context?.onValueChange(value);
                context?.setOpen(false);
            }}
            {...props}
        >
            <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                {isSelected && <Check className="h-4 w-4" />}
            </span>
            <span className="truncate">{children}</span>
        </div>
    );
});
SelectItem.displayName = "SelectItem"

export {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
}
