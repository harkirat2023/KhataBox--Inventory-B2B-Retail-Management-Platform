import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center border bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-amber-brand text-primary-foreground border-amber-brand/20 hover:bg-amber-brand/90 shadow-sm",
        outline:
          "border-zinc-200 dark:border-zinc-700/60 bg-transparent dark:bg-zinc-900/60 text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-600/60 aria-expanded:bg-zinc-100 dark:aria-expanded:bg-zinc-800",
        secondary:
          "bg-zinc-100 dark:bg-zinc-800 text-foreground border-zinc-200 dark:border-zinc-700/60 hover:bg-zinc-200 dark:hover:bg-zinc-700 aria-expanded:bg-zinc-200 dark:aria-expanded:bg-zinc-700",
        ghost:
          "border-transparent text-muted-foreground hover:text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800/60 aria-expanded:bg-zinc-100 dark:aria-expanded:bg-zinc-800/60",
        destructive:
          "bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20",
        link: "text-amber-brand underline-offset-4 hover:underline border-transparent",
      },
      size: {
        default: "h-9 gap-1.5 px-3 rounded-xl has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5",
        xs: "h-7 gap-1 rounded-lg px-2 text-xs in-data-[slot=button-group]:rounded-xl has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1 rounded-xl px-2.5 text-sm in-data-[slot=button-group]:rounded-xl has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-10 gap-1.5 px-4 rounded-xl has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        icon: "size-9 rounded-xl",
        "icon-xs": "size-7 rounded-lg in-data-[slot=button-group]:rounded-xl [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8 rounded-xl in-data-[slot=button-group]:rounded-xl",
        "icon-lg": "size-10 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
