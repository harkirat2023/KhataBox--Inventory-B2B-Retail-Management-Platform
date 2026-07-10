import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden border px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-amber-brand/15 text-amber-brand border-amber-brand/20 [a]:hover:bg-amber-brand/25",
        secondary:
          "bg-zinc-800 text-zinc-300 border-zinc-700/60 [a]:hover:bg-zinc-700",
        destructive:
          "bg-destructive/10 text-destructive border-destructive/20 focus-visible:ring-destructive/20 [a]:hover:bg-destructive/20",
        outline:
          "border-zinc-700/60 text-zinc-300 [a]:hover:bg-zinc-800 [a]:hover:text-foreground",
        ghost:
          "border-transparent text-zinc-400 hover:bg-zinc-800 hover:text-zinc-300",
        link: "text-amber-brand underline-offset-4 hover:underline border-transparent",
        success:
          "bg-emerald-brand/15 text-emerald-brand border-emerald-brand/20 [a]:hover:bg-emerald-brand/25",
        warning:
          "bg-warning/15 text-warning border-warning/20 [a]:hover:bg-warning/25",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  })
}

export { Badge, badgeVariants }
