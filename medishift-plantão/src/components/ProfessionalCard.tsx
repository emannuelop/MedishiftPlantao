import React from 'react';
import { motion } from 'framer-motion';
import { UserCircle, Edit2, Trash2 } from 'lucide-react';
import { Professional } from '../types';
import { cn } from '../lib/utils';

interface ProfessionalCardProps {
  professional: Professional;
  onEdit: (professional: Professional) => void;
  onDelete: (professional: Professional) => void;
  key?: React.Key;
}

export function ProfessionalCard({ professional, onEdit, onDelete }: ProfessionalCardProps) {
  return (
    <motion.div
      layout
      className="group relative flex flex-col justify-between rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm transition-all hover:shadow-xl"
    >
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl transition-all shadow-inner bg-slate-50 text-slate-400 group-hover:bg-brand group-hover:text-white">
            <UserCircle className="h-6 w-6" />
          </div>
          <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onEdit(professional)}
              className="rounded-xl bg-slate-50 p-2 text-slate-400 hover:bg-brand hover:text-white transition-all shadow-sm"
              title="Editar"
            >
              <Edit2 className="h-4 w-4" />
            </button>
            <button
              onClick={() => onDelete(professional)}
              className="rounded-xl bg-slate-50 p-2 text-slate-400 hover:bg-red-600 hover:text-white transition-all shadow-sm"
              title="Excluir"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div>
          <h4 className="text-lg font-bold text-slate-900 tracking-tight leading-tight mb-3">
            {professional.name}
          </h4>
          <span className={cn(
            "px-2 py-1 rounded-lg text-[8px] font-black tracking-widest uppercase",
            professional.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
          )}>
            {professional.active ? 'Status: Ativo' : 'Status: Inativo'}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
