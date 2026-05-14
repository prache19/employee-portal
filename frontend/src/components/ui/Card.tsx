import type { HTMLAttributes } from 'react';

type Variant = 'default' | 'elevated' | 'outlined';

const variantStyles: Record<Variant, string> = {
  default: 'bg-white border border-slate-200 shadow-card',
  elevated: 'bg-white border border-slate-200/70 shadow-elevated',
  outlined: 'bg-white border border-slate-300',
};

export function Card({
  variant = 'default',
  className = '',
  ...props
}: HTMLAttributes<HTMLDivElement> & { variant?: Variant }) {
  return (
    <div
      {...props}
      className={`rounded-xl p-6 ${variantStyles[variant]} ${className}`}
    />
  );
}
