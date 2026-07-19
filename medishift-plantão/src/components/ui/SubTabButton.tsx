import React from 'react';
import { cn } from '../../lib/utils';

interface SubTabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

export function SubTabButton({ active, onClick, icon, label }: SubTabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-1 items-center justify-center gap-2 py-3 text-[11px] font-black uppercase tracking-widest transition-all rounded-2xl",
        active 
          ? "bg-white text-slate-900 shadow-sm border border-slate-200" 
          : "text-slate-400 hover:text-slate-600"
      )}
    >
      {icon} {label}
    </button>
  );
}
