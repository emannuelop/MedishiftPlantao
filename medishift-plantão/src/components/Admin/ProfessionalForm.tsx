import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion } from 'framer-motion';
import { X, CheckCircle2, XCircle } from 'lucide-react';
import { Professional } from '../../types';
import { StatusToggle } from '../ui/StatusToggle';
import { Button } from '../ui/Button';

const professionalSchema = z.object({
  name: z.string().min(3, 'Nome muito curto'),
  active: z.boolean(),
});

type ProfessionalFormData = z.infer<typeof professionalSchema>;

interface ProfessionalFormProps {
  editingProfessional: Professional | null;
  hasHandovers: boolean;
  onSubmit: (data: ProfessionalFormData) => Promise<void>;
  onClose: () => void;
}

export function ProfessionalForm({ editingProfessional, hasHandovers, onSubmit, onClose }: ProfessionalFormProps) {
  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<ProfessionalFormData>({
    resolver: zodResolver(professionalSchema),
    defaultValues: editingProfessional ? {
      name: editingProfessional.name,
      active: editingProfessional.active
    } : {
      name: '',
      active: true
    }
  });

  const active = watch('active');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 sm:p-6 backdrop-blur-md"
    >
      <motion.div
        initial={{ y: 50, scale: 0.95, opacity: 0 }}
        animate={{ y: 0, scale: 1, opacity: 1 }}
        exit={{ y: 50, scale: 0.95, opacity: 0 }}
        className="w-full max-w-md overflow-hidden rounded-[2.5rem] bg-white shadow-2xl relative"
      >
        <div className="flex items-center justify-between border-b-4 border-slate-900/5 px-6 sm:px-10 py-6 sm:py-8">
          <div>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tighter uppercase leading-none">
              {editingProfessional ? 'Editar' : 'Novo'}
            </h3>
            <p className="text-[10px] font-black uppercase text-brand tracking-widest mt-1">Profissional</p>
          </div>
          <button onClick={onClose} aria-label="Fechar" className="rounded-2xl bg-slate-100 p-2 sm:p-3 text-slate-400 hover:text-slate-900 transition-all">
            <X className="h-5 w-5 sm:h-6 sm:w-6 stroke-[3px]" />
          </button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 sm:p-10 space-y-6 sm:space-y-8">
          <div className="space-y-2">
            <label htmlFor="professional-name" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Nome do Profissional</label>
            <input
              id="professional-name"
              {...register('name')}
              placeholder="Ex: Enf. Maria Silva"
              className="w-full rounded-2xl border-2 border-slate-50 bg-slate-50 py-4 px-6 font-black transition-all focus:bg-white focus:border-brand outline-none"
            />
            {errors.name && <p className="text-[10px] font-black text-red-500 uppercase tracking-widest ml-1">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Status</label>
            <div className="flex gap-3 relative">
              <StatusToggle 
                active={active} 
                onClick={() => setValue('active', true)} 
                label="Ativo" 
                icon={<CheckCircle2 className="h-5 w-5 stroke-[2.5px]" />}
                color="emerald" 
              />
              <StatusToggle 
                active={!active} 
                onClick={() => setValue('active', false)} 
                label="Inativo" 
                icon={<XCircle className="h-5 w-5 stroke-[2.5px]" />}
                color="slate" 
              />
            </div>
            {hasHandovers && <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight ml-1 italic">* Profissional possui registros no histórico</p>}
          </div>

          <div className="flex gap-4 pt-4">
            <Button
              type="submit"
              isLoading={isSubmitting}
              className="flex-1"
              size="lg"
            >
              Salvar Profissional
            </Button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
