import React from 'react';
import { cn } from '../../lib/utils';

interface BooleanQuestionProps {
  label: string;
  icon: React.ReactNode;
  value: boolean;
  onChange: (v: boolean) => void;
  variant?: 'primary' | 'danger' | 'brand';
  className?: string;
}

export function BooleanQuestion({ 
  label, 
  icon, 
  value, 
  onChange, 
  variant = 'brand',
  className 
}: BooleanQuestionProps) {
  const activeColors = {
    brand: 'bg-brand text-white shadow-lg shadow-brand/20 border-brand',
    danger: 'bg-red-600 text-white shadow-lg shadow-red-600/20 border-red-600',
    primary: 'bg-slate-800 text-white shadow-lg shadow-slate-800/20 border-slate-800'
  };

  const activeColor = activeColors[variant];
  const inactiveColor = 'bg-slate-50 text-slate-400 border-slate-100 hover:border-slate-200';
  const noActiveColor = 'bg-slate-800 text-white shadow-lg shadow-slate-800/20 border-slate-800';

  return (
    <div className={cn("space-y-3", className)}>
      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">{label}</label>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => onChange(true)}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-[10px] font-black uppercase tracking-widest transition-all border-2",
            value ? activeColor : inactiveColor
          )}
        >
          {icon} Sim
        </button>
        <button
          type="button"
          onClick={() => onChange(false)}
          className={cn(
            "flex flex-1 items-center justify-center rounded-xl py-3 text-[10px] font-black uppercase tracking-widest transition-all border-2",
            !value ? noActiveColor : inactiveColor
          )}
        >
          Não
        </button>
      </div>
    </div>
  );
}
