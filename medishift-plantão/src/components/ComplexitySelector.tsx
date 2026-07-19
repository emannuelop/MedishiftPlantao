import React from 'react';
import { PatientComplexity } from '../types';

interface ComplexitySelectorProps {
  value: PatientComplexity;
  onChange: (value: PatientComplexity) => void;
  className?: string;
}

export function ComplexitySelector({ value, onChange, className }: ComplexitySelectorProps) {
  return (
    <div className={className}>
      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Complexidade</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as PatientComplexity)}
        className="w-full rounded-2xl border-2 border-slate-50 bg-slate-50 py-4 px-6 font-black transition-all focus:bg-white focus:border-brand outline-none appearance-none"
      >
        {Object.values(PatientComplexity).map((complexity) => (
          <option key={complexity} value={complexity}>
            {complexity}
          </option>
        ))}
      </select>
    </div>
  );
}
