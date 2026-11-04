import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex shrink-0 items-center justify-center gap-2.5 whitespace-nowrap font-semibold transition-[background-color,color,transform] duration-150 ease-out outline-none select-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-[3px] focus-visible:ring-offset-background active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45 motion-reduce:transition-none motion-reduce:active:scale-100 [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary-hover',
        ghost: 'text-muted-foreground hover:bg-secondary hover:text-foreground',
        soft: 'bg-[rgb(110_155_255/0.1)] text-accent-fg ring-1 ring-[rgb(110_155_255/0.18)] hover:bg-[rgb(110_155_255/0.16)] hover:text-foreground',
      },
      size: {
        default: 'h-11 rounded-full px-5 text-[15px] [&_svg]:size-5',
        lg: 'h-14 rounded-full pr-7 pl-6 text-[16px] font-semibold [&_svg]:size-[22px]',
        icon: 'size-11 rounded-full [&_svg]:size-6',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'button';
  return <Comp data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { Button, buttonVariants };
