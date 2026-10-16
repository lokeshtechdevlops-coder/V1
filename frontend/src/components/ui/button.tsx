import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';
const variants = cva('inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 disabled:pointer-events-none disabled:opacity-50', {
  variants: {variant: {default: 'bg-sky-700 text-white hover:bg-sky-800', outline: 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50', ghost: 'text-slate-600 hover:bg-slate-100', destructive: 'bg-red-700 text-white hover:bg-red-800'}, size: {default: 'h-10 px-4 py-2', sm: 'h-8 px-3 text-xs'}},
  defaultVariants: {variant: 'default', size: 'default'},
});
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof variants> {}
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({className, variant, size, ...props}, ref) => <button ref={ref} className={cn(variants({variant,size,className}))} {...props}/>);
Button.displayName = 'Button';
