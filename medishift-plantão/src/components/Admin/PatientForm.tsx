import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion } from 'framer-motion';
import { X, CheckCircle2, XCircle, Plus } from 'lucide-react';
import { Patient, PatientComplexity } from '../../types';
import { StatusToggle } from '../ui/StatusToggle';
import { ComplexitySelector } from '../ComplexitySelector';
import { cn } from '../../lib/utils';
import { Button } from '../ui/Button';

const patientSchema = z.object({
  name: z.string().min(3, 'Nome muito curto'),
  birthDate: z.string().regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/, 'Data inválida'),
  active: z.boolean(),
  complexity: z.nativeEnum(PatientComplexity),
  usesDevice: z.boolean(),
  deviceTypes: z.array(z.string()).optional(),
});

type PatientFormData = z.infer<typeof patientSchema>;

interface PatientFormProps {
  editingPatient: Patient | null;
  hasHandovers: boolean;
  onSubmit: (data: PatientFormData) => Promise<void>;
  onClose: () => void;
}

const DEVICE_OPTIONS = [
  { id: 'TQT', label: 'TQT - Traqueostomia' },
  { id: 'GTT', label: 'GTT - Gastrostomia' },
  { id: 'SVD', label: 'SVD - Sonda Vesical demora' },
  { id: 'SVA', label: 'SVA - Sonda Vesical Alivio' },
  { id: 'SNE', label: 'SNE - Sonda Nasoenteral' }
];

export function PatientForm({ editingPatient, hasHandovers, onSubmit, onClose }: PatientFormProps) {
  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<PatientFormData>({
    resolver: zodResolver(patientSchema),
    defaultValues: editingPatient ? {
      name: editingPatient.name,
      birthDate: editingPatient.birthDate,
      active: editingPatient.active,
      complexity: editingPatient.complexity,
      usesDevice: editingPatient.usesDevice,
      deviceTypes: editingPatient.deviceTypes || []
    } : {
      name: '',
      birthDate: '',
      active: true,
      complexity: PatientComplexity.BAIXA,
      usesDevice: false,
      deviceTypes: []
    }
  });

  const usesDevice = watch('usesDevice');
  const active = watch('active');
  const deviceTypes = watch('deviceTypes') || [];

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
              {editingPatient ? 'Editar' : 'Novo'}
            </h3>
            <p className="text-[10px] font-black uppercase text-brand tracking-widest mt-1">Registro de Paciente</p>
          </div>
          <button onClick={onClose} aria-label="Fechar" className="rounded-2xl bg-slate-100 p-2 sm:p-3 text-slate-400 hover:text-slate-900 transition-all">
            <X className="h-5 w-5 sm:h-6 sm:w-6 stroke-[3px]" />
          </button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 sm:p-10 space-y-6 overflow-y-auto max-h-[80vh]">
          <div className="space-y-2">
            <label htmlFor="patient-name" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Nome Completo</label>
            <input
              id="patient-name"
              {...register('name')}
              placeholder="Ex: Pedro de Carvalho"
              className="w-full rounded-2xl border-2 border-slate-50 bg-slate-50 py-4 px-6 font-black transition-all focus:bg-white focus:border-brand outline-none"
            />
            {errors.name && <p className="text-[10px] font-black text-red-500 uppercase tracking-widest ml-1">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="patient-birthdate" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Data de Nascimento</label>
              <input
                id="patient-birthdate"
                {...register('birthDate')}
                type="date"
                className="w-full rounded-2xl border-2 border-slate-50 bg-slate-50 py-4 px-6 font-black transition-all focus:bg-white focus:border-brand outline-none"
              />
              {errors.birthDate && <p className="text-[10px] font-black text-red-500 uppercase tracking-widest ml-1">{errors.birthDate.message}</p>}
            </div>

            <ComplexitySelector 
              value={watch('complexity')}
              onChange={(val) => setValue('complexity', val)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Usos de Dispositivos?</label>
            <div className="flex gap-3 relative">
              <StatusToggle 
                active={usesDevice} 
                onClick={() => setValue('usesDevice', true)} 
                label="Sim" 
                icon={<Plus className="h-5 w-5 stroke-[2.5px]" />}
                color="emerald" 
              />
              <StatusToggle 
                active={!usesDevice} 
                onClick={() => {
                  setValue('usesDevice', false);
                  setValue('deviceTypes', []);
                }} 
                label="Não" 
                icon={<XCircle className="h-5 w-5 stroke-[2.5px]" />}
                color="slate" 
              />
            </div>
          </div>

          {usesDevice && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Tipos de Dispositivos (Selecione todos)</label>
              <div className="grid grid-cols-1 gap-2">
                {DEVICE_OPTIONS.map(device => {
                  const isSelected = deviceTypes.includes(device.id);
                  return (
                    <button
                      key={device.id}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          setValue('deviceTypes', deviceTypes.filter(id => id !== device.id));
                        } else {
                          setValue('deviceTypes', [...deviceTypes, device.id]);
                        }
                      }}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-xl border-2 transition-all",
                        isSelected 
                          ? "bg-purple-50 border-purple-200 text-purple-700" 
                          : "bg-slate-50 border-slate-50 text-slate-500 hover:border-slate-200"
                      )}
                    >
                      <span className="text-[10px] font-black uppercase tracking-widest">{device.label}</span>
                      {isSelected && <CheckCircle2 className="h-4 w-4" />}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Status de Admissão</label>
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
            {hasHandovers && <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight ml-1 italic">* Paciente possui registros no histórico</p>}
          </div>

          <div className="flex gap-4 pt-4">
            <Button
              type="submit"
              isLoading={isSubmitting}
              className="flex-1"
              size="lg"
            >
              Salvar Registro
            </Button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
