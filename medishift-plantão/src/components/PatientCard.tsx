import React from 'react';
import { motion } from 'framer-motion';
import { Edit2, Trash2, CheckCircle2, XCircle, Calendar, Layers, ChevronRight } from 'lucide-react';
import { Patient } from '../types';
import { cn, ensureDate } from '../lib/utils';

interface PatientCardProps {
  patient: Patient;
  onEdit: (patient: Patient) => void;
  onDelete: (patient: Patient) => void;
  key?: React.Key;
}

export function PatientCard({ patient, onEdit, onDelete }: PatientCardProps) {
  return (
    <motion.div
      layout
      className="group relative flex flex-col justify-between rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm transition-all hover:shadow-xl hover:-translate-y-1"
    >
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div className={cn(
            "flex h-14 w-14 items-center justify-center rounded-2xl transition-all shadow-inner",
            patient.active ? "bg-emerald-50 text-emerald-600" : "bg-slate-50 text-slate-400"
          )}>
            {patient.active ? <CheckCircle2 className="h-7 w-7" /> : <XCircle className="h-7 w-7" />}
          </div>
          <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onEdit(patient)}
              className="rounded-xl bg-slate-50 p-2 text-slate-400 hover:bg-brand hover:text-white transition-all shadow-sm"
              title="Editar"
            >
              <Edit2 className="h-4 w-4" />
            </button>
            <button
              onClick={() => onDelete(patient)}
              className="rounded-xl bg-slate-50 p-2 text-slate-400 hover:bg-red-600 hover:text-white transition-all shadow-sm"
              title="Excluir"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
        
        <div>
          <h4 className="text-lg font-bold text-slate-900 tracking-tight leading-tight mb-1">{patient.name}</h4>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
              <Calendar className="h-3 w-3 text-brand" /> {patient.birthDate ? patient.birthDate.split('-').reverse().join('/') : '---'}
            </span>
            <span className={cn(
              "px-2 py-1 rounded-lg text-[8px] font-black tracking-widest uppercase border",
              patient.active ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-500 border-slate-200"
            )}>
              {patient.active ? 'Ativo' : 'Inativo'}
            </span>
            <span className={cn(
              "px-2 py-1 rounded-lg text-[8px] font-black tracking-widest uppercase border",
              patient.complexity?.includes('ALTA') ? "bg-red-50 text-red-600 border-red-100" : 
              patient.complexity?.includes('MÉDIA') ? "bg-amber-50 text-amber-600 border-amber-100" : 
              "bg-blue-50 text-blue-600 border-blue-100"
            )}>
              {patient.complexity}
            </span>
            {patient.usesDevice && patient.deviceTypes && patient.deviceTypes.length > 0 && (
              <span className="flex items-center gap-1 px-2 py-1 rounded-lg text-[8px] font-black tracking-widest uppercase bg-purple-50 text-purple-600 border border-purple-100">
                <Layers className="h-3 w-3" /> {patient.deviceTypes.join(', ')}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-slate-50 flex justify-between items-center">
        <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">
          Registrado em {patient.createdAt ? ensureDate(patient.createdAt).toLocaleDateString('pt-BR') : '--/--/--'}
        </span>
        <ChevronRight className="h-4 w-4 text-slate-200 group-hover:text-brand transition-colors" />
      </div>
    </motion.div>
  );
}
