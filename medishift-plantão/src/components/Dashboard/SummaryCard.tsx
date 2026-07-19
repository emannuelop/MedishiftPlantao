import React from 'react';
import { cn } from '../../lib/utils';

interface SummaryCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: 'brand' | 'red' | 'amber' | 'blue';
}

export function SummaryCard({ label, value, icon, color }: SummaryCardProps) {
  const colors = {
    brand: 'bg-brand/5 text-brand border-brand/10 group-hover:bg-brand group-hover:text-white',
    red: 'bg-red-50 text-red-600 border-red-100 group-hover:bg-red-600 group-hover:text-white',
    amber: 'bg-amber-50 text-amber-600 border-amber-100 group-hover:bg-amber-500 group-hover:text-white',
    blue: 'bg-blue-50 text-blue-600 border-blue-100 group-hover:bg-blue-600 group-hover:text-white',
  };
  
  return (
    <div className="group bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between transition-all hover:shadow-xl hover:-translate-y-1">
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{label}</p>
        <p className="text-3xl font-black text-slate-900 tracking-tighter group-hover:text-brand transition-colors">{value}</p>
      </div>
      <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center border transition-all duration-500", colors[color])}>
        {React.cloneElement(icon as React.ReactElement<any>, { className: 'h-6 w-6 stroke-[2.5px]' })}
      </div>
    </div>
  );
}

export function ItemBadge({ label, color = 'brand' }: { label: string; color?: string }) {
  const styles: Record<string, string> = {
    brand: "bg-brand/5 text-brand border-brand/10",
    amber: "bg-amber-50 text-amber-600 border-amber-100",
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    red: "bg-red-50 text-red-600 border-red-100",
    purple: "bg-purple-50 text-purple-600 border-purple-100",
    rose: "bg-rose-50 text-rose-600 border-rose-100",
    slate: "bg-slate-100 text-slate-500 border-slate-200",
  };
  return (
    <span className={cn("text-[8px] font-black px-2 py-0.5 rounded-lg uppercase tracking-widest border", styles[color] || styles.brand)}>
      {label}
    </span>
  );
}
