
import { cva } from "class-variance-authority"

export const buttonVariants = cva(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all duration-300 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-orange-500/50 focus-visible:ring-offset-2 cursor-pointer relative overflow-hidden",
    {
        variants: {
            variant: {
                default:
                    "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 hover:from-orange-600 hover:to-orange-700",
                destructive:
                    "bg-red-500 text-white shadow-md hover:bg-red-600 hover:shadow-lg hover:scale-105 active:scale-95",
                outline:
                    "border-2 border-gray-200 bg-white shadow-sm hover:bg-orange-500 hover:text-white hover:border-orange-500 hover:shadow-lg hover:scale-105 active:scale-95",
                secondary:
                    "bg-gray-500 text-white shadow-md hover:bg-orange-500 hover:shadow-lg hover:scale-105 active:scale-95",
                ghost:
                    "hover:bg-orange-50 hover:text-orange-700 hover:scale-105 active:scale-95",
                link: "text-orange-500 underline-offset-4 hover:underline hover:text-orange-700",
            },
            size: {
                default: "h-9 px-4 py-2 rounded-lg has-[>svg]:px-3",
                sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
                lg: "h-12 rounded-lg px-8 py-3 text-base font-semibold has-[>svg]:px-6",
                icon: "size-9 rounded-lg",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
)
