import React from 'react';
import { cn } from '../../lib/utils';

interface ButtonProps extends React.ComponentPropsWithoutRef<'button'> {
  variant?: 'brand' | 'slate' | 'red' | 'emerald' | 'ghost' | 'amber';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
}

export function Button({ 
  className, 
  variant = 'brand', 
  size = 'md', 
  isLoading, 
  children, 
  disabled, 
  ...props 
}: ButtonProps) {
  const variants = {
    brand: 'bg-brand text-white shadow-brand/20 hover:bg-brand/90',
    slate: 'bg-slate-100 text-slate-900 border-slate-200 hover:bg-slate-200',
    red: 'bg-red-50 text-red-600 border-red-100 hover:bg-red-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100 hover:bg-amber-100',
    ghost: 'bg-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-900'
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-[10px]',
    md: 'px-6 py-2.5 text-xs',
    lg: 'px-8 py-3.5 text-sm',
    icon: 'p-2'
  };

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl font-black uppercase tracking-widest whitespace-nowrap transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none border shadow-sm',
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      {!isLoading && children}
    </button>
  );
}
