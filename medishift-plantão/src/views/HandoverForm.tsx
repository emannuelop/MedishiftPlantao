import React, { useState, useEffect, useRef } from 'react';
import { db, auth, handleFirestoreError, collection, addDoc, serverTimestamp, query, where, getDocs, Timestamp, doc, updateDoc } from '../lib/firebase';
import { Patient, OperationType, Handover, Professional, WorkShift } from '../types';
import { useAppData } from '../context/AppDataContext';
import { X, Search, Check, AlertCircle, Pill, MessageSquare, Save, Loader2, Activity, Heart, Thermometer, Brain, Wind } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { cn } from '../lib/utils';
import { handoverSchema, HandoverFormData } from '../lib/validation';
import { BooleanQuestion } from '../components/ui/BooleanQuestion';
import { Button } from '../components/ui/Button';
import {
  calculateNEWS2,
  respiratoryRateOptions,
  spo2ScaleOptions,
  spo2Scale1Options,
  spo2Scale2Options,
  oxygenSupportOptions,
  systolicBpOptions,
  pulseOptions,
  consciousnessOptions,
  temperatureOptions
} from '../lib/news2';

export default function HandoverForm({ onClose, initialData }: { onClose: () => void, initialData?: Handover }) {
  const { patients: allPatients, professionals: allProfessionals } = useAppData();
  
  const patients = allPatients.filter(p => p.active !== false);
  const professionals = allProfessionals.filter(p => p.active !== false).sort((a, b) => a.name.localeCompare(b.name));

  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [search, setSearch] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);
  const { register, handleSubmit, watch, setValue, getValues, setError, reset, formState: { errors } } = useForm<HandoverFormData>({
    resolver: zodResolver(handoverSchema),
    defaultValues: initialData ? {
      patientId: initialData.patientId,
      handoverDate: formatInitialDate(initialData.handoverDate),
      shift: initialData.shift,
      hadEvacuation: initialData.hadEvacuation,
      tookSOSMedication: initialData.tookSOSMedication,
      sosMedicationName: initialData.sosMedicationName || '',
      hadComplication: initialData.hadComplication,
      hadDiurese: initialData.hadDiurese || false,
      complicationDescription: initialData.complicationDescription || '',
      observations: initialData.observations,
      professionalId: initialData.professionalId || '',
      professionalName: initialData.professionalName || '',
      ventilation: initialData.ventilation || '',
      precautions: initialData.precautions || '',
      news2_respiratoryRate: initialData.news2Values?.respiratoryRate || '',
      news2_spo2Scale: initialData.news2Values?.spo2Scale || '',
      news2_spo2: initialData.news2Values?.spo2 || '',
      news2_oxygenSupport: initialData.news2Values?.oxygenSupport || '',
      news2_systolicBp: initialData.news2Values?.systolicBp || '',
      news2_pulse: initialData.news2Values?.pulse || '',
      news2_consciousness: initialData.news2Values?.consciousness || '',
      news2_temperature: initialData.news2Values?.temperature || '',
    } : {
      patientId: '',
      handoverDate: '',
      hadEvacuation: false,
      tookSOSMedication: false,
      sosMedicationName: '',
      hadComplication: false,
      complicationDescription: '',
      hadDiurese: false,
      observations: '',
      professionalId: '',
      professionalName: '',
      shift: undefined,
      ventilation: '',
      precautions: '',
      news2_respiratoryRate: '',
      news2_spo2Scale: '',
      news2_spo2: '',
      news2_oxygenSupport: '',
      news2_systolicBp: '',
      news2_pulse: '',
      news2_consciousness: '',
      news2_temperature: '',
    }
  });

  const adjustHeight = (el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = 'auto';
    // Limit height to 240px to prevent keyboard clipping or overlap with bottom sticky buttons on mobile
    const nextHeight = Math.min(el.scrollHeight, 240);
    el.style.height = `${nextHeight}px`;
  };

  const { ref: observationsRef, ...observationsRegister } = register('observations');
  const { ref: complicationRef, ...complicationRegister } = register('complicationDescription');
  const { ref: sosRef, ...sosRegister } = register('sosMedicationName');

  function formatInitialDate(date: Timestamp | Date | string | null | undefined) {
    if (!date) return '';
    try {
      const d = date instanceof Timestamp ? date.toDate() : new Date(date);
      return d.toISOString().split('T')[0];
    } catch {
      return '';
    }
  }

  const tookSOS = watch('tookSOSMedication');
  const hadComplication = watch('hadComplication');

  const watchRespRate = watch('news2_respiratoryRate');
  const watchSpo2Scale = watch('news2_spo2Scale');
  const watchSpo2Value = watch('news2_spo2');
  const watchO2Support = watch('news2_oxygenSupport');
  const watchBp = watch('news2_systolicBp');
  const watchPulse = watch('news2_pulse');
  const watchConsciousness = watch('news2_consciousness');
  const watchTemp = watch('news2_temperature');

  const liveNEWS2Assessment = {
    respiratoryRate: watchRespRate,
    spo2Scale: watchSpo2Scale,
    spo2: watchSpo2Value,
    oxygenSupport: watchO2Support,
    systolicBp: watchBp,
    pulse: watchPulse,
    consciousness: watchConsciousness,
    temperature: watchTemp,
  };

  const isNews2Complete = !!(
    watchRespRate &&
    watchSpo2Scale &&
    watchSpo2Value &&
    watchO2Support &&
    watchBp &&
    watchPulse &&
    watchConsciousness &&
    watchTemp
  );

  const liveNEWS2Result = isNews2Complete ? calculateNEWS2(liveNEWS2Assessment) : null;

  const getFieldColorClass = (param: string, value: string, extra?: string) => {
    if (!value) return "border-slate-100 bg-slate-50 focus:border-brand focus:bg-white";
    let points = 0;
    if (param === 'respiratoryRate') {
      points = respiratoryRateOptions.find(o => o.value === value)?.points ?? 0;
    } else if (param === 'oxygenSupport') {
      points = oxygenSupportOptions.find(o => o.value === value)?.points ?? 0;
    } else if (param === 'spo2') {
      if (extra === 'scale2') {
        points = spo2Scale2Options.find(o => o.value === value)?.points ?? 0;
      } else {
        points = spo2Scale1Options.find(o => o.value === value)?.points ?? 0;
      }
    } else if (param === 'systolicBp') {
      points = systolicBpOptions.find(o => o.value === value)?.points ?? 0;
    } else if (param === 'pulse') {
      points = pulseOptions.find(o => o.value === value)?.points ?? 0;
    } else if (param === 'consciousness') {
      points = consciousnessOptions.find(o => o.value === value)?.points ?? 0;
    } else if (param === 'temperature') {
      points = temperatureOptions.find(o => o.value === value)?.points ?? 0;
    }

    if (points === 3) return "border-red-300 bg-red-50 text-red-950 focus:border-red-500 font-bold focus:bg-white";
    if (points === 2) return "border-amber-300 bg-amber-50 text-amber-950 focus:border-amber-500 font-bold focus:bg-white";
    if (points === 1) return "border-yellow-300 bg-yellow-50/50 text-yellow-950 focus:border-yellow-500 font-bold focus:bg-white";
    return "border-emerald-200 bg-emerald-50/15 text-emerald-950 focus:border-emerald-500 font-medium focus:bg-white";
  };

  const prevScaleRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    // Gracefully clear SpO2 value only if the scale changes *after* initial mount to ensure clinical safety and draft preserving
    if (prevScaleRef.current !== undefined && prevScaleRef.current !== watchSpo2Scale) {
      setValue('news2_spo2', '');
    }
    prevScaleRef.current = watchSpo2Scale;
  }, [watchSpo2Scale, setValue]);



  useEffect(() => {
    if (initialData) {
      const patient = patients.find(p => p.id === initialData.patientId);
      if (patient) setSelectedPatient(patient);
    }
  }, [patients, initialData]);

  const filteredPatients = patients.filter(p => (p.name?.toLowerCase() || '').includes(search.toLowerCase()));

  const onSubmit = async (data: HandoverFormData) => {
    if (!auth.currentUser) return;
    setSubmitting(true);
    try {
      const [year, month, day] = data.handoverDate.split('-').map(Number);
      const hDate = new Date(year, month - 1, day);
      
      const {
        news2_respiratoryRate,
        news2_spo2Scale,
        news2_spo2,
        news2_oxygenSupport,
        news2_systolicBp,
        news2_pulse,
        news2_consciousness,
        news2_temperature,
        ...restCleanedData
      } = Object.entries(data).reduce((acc, [key, value]) => {
        acc[key] = value === undefined ? '' : value;
        return acc;
      }, {} as any);

      // Perform the medical calculator step only if all 8 parameters are completed
      const assessmentValues = {
        respiratoryRate: data.news2_respiratoryRate || '',
        spo2Scale: data.news2_spo2Scale || '',
        spo2: data.news2_spo2 || '',
        oxygenSupport: data.news2_oxygenSupport || '',
        systolicBp: data.news2_systolicBp || '',
        pulse: data.news2_pulse || '',
        consciousness: data.news2_consciousness || '',
        temperature: data.news2_temperature || '',
      };
      
      const isNews2Complete = !!(
        assessmentValues.respiratoryRate &&
        assessmentValues.spo2Scale &&
        assessmentValues.spo2 &&
        assessmentValues.oxygenSupport &&
        assessmentValues.systolicBp &&
        assessmentValues.pulse &&
        assessmentValues.consciousness &&
        assessmentValues.temperature
      );

      let calcResult = null;
      if (isNews2Complete) {
        calcResult = calculateNEWS2(assessmentValues);
      }

      const handoverData = {
        ...restCleanedData,
        patientName: selectedPatient?.name,
        deviceTypes: selectedPatient?.usesDevice ? (selectedPatient.deviceTypes || null) : null,
        handoverDate: Timestamp.fromDate(hDate),
        updatedAt: Timestamp.now(),
        status: 'Publicada' as const,
        publishedAt: Timestamp.now(),
        news2Score: calcResult ? calcResult.totalScore : null,
        news2Classification: calcResult ? calcResult.classification.level : null,
        news2Values: assessmentValues,
        professionalUid: auth.currentUser.uid,
        professionalEmail: auth.currentUser.email || '',
      };

      if (initialData) {
        await updateDoc(doc(db, 'handovers', initialData.id), handoverData);
      } else {
        await addDoc(collection(db, 'handovers'), {
          ...handoverData,
          createdAt: Timestamp.now(),
        });
      }
      onClose();
    } catch (error) {
      if (isMounted.current) {
        setSubmitting(false);
      }
      handleFirestoreError(error, initialData ? OperationType.UPDATE : OperationType.WRITE, initialData ? `handovers/${initialData.id}` : 'handovers');
    } finally {
      if (isMounted.current) {
        setSubmitting(false);
      }
    }
  };

  const handleSaveDraft = async () => {
    if (!auth.currentUser) return;
    const data = getValues();
    if (!data.patientId) {
      setError('patientId', { type: 'manual', message: 'Selecione um paciente para salvar como rascunho' });
      return;
    }
    setSubmitting(true);
    try {
      let hDate: Date | null = null;
      if (data.handoverDate) {
        const [year, month, day] = data.handoverDate.split('-').map(Number);
        hDate = new Date(year, month - 1, day);
      }
      
      const {
        news2_respiratoryRate,
        news2_spo2Scale,
        news2_spo2,
        news2_oxygenSupport,
        news2_systolicBp,
        news2_pulse,
        news2_consciousness,
        news2_temperature,
        ...restCleanedData
      } = Object.entries(data).reduce((acc, [key, value]) => {
        acc[key] = value === undefined ? '' : value;
        return acc;
      }, {} as any);

      // Perform the medical calculator step only if all 8 parameters are completed
      const assessmentValues = {
        respiratoryRate: data.news2_respiratoryRate || '',
        spo2Scale: data.news2_spo2Scale || '',
        spo2: data.news2_spo2 || '',
        oxygenSupport: data.news2_oxygenSupport || '',
        systolicBp: data.news2_systolicBp || '',
        pulse: data.news2_pulse || '',
        consciousness: data.news2_consciousness || '',
        temperature: data.news2_temperature || '',
      };
      
      const isNews2Complete = !!(
        assessmentValues.respiratoryRate &&
        assessmentValues.spo2Scale &&
        assessmentValues.spo2 &&
        assessmentValues.oxygenSupport &&
        assessmentValues.systolicBp &&
        assessmentValues.pulse &&
        assessmentValues.consciousness &&
        assessmentValues.temperature
      );

      let calcResult = null;
      if (isNews2Complete) {
        calcResult = calculateNEWS2(assessmentValues);
      }

      const handoverData = {
        ...restCleanedData,
        patientName: selectedPatient?.name || '',
        deviceTypes: selectedPatient?.usesDevice ? (selectedPatient.deviceTypes || null) : null,
        handoverDate: hDate ? Timestamp.fromDate(hDate) : null,
        updatedAt: Timestamp.now(),
        status: 'Rascunho' as const,
        publishedAt: initialData?.publishedAt || null,
        news2Score: calcResult ? calcResult.totalScore : null,
        news2Classification: calcResult ? calcResult.classification.level : null,
        news2Values: assessmentValues,
        professionalUid: auth.currentUser.uid,
        professionalEmail: auth.currentUser.email || '',
      };

      if (initialData) {
        await updateDoc(doc(db, 'handovers', initialData.id), handoverData);
      } else {
        await addDoc(collection(db, 'handovers'), {
          ...handoverData,
          createdAt: Timestamp.now(),
        });
      }
      onClose();
    } catch (error) {
      if (isMounted.current) {
        setSubmitting(false);
      }
      handleFirestoreError(error, initialData ? OperationType.UPDATE : OperationType.WRITE, initialData ? `handovers/${initialData.id}` : 'handovers');
    } finally {
      if (isMounted.current) {
        setSubmitting(false);
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-6 backdrop-blur-sm"
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="flex flex-col h-[92vh] sm:h-auto sm:max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-t-[2rem] bg-white sm:rounded-[2.5rem] shadow-2xl relative"
      >
        <div className="flex-shrink-0 flex items-center justify-between border-b-4 border-slate-900/5 bg-white px-5 sm:px-8 py-3 sm:py-6">
          <div className="flex-1">
            <h2 className="text-xl sm:text-3xl font-black tracking-tighter text-slate-900 leading-none truncate">
              {initialData ? 'Editar Passagem' : 'Nova Passagem'}
            </h2>
            <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-brand mt-1 sm:mt-2">Enfermagem Digital</p>
          </div>
          <button onClick={onClose} className="flex-shrink-0 ml-4 rounded-2xl bg-slate-100 p-2 sm:p-3 text-slate-400 hover:text-slate-900 transition-all active:scale-95">
            <X className="h-5 w-5 sm:h-6 sm:w-6 stroke-[3px]" />
          </button>
        </div>

        <form id="handover-form" onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 sm:space-y-8 custom-scrollbar pb-6">
          <input type="hidden" {...register('patientId')} />
          <div className="space-y-2 relative">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 font-mono">Paciente</label>
            <div className="relative group">
              <Search className={cn("absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 transition-colors", isDropdownOpen ? "text-brand" : "text-slate-300")} />
              <input
                type="text"
                placeholder="Pesquisar paciente..."
                value={selectedPatient && !isDropdownOpen ? selectedPatient.name : search}
                onChange={(e) => { setSearch(e.target.value); setIsDropdownOpen(true); }}
                onFocus={() => setIsDropdownOpen(true)}
                className={cn("w-full rounded-2xl border-2 py-4 pl-12 pr-12 font-black transition-all outline-none", isDropdownOpen || selectedPatient ? "border-brand bg-white shadow-lg shadow-brand/5" : "border-slate-100 bg-slate-50")}
              />
              {(selectedPatient || search) && (
                <button type="button" onClick={() => { setSelectedPatient(null); setSearch(''); setValue('patientId', ''); setIsDropdownOpen(false); }} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-900 transition-colors">
                  <X className="h-5 w-5 stroke-[3px]" />
                </button>
              )}
            </div>

            <AnimatePresence>
              {isDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setIsDropdownOpen(false)} />
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="absolute left-0 right-0 top-full z-40 mt-1 max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-2xl custom-scrollbar">
                    {loading ? (
                      <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-brand" /></div>
                    ) : filteredPatients.length > 0 ? (
                      <div className="py-1">
                        {filteredPatients.map(p => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => { setSelectedPatient(p); setValue('patientId', p.id); setIsDropdownOpen(false); setSearch(''); }}
                            className={cn("flex w-full items-center justify-between px-4 py-3 text-left transition-all", selectedPatient?.id === p.id ? "bg-[#1a73e8] text-white" : "hover:bg-[#1a73e8] hover:text-white group text-slate-700")}
                          >
                            <div className="flex items-center gap-3">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="font-bold text-sm tracking-tight">{p.name}</p>
                                    <span className={cn("px-1.5 py-0.5 rounded text-[7px] font-black tracking-widest uppercase border", p.complexity?.includes('ALTA') ? "bg-red-50 text-red-600 border-red-100" : p.complexity?.includes('MÉDIA') ? "bg-amber-50 text-amber-600 border-amber-100" : "bg-blue-50 text-blue-600 border-blue-100")}>{p.complexity}</span>
                                    {p.usesDevice && p.deviceTypes && p.deviceTypes.length > 0 && <span className="bg-purple-50 text-purple-600 border border-purple-100 px-1 py-0.5 rounded text-[7px] font-black uppercase">{p.deviceTypes.join(', ')}</span>}
                                  </div>
                                  <p className={cn("text-[9px] font-medium tracking-wide", selectedPatient?.id === p.id ? "text-white/80" : "text-slate-400 group-hover:text-white/80")}>NASC: {p.birthDate ? p.birthDate.split('-').reverse().join('/') : '---'}</p>
                                </div>
                            </div>
                            {selectedPatient?.id === p.id && <Check className="h-4 w-4 text-white" />}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="py-8 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">Nenhum paciente encontrado</div>
                    )}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
            {selectedPatient && !isDropdownOpen && (
              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex flex-wrap gap-2 mt-2">
                <span className={cn("px-2 py-0.5 rounded-full text-[8px] font-black tracking-widest uppercase border", selectedPatient.complexity?.includes('ALTA') ? "bg-red-50 text-red-600 border-red-100" : selectedPatient.complexity?.includes('MÉDIA') ? "bg-amber-50 text-amber-600 border-amber-100" : "bg-blue-50 text-blue-600 border-blue-100")}>{selectedPatient.complexity}</span>
                {selectedPatient.usesDevice && selectedPatient.deviceTypes && selectedPatient.deviceTypes.length > 0 && <span className="bg-purple-50 text-purple-600 border border-purple-100 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest">Dispositivos: {selectedPatient.deviceTypes.join(', ')}</span>}
              </motion.div>
            )}
            {errors.patientId && <p className="text-[10px] font-black text-red-500 uppercase tracking-widest ml-1">{errors.patientId.message}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 font-mono">Profissional</label>
              <select
                {...register('professionalId', {
                  onChange: (e) => {
                    const id = e.target.value;
                    const prof = professionals.find(p => p.id === id);
                    if (prof) {
                      setValue('professionalName', prof.name);
                    }
                  }
                })}
                className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 py-4 px-6 font-black transition-all focus:bg-white focus:border-brand outline-none appearance-none cursor-pointer"
              >
                <option value="">Selecione o profissional</option>
                {professionals.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              {errors.professionalId && <p className="text-[10px] font-black text-red-500 uppercase tracking-widest ml-1">{errors.professionalId.message}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 font-mono">Turno</label>
              <select
                {...register('shift')}
                className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 py-4 px-6 font-black transition-all focus:bg-white focus:border-brand outline-none appearance-none cursor-pointer"
              >
                <option value="">Selecione o turno</option>
                {Object.values(WorkShift).map(shift => <option key={shift} value={shift}>{shift}</option>)}
              </select>
              {errors.shift && <p className="text-[10px] font-black text-red-500 uppercase tracking-widest ml-1">{errors.shift.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 font-mono">Data do Plantão</label>
              <input {...register('handoverDate')} type="date" className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 py-4 px-6 font-black transition-all focus:bg-white focus:border-brand outline-none" />
              {errors.handoverDate && <p className="text-[10px] font-black text-red-500 uppercase tracking-widest ml-1">{errors.handoverDate.message}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 font-mono">Tipos de Precauções</label>
              <select
                {...register('precautions')}
                className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 py-4 px-6 font-black transition-all focus:bg-white focus:border-brand outline-none appearance-none cursor-pointer"
              >
                <option value="">Selecione a precaução</option>
                <option value="Precaução padrão">Precaução padrão</option>
                <option value="Precaução de contato">Precaução de contato</option>
                <option value="Gotículas">Gotículas</option>
                <option value="Aerossóis">Aerossóis</option>
              </select>
              {errors.precautions && <p className="text-[10px] font-black text-red-500 uppercase tracking-widest ml-1">{errors.precautions.message}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 font-mono">Ventilação</label>
              <select
                {...register('ventilation')}
                className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 py-4 px-6 font-black transition-all focus:bg-white focus:border-brand outline-none appearance-none cursor-pointer"
              >
                <option value="">Selecione a ventilação</option>
                <option value="Ventilação mecânica">Ventilação mecânica</option>
                <option value="O2 cateter">O2 cateter</option>
                <option value="O2 máscara">O2 máscara</option>
                <option value="Espontânea em ar ambiente">Espontânea em ar ambiente</option>
              </select>
              {errors.ventilation && <p className="text-[10px] font-black text-red-500 uppercase tracking-widest ml-1">{errors.ventilation.message}</p>}
            </div>
          </div>

          {/* NEWS2 Clinical Early Warning Score Section */}
          <div className="rounded-[2.5rem] border border-slate-200/80 bg-slate-50/40 p-6 sm:p-8 space-y-6">
            <div className="flex items-center gap-3 border-b-2 border-slate-900/5 pb-4">
              <div className="h-10 w-10 rounded-2xl bg-brand/10 text-brand flex items-center justify-center">
                <Activity className="h-5 w-5 stroke-[2.5px]" />
              </div>
              <div>
                <h4 className="text-base sm:text-lg font-black tracking-tight text-slate-900 leading-none">Avaliação do Escore NEWS2</h4>
                <p className="text-[9px] font-black uppercase tracking-widest text-[#1a73e8] mt-1 font-mono">National Early Warning Score 2 (RCP London • 2017)</p>
              </div>
            </div>

            {/* LIVE DASHBOARD STATUS BAR */}
            <div className={cn(
              "rounded-2xl border-2 overflow-hidden shadow-sm flex flex-col md:flex-row transition-all duration-300",
              !liveNEWS2Result ? "border-slate-200/80" :
              liveNEWS2Result.classification.level === 'ALTO' ? "border-red-500 ring-2 ring-red-500/10" :
              liveNEWS2Result.classification.level === 'MÉDIO' ? "border-amber-500 ring-2 ring-amber-500/10" :
              liveNEWS2Result.classification.level === 'BAIXO-MÉDIO' ? "border-yellow-500 ring-2 ring-yellow-500/10" :
              "border-emerald-500 ring-2 ring-emerald-500/10"
            )}>
              {!liveNEWS2Result ? (
                <div className="w-full bg-slate-100 p-4 font-bold text-center text-xs text-slate-500 tracking-tight flex items-center justify-center gap-2">
                  <AlertCircle className="h-4 w-4 animate-bounce text-slate-400" />
                  Preencha os 7 parâmetros vitais obrigatórios abaixo para calcular o escore NEWS2...
                </div>
              ) : (
                <>
                  {/* Real-time score details */}
                  <div className={cn(
                    "flex-shrink-0 p-6 flex flex-col items-center justify-center text-center gap-1 border-b md:border-b-0 md:border-r border-dotted",
                    liveNEWS2Result.classification.level === 'ALTO' ? "bg-red-500/10 text-red-900 border-red-500/20" :
                    liveNEWS2Result.classification.level === 'MÉDIO' ? "bg-amber-500/10 text-amber-900 border-amber-500/20" :
                    liveNEWS2Result.classification.level === 'BAIXO-MÉDIO' ? "bg-yellow-500/10 text-yellow-900 border-yellow-500/20" :
                    "bg-emerald-500/10 text-emerald-900 border-emerald-500/20"
                  )}>
                    <p className="text-[9px] font-black uppercase tracking-widest opacity-60 font-mono">PONTUAÇÃO</p>
                    <div className="flex items-baseline justify-center">
                      <span className="text-4xl font-black tracking-tighter">{liveNEWS2Result.totalScore}</span>
                      <span className="text-xs font-bold text-slate-400">/20</span>
                    </div>
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest mt-1.5 shadow-sm border",
                      liveNEWS2Result.classification.level === 'ALTO' ? "bg-red-500 text-white border-red-600" :
                      liveNEWS2Result.classification.level === 'MÉDIO' ? "bg-amber-500 text-white border-amber-600" :
                      liveNEWS2Result.classification.level === 'BAIXO-MÉDIO' ? "bg-yellow-500 text-slate-900 border-yellow-600" :
                      "bg-emerald-500 text-white border-emerald-600"
                    )}>
                      {liveNEWS2Result.classification.level}
                    </span>
                  </div>

                  {/* Real-time response protocol */}
                  <div className={cn(
                    "flex-1 p-5 space-y-1.5 text-xs font-bold font-sans",
                    liveNEWS2Result.classification.level === 'ALTO' ? "bg-red-50/50 text-red-950" :
                    liveNEWS2Result.classification.level === 'MÉDIO' ? "bg-amber-50/50 text-amber-950" :
                    liveNEWS2Result.classification.level === 'BAIXO-MÉDIO' ? "bg-yellow-50/50 text-yellow-950" :
                    "bg-emerald-50/50 text-emerald-950"
                  )}>
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 font-mono">PROTOCOLO DE RESPOSTA CLÍNICA</p>
                    <p className="text-xs font-black">{liveNEWS2Result.classification.description}</p>
                    <p className="text-xs leading-relaxed font-medium">{liveNEWS2Result.classification.response}</p>
                  </div>
                </>
              )}
            </div>

            {/* LIVE ALERTS NOTIFICATIONS */}
            {liveNEWS2Result && (
              <AnimatePresence>
                <div className="space-y-2">
                  {liveNEWS2Result.totalScore >= 7 && (
                    <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="p-3.5 rounded-xl bg-red-600 text-white flex items-center gap-3 text-xs font-black uppercase tracking-wide leading-relaxed shadow-lg shadow-red-600/10">
                      <AlertCircle className="h-5 w-5 flex-shrink-0" />
                      <div>🚨 ALERTA DE RISCO ALTO (NEWS2 ≥ 7): Orientar o técnico nos primeiros socorros, indicar escalonamento do cuidado (internação) e solicitar transferência imediata ao Pronto Atendimento.</div>
                    </motion.div>
                  )}
                  {liveNEWS2Result.totalScore >= 5 && liveNEWS2Result.totalScore <= 6 && (
                    <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="p-3.5 rounded-xl bg-amber-500 text-white flex items-center gap-3 text-xs font-black uppercase tracking-wide leading-relaxed shadow-lg shadow-amber-500/10">
                      <AlertCircle className="h-5 w-5 flex-shrink-0" />
                      <div>⚠️ ALERTA DE RISCO INTERMEDIÁRIO (NEWS2 5-6): Solicitar consulta de intercorrência (Enfermeiro Plantonista e Médico Assistente) e reavaliação mínima a cada hora.</div>
                    </motion.div>
                  )}
                  {(liveNEWS2Result.hasRedTrigger || liveNEWS2Result.totalScore === 3) && liveNEWS2Result.totalScore < 5 && (
                    <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="p-3.5 rounded-xl bg-yellow-500 text-slate-900 border border-yellow-600 flex items-center gap-3 text-xs font-black uppercase tracking-wide leading-relaxed shadow-md">
                      <AlertCircle className="h-5 w-5 flex-shrink-0" />
                      <div>💡 ALERTA DE RISCO BAIXO-INTERMEDIÁRIO (Gatilho de Valor 3 ou Score 3): O Enfermeiro Plantonista deve comunicar o Médico Assistente para ajuste do monitoramento clínico ou escalonamento do cuidado (internação).</div>
                    </motion.div>
                  )}
                </div>
              </AnimatePresence>
            )}

            {/* FORM INPUT CONTROLS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              
              {/* FR */}
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-slate-500">
                  <Wind className="h-3.5 w-3.5 text-blue-500 stroke-[2.5px]" />
                  <label className="text-[10px] font-black uppercase tracking-wider font-mono">Frequência Respiratória</label>
                </div>
                <select
                  {...register('news2_respiratoryRate')}
                  className={cn(
                    "w-full rounded-xl border-2 py-3 px-4 font-bold text-xs transition-all outline-none cursor-pointer appearance-none",
                    errors.news2_respiratoryRate ? "border-red-200 bg-red-50/20" : getFieldColorClass('respiratoryRate', watchRespRate)
                  )}
                >
                  <option value="">Selecione...</option>
                  {respiratoryRateOptions.map(o => (
                    <option key={o.value} value={o.value}>{o.label} ({o.points} {o.points === 1 ? 'ponto' : 'pontos'})</option>
                  ))}
                </select>
                {errors.news2_respiratoryRate && <p className="text-[9px] font-black text-red-500 uppercase tracking-widest">{errors.news2_respiratoryRate.message}</p>}
              </div>

              {/* O2 Support */}
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-slate-500">
                  <Wind className="h-3.5 w-3.5 text-sky-500 stroke-[2.5px]" />
                  <label className="text-[10px] font-black uppercase tracking-wider font-mono">Suporte de Oxigênio</label>
                </div>
                <select
                  {...register('news2_oxygenSupport')}
                  className={cn(
                    "w-full rounded-xl border-2 py-3 px-4 font-bold text-xs transition-all outline-none cursor-pointer appearance-none",
                    errors.news2_oxygenSupport ? "border-red-200 bg-red-50/20" : getFieldColorClass('oxygenSupport', watchO2Support)
                  )}
                >
                  <option value="">Selecione...</option>
                  {oxygenSupportOptions.map(o => (
                    <option key={o.value} value={o.value}>{o.label} ({o.points} {o.points === 1 ? 'ponto' : 'pontos'})</option>
                  ))}
                </select>
                {errors.news2_oxygenSupport && <p className="text-[9px] font-black text-red-500 uppercase tracking-widest">{errors.news2_oxygenSupport.message}</p>}
              </div>

              {/* SpO2 Scale Selection */}
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-slate-500">
                  <Activity className="h-3.5 w-3.5 text-[#1a73e8] stroke-[2.5px]" />
                  <label className="text-[10px] font-black uppercase tracking-wider font-mono">Tipo de Escala SpO₂</label>
                </div>
                <select
                  {...register('news2_spo2Scale')}
                  className="w-full rounded-xl border-2 py-3 px-4 font-bold text-xs border-slate-100 bg-white focus:border-brand transition-all outline-none cursor-pointer appearance-none"
                >
                  <option value="">Selecione...</option>
                  {spo2ScaleOptions.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              {/* SpO2 Value */}
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-slate-500">
                  <Activity className="h-3.5 w-3.5 text-teal-500 stroke-[2.5px]" />
                  <label className="text-[10px] font-black uppercase tracking-wider font-mono">Valor Registrado SpO₂</label>
                </div>
                <select
                  {...register('news2_spo2')}
                  className={cn(
                    "w-full rounded-xl border-2 py-3 px-4 font-bold text-xs transition-all outline-none cursor-pointer appearance-none",
                    errors.news2_spo2 ? "border-red-200 bg-red-50/20" : getFieldColorClass('spo2', watchSpo2Value, watchSpo2Scale)
                  )}
                >
                  <option value="">Selecione...</option>
                  {!watchSpo2Scale ? (
                    <option value="">Selecione a escala SpO₂ primeiro...</option>
                  ) : watchSpo2Scale === 'scale2' 
                    ? spo2Scale2Options.map(o => (
                        <option key={o.value} value={o.value}>{o.label} ({o.points} {o.points === 1 ? 'ponto' : 'pontos'})</option>
                      ))
                    : spo2Scale1Options.map(o => (
                        <option key={o.value} value={o.value}>{o.label} ({o.points} {o.points === 1 ? 'ponto' : 'pontos'})</option>
                      ))
                  }
                </select>
                {errors.news2_spo2 && <p className="text-[9px] font-black text-red-500 uppercase tracking-widest">{errors.news2_spo2.message}</p>}
              </div>

              {/* PAS */}
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-slate-500">
                  <Heart className="h-3.5 w-3.5 text-rose-500 stroke-[2.5px]" />
                  <label className="text-[10px] font-black uppercase tracking-wider font-mono">Pressão Arterial Sistólica</label>
                </div>
                <select
                  {...register('news2_systolicBp')}
                  className={cn(
                    "w-full rounded-xl border-2 py-3 px-4 font-bold text-xs transition-all outline-none cursor-pointer appearance-none",
                    errors.news2_systolicBp ? "border-red-200 bg-red-50/20" : getFieldColorClass('systolicBp', watchBp)
                  )}
                >
                  <option value="">Selecione...</option>
                  {systolicBpOptions.map(o => (
                    <option key={o.value} value={o.value}>{o.label} ({o.points} {o.points === 1 ? 'ponto' : 'pontos'})</option>
                  ))}
                </select>
                {errors.news2_systolicBp && <p className="text-[9px] font-black text-red-500 uppercase tracking-widest">{errors.news2_systolicBp.message}</p>}
              </div>

              {/* Pulse */}
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-slate-500">
                  <Heart className="h-3.5 w-3.5 text-rose-600 stroke-[2.5px]" />
                  <label className="text-[10px] font-black uppercase tracking-wider font-mono">Frequência Cardiovascular (Pulso)</label>
                </div>
                <select
                  {...register('news2_pulse')}
                  className={cn(
                    "w-full rounded-xl border-2 py-3 px-4 font-bold text-xs transition-all outline-none cursor-pointer appearance-none",
                    errors.news2_pulse ? "border-red-200 bg-red-50/20" : getFieldColorClass('pulse', watchPulse)
                  )}
                >
                  <option value="">Selecione...</option>
                  {pulseOptions.map(o => (
                    <option key={o.value} value={o.value}>{o.label} ({o.points} {o.points === 1 ? 'ponto' : 'pontos'})</option>
                  ))}
                </select>
                {errors.news2_pulse && <p className="text-[9px] font-black text-red-500 uppercase tracking-widest">{errors.news2_pulse.message}</p>}
              </div>

              {/* Consciousness */}
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-slate-500">
                  <Brain className="h-3.5 w-3.5 text-purple-600 stroke-[2.5px]" />
                  <label className="text-[10px] font-black uppercase tracking-wider font-mono">Nível de Consciência</label>
                </div>
                <select
                  {...register('news2_consciousness')}
                  className={cn(
                    "w-full rounded-xl border-2 py-3 px-4 font-bold text-xs transition-all outline-none cursor-pointer appearance-none",
                    errors.news2_consciousness ? "border-red-200 bg-red-50/20" : getFieldColorClass('consciousness', watchConsciousness)
                  )}
                >
                  <option value="">Selecione...</option>
                  {consciousnessOptions.map(o => (
                    <option key={o.value} value={o.value}>{o.label} ({o.points} {o.points === 1 ? 'ponto' : 'pontos'})</option>
                  ))}
                </select>
                {errors.news2_consciousness && <p className="text-[9px] font-black text-red-500 uppercase tracking-widest">{errors.news2_consciousness.message}</p>}
              </div>

              {/* Temperature */}
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-slate-500">
                  <Thermometer className="h-3.5 w-3.5 text-amber-500 stroke-[2.5px]" />
                  <label className="text-[10px] font-black uppercase tracking-wider font-mono">Temperatura Corporal</label>
                </div>
                <select
                  {...register('news2_temperature')}
                  className={cn(
                    "w-full rounded-xl border-2 py-3 px-4 font-bold text-xs transition-all outline-none cursor-pointer appearance-none",
                    errors.news2_temperature ? "border-red-200 bg-red-50/20" : getFieldColorClass('temperature', watchTemp)
                  )}
                >
                  <option value="">Selecione...</option>
                  {temperatureOptions.map(o => (
                    <option key={o.value} value={o.value}>{o.label} ({o.points} {o.points === 1 ? 'ponto' : 'pontos'})</option>
                  ))}
                </select>
                {errors.news2_temperature && <p className="text-[9px] font-black text-red-500 uppercase tracking-widest">{errors.news2_temperature.message}</p>}
              </div>

            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
             <BooleanQuestion label="Teve evacuação?" icon={<Check className="h-4 w-4" />} value={watch('hadEvacuation')} onChange={(val) => setValue('hadEvacuation', val)} />
             <BooleanQuestion label="Diurese Presente?" icon={<Check className="h-4 w-4" />} value={watch('hadDiurese')} onChange={(val) => setValue('hadDiurese', val)} />
             <BooleanQuestion label="Medicação SOS?" icon={<Pill className="h-4 w-4" />} value={watch('tookSOSMedication')} onChange={(val) => setValue('tookSOSMedication', val)} />
          </div>

          <AnimatePresence>
            {tookSOS && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-brand">Qual medicação SOS?</label>
                <textarea 
                  {...sosRegister} 
                  ref={(el) => {
                    sosRef(el);
                    adjustHeight(el);
                  }}
                  onInput={(e) => adjustHeight(e.target as HTMLTextAreaElement)}
                  className="w-full rounded-2xl border-2 border-brand/10 bg-brand/5 py-4 px-6 font-bold text-slate-900 focus:bg-white focus:ring-4 focus:ring-brand/10 focus:border-brand outline-none transition-all resize-none overflow-y-auto min-h-[80px] break-words whitespace-pre-wrap" 
                  placeholder="Descreva as medicações e horários..." 
                  rows={2} 
                />
              </motion.div>
            )}
          </AnimatePresence>

          <BooleanQuestion label="Intercorrência?" icon={<AlertCircle className="h-4 w-4" />} value={watch('hadComplication')} onChange={(val) => setValue('hadComplication', val)} variant="danger" />

          <AnimatePresence>
            {hadComplication && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-red-600">Descreva o ocorrido</label>
                <textarea 
                  {...complicationRegister} 
                  ref={(el) => {
                    complicationRef(el);
                    adjustHeight(el);
                  }}
                  onInput={(e) => adjustHeight(e.target as HTMLTextAreaElement)}
                  rows={3} 
                  className="w-full rounded-2xl border-2 border-red-50 bg-red-50/30 py-4 px-6 font-bold text-red-900 focus:bg-white focus:ring-4 focus:ring-red-600/10 focus:border-red-600 outline-none transition-all resize-none overflow-y-auto min-h-[100px] break-words whitespace-pre-wrap" 
                  placeholder="Relate o ocorrido detalhadamente..." 
                />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
              <MessageSquare className="h-4 w-4" /> Observações gerais
            </div>
            <textarea 
              {...observationsRegister} 
              ref={(el) => {
                observationsRef(el);
                adjustHeight(el);
              }}
              onInput={(e) => adjustHeight(e.target as HTMLTextAreaElement)}
              rows={4} 
              className="w-full rounded-[2rem] border-2 border-slate-100 bg-slate-50 py-6 px-8 font-medium text-slate-700 transition-all focus:bg-white focus:ring-4 focus:ring-brand/10 focus:border-brand outline-none resize-none overflow-y-auto min-h-[120px] break-words whitespace-pre-wrap" 
              placeholder="Notas importantes sobre o plantão..." 
            />
            {errors.observations && <p className="text-[10px] font-black text-red-500 uppercase tracking-widest">{errors.observations.message}</p>}
          </div>

          {Object.keys(errors).length > 0 && (
            <div className="p-4 rounded-2xl bg-red-50 border-2 border-red-100 space-y-2">
              <div className="flex items-center gap-2 text-red-600 font-black uppercase tracking-widest text-[10px]"><AlertCircle className="h-4 w-4" /> Atenção: Campos faltando</div>
              <ul className="list-disc list-inside text-[10px] font-bold text-red-500 space-y-1">
                {errors.patientId && <li>Selecione um paciente</li>}
                {errors.professionalId && <li>Selecione o profissional</li>}
                {errors.shift && <li>Selecione o turno</li>}
                {errors.handoverDate && <li>Selecione a data</li>}
                {errors.precautions && <li>Selecione o tipo de precaução</li>}
                {errors.ventilation && <li>Selecione o tipo de ventilação</li>}
                {errors.news2_respiratoryRate && <li>NEWS2: Frequência respiratória não selecionada</li>}
                {errors.news2_oxygenSupport && <li>NEWS2: Suporte de oxigênio não selecionado</li>}
                {errors.news2_spo2 && <li>NEWS2: Valor de SpO₂ não selecionado</li>}
                {errors.news2_systolicBp && <li>NEWS2: Pressão arterial sistólica não selecionada</li>}
                {errors.news2_pulse && <li>NEWS2: Frequência cardiovascular (pulso) não selecionada</li>}
                {errors.news2_consciousness && <li>NEWS2: Nível de consciência não selecionado</li>}
                {errors.news2_temperature && <li>NEWS2: Temperatura corporal não selecionada</li>}
                {errors.observations && <li>Escreva as observações</li>}
              </ul>
            </div>
          )}
        </form>

        <div className="flex-shrink-0 p-4 sm:p-6 bg-white border-t border-slate-100 flex flex-col sm:flex-row items-center gap-3 relative z-40">
          <Button 
            type="button" 
            onClick={handleSaveDraft}
            isLoading={submitting} 
            variant="slate"
            className="w-full sm:flex-1"
            size="lg"
          >
            <Save className="h-5 w-5 stroke-[2.5px]" />
            SALVAR COMO RASCUNHO
          </Button>
          <Button 
            form="handover-form" 
            type="submit" 
            isLoading={submitting} 
            className="w-full sm:flex-1"
            size="lg"
          >
            <Check className="h-5 w-5 stroke-[2.5px]" />
            PUBLICAR PASSAGEM
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
