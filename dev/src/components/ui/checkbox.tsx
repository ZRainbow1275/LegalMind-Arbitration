// src/components/ui/checkbox.tsx
"use client"

import * as React from "react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface CheckboxProps {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  className?: string;
  id?: string;
  disabled?: boolean;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, checked, onCheckedChange, ...props }, ref) => {
    return (
      <div className="relative">
        <input
          type="checkbox"
          ref={ref}
          checked={checked}
          onChange={(e) => onCheckedChange?.(e.target.checked)}
          className={cn(
            "peer h-4 w-4 shrink-0 rounded-sm border border-gray-300 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 checked:bg-orange-500 checked:border-orange-500",
            className
          )}
          {...props}
        />
        {checked && (
          <Check className="absolute top-0 left-0 h-4 w-4 text-white pointer-events-none" />
        )}
      </div>
    )
  }
)
Checkbox.displayName = "Checkbox"

export { Checkbox }
