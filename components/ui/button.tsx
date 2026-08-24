import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-full border border-transparent bg-clip-padding font-body text-sm font-semibold leading-tight whitespace-nowrap transition-[color,background-color,border-color,transform] outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-45 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "border-[var(--copper)] bg-[var(--copper)] text-[var(--navy-950)] shadow-[0_8px_30px_rgb(143_79_43_/_0.16)] hover:-translate-y-0.5 hover:border-[var(--copper-soft)] hover:bg-[var(--copper-soft)] active:translate-y-0",
        outline:
          "border-border text-foreground hover:border-[var(--copper)] hover:bg-[var(--copper-wash)] active:bg-[var(--copper-pale)]/50",
        secondary:
          "border-border bg-white/45 text-foreground hover:border-[var(--copper)] hover:bg-white active:bg-white/70",
        ghost: "text-primary hover:bg-primary/8 active:bg-primary/14",
        destructive:
          "border-destructive/60 text-destructive hover:bg-destructive/10 active:bg-destructive/18 focus-visible:ring-destructive/20",
        link: "text-primary underline-offset-4 hover:underline",
        band: "border-white/25 bg-white/8 text-white hover:-translate-y-0.5 hover:border-[var(--copper-soft)] hover:bg-white/14",
      },
      size: {
        default:
          "h-9 gap-1.5 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        cta: "h-12 gap-2 px-6 text-[14px]",
        /* Pleine largeur mobile : min-height 46px. */
        block: "h-[46px] w-full gap-2 px-5 text-[15px]",
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-10 gap-1.5 px-4.5 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        icon: "size-9",
        "icon-xs":
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-9",
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
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
