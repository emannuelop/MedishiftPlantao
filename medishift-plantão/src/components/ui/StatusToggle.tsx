import React from 'react';
import { cn } from '../../lib/utils';

interface StatusToggleProps {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
  color?: 'emerald' | 'slate' | 'brand';
  className?: string;
}

export function StatusToggle({ 
  active, 
  onClick, 
  label, 
  icon, 
  color = 'brand',
  className 
}: StatusToggleProps) {
  const activeStyles = {
    emerald: 'bg-emerald-600 text-white shadow-emerald-600/20 shadow-lg border-emerald-600',
    slate: 'bg-slate-800 text-white shadow-slate-800/20 shadow-lg border-slate-800',
    brand: 'bg-brand text-white shadow-brand/20 shadow-lg border-brand'
  }[color];

  const inactiveStyles = 'bg-slate-50 text-slate-400 border-slate-100 hover:border-slate-200';

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 px-4 text-[10px] font-black uppercase tracking-widest transition-all border-2",
        active ? activeStyles : inactiveStyles,
        className
      )}
    >
      {icon} {label}
    </button>
  );
}
