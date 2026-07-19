import React, { useState, useEffect } from 'react';
import { format, differenceInMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Calendar, History as HistoryIcon, Pill, User as UserIcon, X, Trash2, Edit, Loader2, Ban, CheckCircle, Activity, Heart, Thermometer, Brain, Wind } from 'lucide-react';
import { Handover, OperationType } from '../types';
import { cn, ensureDate } from '../lib/utils';
import { db, handleFirestoreError, auth, doc, deleteDoc, updateDoc, Timestamp, query, collection, where, getDocs } from '../lib/firebase';
import HandoverForm from '../views/HandoverForm';
import { Button } from './ui/Button';
import { calculateNEWS2, getOptionLabel } from '../lib/news2';

interface HandoverDetailsModalProps {
  handover: Handover | null;
  onClose: () => void;
  isAdmin?: boolean;
}

export default function HandoverDetailsModal({ handover, onClose, isAdmin = false }: HandoverDetailsModalProps) {
  const [currentHandover, setCurrentHandover] = useState<Handover | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  // States for Releasing
  const [isReleasing, setIsReleasing] = useState(false);

  // States for Cancellation
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  const [patientHistory, setPatientHistory] = useState<Handover[]>([]);

  useEffect(() => {
    const patientId = currentHandover?.patientId || handover?.patientId;
    if (!patientId) return;
    const fetchHistory = async () => {
      try {
        const q = query(
          collection(db, 'handovers'),
          where('patientId', '==', patientId),
        );
        const snap = await getDocs(q);
        const docs = snap.docs
          .map(d => ({ id: d.id, ...d.data() } as Handover))
          .filter(h => h.news2Score !== undefined && h.status === 'Publicada')
          .sort((a, b) => {
            const timeA = a.createdAt instanceof Timestamp ? a.createdAt.toMillis() : new Date(a.createdAt).getTime();
            const timeB = b.createdAt instanceof Timestamp ? b.createdAt.toMillis() : new Date(b.createdAt).getTime();
            return timeB - timeA;
          });
        setPatientHistory(docs);
      } catch (err) {
        console.error("Error fetching patient NEWS2 history:", err);
      }
    };
    fetchHistory();
  }, [currentHandover?.patientId, handover?.patientId, currentHandover?.id]);

  useEffect(() => {
    if (handover) {
      setCurrentHandover(handover);
    }
  }, [handover?.id]);

  if (!handover) return null;

  const current = currentHandover || handover;
  const isCreator = current.professionalUid === auth.currentUser?.uid;
  const status = current.status || 'Publicada'; // Treat legacy records as 'Publicada'

  // "Enquanto estiver em rascunho, somente o autor poderá editar o registro."
  // "Após ser publicada, a passagem de plantão não poderá mais ser editada."
  const canEdit = status === 'Rascunho' && isCreator;

  // "Apenas o profissional que criou a passagem de plantão poderá realizar a liberação. Deve existir um botão 'Liberar Passagem de Plantão'."
  const canRelease = status === 'Rascunho' && isCreator;

  // "O autor poderá cancelar uma passagem de plantão publicada somente dentro do prazo de 1 hora após a liberação. Após esse prazo, o cancelamento não será mais permitido."
  const publishedDate = current.publishedAt ? ensureDate(current.publishedAt) : (current.createdAt ? ensureDate(current.createdAt) : null);
  const minutesSinceRelease = publishedDate ? differenceInMinutes(new Date(), publishedDate) : 999;
  const canCancel = status === 'Publicada' && isCreator && minutesSinceRelease < 60;

  // "Enquanto estiver em rascunho, somente o autor poderá excluir o registro."
  // "Apenas usuários com perfil Administrador poderão excluir uma passagem de plantão."
  const canDelete = (status === 'Rascunho' && isCreator) || (status !== 'Rascunho' && isAdmin);

  // "Enquanto estiver em rascunho, somente o autor poderá visualizar o registro."
  const isRestrictedDraft = status === 'Rascunho' && !isCreator;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'handovers', current.id));
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `handovers/${current.id}`);
    } finally {
      setIsDeleting(false);
      setShowConfirmDelete(false);
    }
  };

  const handleRelease = async () => {
    setIsReleasing(true);
    try {
      const now = Timestamp.now();
      await updateDoc(doc(db, 'handovers', current.id), {
        status: 'Publicada',
        publishedAt: now,
        updatedAt: now,
      });
      setCurrentHandover(prev => prev ? { ...prev, status: 'Publicada', publishedAt: now, updatedAt: now } : null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `handovers/${current.id}`);
    } finally {
      setIsReleasing(false);
    }
  };

  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelReason.trim()) return;
    setIsCancelling(true);
    try {
      const now = Timestamp.now();
      await updateDoc(doc(db, 'handovers', current.id), {
        status: 'Cancelada',
        cancelledByUid: auth.currentUser?.uid || '',
        cancelledByName: auth.currentUser?.displayName || auth.currentUser?.email || '',
        cancelledByEmail: auth.currentUser?.email || '',
        cancelledAt: now,
        cancellationReason: cancelReason.trim(),
        updatedAt: now,
      });
      setCurrentHandover(prev => prev ? {
        ...prev,
        status: 'Cancelada',
        cancelledByUid: auth.currentUser?.uid || '',
        cancelledByName: auth.currentUser?.displayName || auth.currentUser?.email || '',
        cancelledByEmail: auth.currentUser?.email || '',
        cancelledAt: now,
        cancellationReason: cancelReason.trim(),
        updatedAt: now,
      } : null);
      setShowCancelForm(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `handovers/${current.id}`);
    } finally {
      setIsCancelling(false);
    }
  };

  const values = current.news2Values;
  const news2Result = current.news2Score !== undefined && values ? calculateNEWS2({
    respiratoryRate: values.respiratoryRate,
    spo2Scale: values.spo2Scale,
    spo2: values.spo2,
    oxygenSupport: values.oxygenSupport,
    systolicBp: values.systolicBp,
    pulse: values.pulse,
    consciousness: values.consciousness,
    temperature: values.temperature,
  }) : null;

  if (isRestrictedDraft) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
        <div className="relative w-full max-w-sm rounded-[2rem] bg-white p-8 text-center shadow-2xl">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h4 className="text-lg font-black text-slate-900 uppercase">Acesso Restrito</h4>
          <p className="text-xs font-medium text-slate-500 mt-2">Esta passagem de plantão está em rascunho e somente o autor pode visualizá-la.</p>
          <Button variant="slate" className="mt-6 w-full" onClick={onClose}>Fechar</Button>
        </div>
      </div>
    );
  }

  if (isEditing) {
    return <HandoverForm onClose={() => setIsEditing(false)} initialData={current} />;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 100 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 100 }}
        className="relative w-full max-w-2xl h-[92vh] sm:h-auto sm:max-h-[85vh] overflow-y-auto rounded-t-[2rem] sm:rounded-[2.5rem] bg-white p-6 sm:p-10 shadow-2xl custom-scrollbar"
      >
            {showConfirmDelete && (
              <div className="absolute inset-0 z-[60] flex items-center justify-center rounded-[2.5rem] bg-white/95 backdrop-blur-sm p-6 sm:p-10 text-center">
                <div className="space-y-6">
                  <div className="mx-auto h-16 w-16 bg-red-100 rounded-2xl flex items-center justify-center text-red-600">
                    <Trash2 className="h-8 w-8" />
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 uppercase">Confirmar Exclusão</h4>
                    <p className="text-xs sm:text-sm font-medium text-slate-500">Deseja realmente excluir este registro?<br/>Esta ação é permanente.</p>
                  </div>
                  <div className="flex gap-4 w-full">
                    <Button variant="slate" className="flex-1" onClick={() => setShowConfirmDelete(false)}>
                      Cancelar
                    </Button>
                    <Button variant="red" className="flex-1" onClick={handleDelete} isLoading={isDeleting}>
                      Confirmar
                    </Button>
                  </div>
                </div>
              </div>
            )}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-8 gap-4">
              <div className="space-y-2 sm:space-y-4">
                <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 leading-tight">Detalhes</h3>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={cn(
                    "flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-3 sm:px-4 py-1.5 rounded-full ring-1 ring-inset",
                    current.hadComplication 
                      ? "bg-red-50 text-red-600 ring-red-100" 
                      : "bg-emerald-50 text-emerald-600 ring-emerald-100"
                  )}>
                    <div className={cn("h-1.5 w-1.5 rounded-full", current.hadComplication ? "bg-red-500" : "bg-emerald-500")} />
                    {current.hadComplication ? "INTERCORRÊNCIA" : "CONCLUÍDA"}
                  </span>
                  <span className={cn(
                    "text-[10px] font-black uppercase tracking-widest px-3 sm:px-4 py-1.5 rounded-full ring-1 ring-inset",
                    status === 'Rascunho' ? "bg-slate-100 text-slate-600 ring-slate-200" :
                    status === 'Cancelada' ? "bg-rose-50 text-rose-600 ring-rose-200" :
                    "bg-purple-50 text-purple-600 ring-purple-100"
                  )}>
                    {status}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {canEdit && (
                  <Button variant="emerald" size="icon" className="h-10 w-10" onClick={() => setIsEditing(true)} title="Editar">
                    <Edit className="h-5 w-5" />
                  </Button>
                )}
                {canDelete && (
                  <Button variant="red" size="icon" className="h-10 w-10" onClick={() => setShowConfirmDelete(true)} title="Excluir">
                    <Trash2 className="h-5 w-5" />
                  </Button>
                )}
                <Button variant="slate" size="icon" className="h-10 w-10" onClick={onClose}>
                  <X className="h-6 w-6" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pb-6 sm:pb-10">
              <div className="bg-emerald-50/30 p-3 sm:p-5 rounded-[1.5rem] border border-emerald-100 flex flex-col items-center text-center gap-1">
                 <div className="flex items-center gap-1.5 text-emerald-600 mb-0.5">
                   <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                   <p className="text-[9px] font-black uppercase tracking-widest opacity-60">DATA</p>
                 </div>
                 <p className="text-xs sm:text-base font-black text-emerald-900 uppercase">
                    {format(ensureDate(current.handoverDate), "dd/MM/yyyy")}
                 </p>
              </div>
              <div className="bg-cyan-50/30 p-3 sm:p-5 rounded-[1.5rem] border border-cyan-100 flex flex-col items-center text-center gap-1">
                 <div className="flex items-center gap-1.5 text-cyan-600 mb-0.5">
                   <HistoryIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                   <p className="text-[9px] font-black uppercase tracking-widest opacity-60">TURNO</p>
                 </div>
                 <p className="text-xs sm:text-base font-black text-cyan-900 uppercase">{current.shift}</p>
              </div>
            </div>

            <div className="space-y-10">
               {/* Actions container based on state */}
               {canRelease && (
                <div className="rounded-2xl bg-slate-50 p-6 border-2 border-dashed border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex-1 space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Rascunho Particular</p>
                    <p className="text-xs font-bold text-slate-600">Esta passagem de plantão está salva como rascunho. Apenas você pode visualizá-la ou alterá-la no momento.</p>
                  </div>
                  <Button 
                    variant="brand" 
                    onClick={handleRelease} 
                    isLoading={isReleasing}
                    className="sm:flex-shrink-0 w-full sm:w-auto h-11"
                  >
                    <CheckCircle className="h-4 w-4" />
                    LIBERAR PASSAGEM
                  </Button>
                </div>
               )}

               {canCancel && !showCancelForm && (
                <div className="rounded-2xl bg-amber-50/50 p-6 border-2 border-dashed border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex-1 space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-600">Disponível para Cancelamento</p>
                    <p className="text-xs font-bold text-slate-600">Você pode realizar o cancelamento desta passagem de plantão publicada em até 1 hora após a liberação. Restam {Math.max(0, 60 - minutesSinceRelease)} minutos.</p>
                  </div>
                  <Button 
                    variant="red" 
                    onClick={() => setShowCancelForm(true)}
                    className="sm:flex-shrink-0 w-full sm:w-auto h-11"
                  >
                    <Ban className="h-4 w-4" />
                    CANCELAR PASSAGEM
                  </Button>
                </div>
               )}

               {showCancelForm && (
                <form onSubmit={handleCancelSubmit} className="rounded-2xl bg-red-50/50 p-6 border-2 border-red-200 space-y-4">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-red-600">Motivo do Cancelamento</p>
                    <p className="text-xs font-bold text-slate-600">Escreva o motivo obrigatório do cancelamento deste registro. Esta ação é definitiva.</p>
                  </div>
                  <textarea
                    required
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="Descreva o motivo detalhadamente (campo obrigatório)..."
                    className="w-full rounded-2xl border-2 border-red-100 bg-white py-4 px-5 font-bold text-slate-700 text-sm focus:outline-none focus:ring-4 focus:ring-red-100 focus:border-red-600 resize-none h-24"
                  />
                  <div className="flex gap-3 justify-end">
                    <Button type="button" variant="slate" onClick={() => { setShowCancelForm(false); setCancelReason(''); }}>
                      Cancelar
                    </Button>
                    <Button type="submit" variant="red" isLoading={isCancelling} disabled={!cancelReason.trim()}>
                      Confirmar Cancelamento
                    </Button>
                  </div>
                </form>
               )}

               {status === 'Cancelada' && (
                <div className="rounded-3xl bg-rose-50/50 p-6 border border-rose-100 space-y-4">
                  <div className="flex items-center gap-2 text-rose-700">
                    <Ban className="h-5 w-5" />
                    <p className="text-xs font-black uppercase tracking-widest">Passagem de Plantão Cancelada</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-3 border-b border-rose-100/50">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-rose-400">Responsável</p>
                      <p className="text-xs font-black text-rose-900 uppercase mt-0.5">{current.cancelledByName || current.cancelledByEmail}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-rose-400">Cancelado em</p>
                      <p className="text-xs font-black text-rose-900 uppercase mt-0.5">
                        {current.cancelledAt ? format(ensureDate(current.cancelledAt), "d MMM yy • HH:mm", { locale: ptBR }) : '---'}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-rose-400">Motivo</p>
                    <p className="text-sm font-bold text-rose-800 leading-relaxed italic mt-1 bg-white/70 p-4 rounded-xl border border-rose-100/30">
                      "{current.cancellationReason || 'Não especificado.'}"
                    </p>
                  </div>
                </div>
               )}

               <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <DetailItem label="PACIENTE" value={current.patientName} />
                    {current.deviceTypes && current.deviceTypes.length > 0 && (
                      <DetailItem label="DISPOSITIVOS" value={current.deviceTypes.join(', ')} />
                    )}
                    <DetailItem label="PRECAUÇÃO" value={current.precautions || 'NÃO REGISTRADO'} />
                    <DetailItem label="VENTILAÇÃO" value={current.ventilation || 'NÃO REGISTRADO'} />
                    <DetailItem label="EVACUAÇÃO" value={current.hadEvacuation ? 'SIM (RELATADO)' : 'NÃO'} />
                  </div>
                  <div className="space-y-6">
                    <DetailItem label="DIURESE" value={current.hadDiurese ? 'SIM (RELATADO)' : 'NÃO'} />
                    <DetailItem label="MEDICAÇÃO SOS" value={current.tookSOSMedication ? 'ADMINISTRADA' : 'NÃO NECESSÁRIA'} />
                  </div>
               </div>

               {current.tookSOSMedication && (
                <div className="rounded-2xl bg-amber-50 p-6 border border-amber-100">
                  <div className="flex items-center gap-2 text-amber-600 mb-2">
                    <Pill className="h-4 w-4" />
                    <p className="text-[10px] font-black uppercase tracking-widest">Medicação SOS Administrada</p>
                  </div>
                  <p className="text-base font-bold text-amber-900 whitespace-pre-wrap">{current.sosMedicationName}</p>
                </div>
              )}

              {current.hadComplication && (
                <div className="rounded-2xl bg-red-50 p-6 border border-red-100">
                  <div className="flex items-center gap-2 text-red-600 mb-2">
                    <AlertCircle className="h-4 w-4" />
                    <p className="text-[10px] font-black uppercase tracking-widest">Relato da Intercorrência</p>
                  </div>
                  <p className="text-base font-bold text-red-900 leading-relaxed whitespace-pre-wrap">{current.complicationDescription}</p>
                </div>
              )}

              {news2Result && values && (
                <div className="rounded-[2.5rem] border border-slate-200/80 bg-slate-50/50 p-6 sm:p-8 space-y-6">
                  {/* Title Bar */}
                  <div className="flex items-center gap-3 border-b-2 border-slate-900/5 pb-4">
                    <Activity className="h-5 w-5 text-brand stroke-[2.5px]" />
                    <div>
                      <h4 className="text-base sm:text-lg font-black tracking-tight text-slate-900 leading-none font-bold">Escore NEWS2 Registrado</h4>
                      <p className="text-[9px] font-black uppercase tracking-widest text-[#1a73e8] mt-1 font-mono font-bold">AVALIAÇÃO DE RISCO CLÍNICO — PROTOCOLO RCP</p>
                    </div>
                  </div>

                  {/* Top Score Summary Banner */}
                  <div className="rounded-2xl border-2 overflow-hidden shadow-inner flex flex-col md:flex-row bg-white">
                    <div className={cn(
                      "flex-shrink-0 p-6 flex flex-col items-center justify-center text-center gap-1 border-b md:border-b-0 md:border-r border-dotted",
                      news2Result.classification.level === 'ALTO' ? "bg-red-500/10 text-red-900 border-red-500/20" :
                      news2Result.classification.level === 'MÉDIO' ? "bg-amber-500/10 text-amber-900 border-amber-500/20" :
                      news2Result.classification.level === 'BAIXO-MÉDIO' ? "bg-yellow-500/10 text-yellow-900 border-yellow-500/20" :
                      "bg-emerald-500/10 text-emerald-900 border-emerald-500/20"
                    )}>
                      <p className="text-[9px] font-black uppercase tracking-widest opacity-60 font-mono">PONTUAÇÃO</p>
                      <div className="flex items-baseline justify-center">
                        <span className="text-4xl font-black tracking-tighter">{news2Result.totalScore}</span>
                        <span className="text-xs font-bold text-slate-400">/20</span>
                      </div>
                      <span className={cn(
                        "px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest mt-1.5 shadow-sm border",
                        news2Result.classification.level === 'ALTO' ? "bg-red-500 text-white border-red-600 font-bold" :
                        news2Result.classification.level === 'MÉDIO' ? "bg-amber-500 text-white border-amber-600 font-bold" :
                        news2Result.classification.level === 'BAIXO-MÉDIO' ? "bg-yellow-500 text-slate-900 border-yellow-600 font-bold" :
                        "bg-emerald-500 text-white border-emerald-600 font-bold"
                      )}>
                        {news2Result.classification.level}
                      </span>
                    </div>

                    <div className={cn(
                      "flex-1 p-5 space-y-1.5 text-xs font-bold font-sans",
                      news2Result.classification.level === 'ALTO' ? "bg-red-50/50 text-red-950" :
                      news2Result.classification.level === 'MÉDIO' ? "bg-amber-50/50 text-amber-950" :
                      news2Result.classification.level === 'BAIXO-MÉDIO' ? "bg-yellow-50/50 text-yellow-950" :
                      "bg-emerald-50/50 text-emerald-950"
                    )}>
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 font-mono">RECOMENDAÇÃO CLÍNICA OFICIAL</p>
                      <p className="text-xs font-black">{news2Result.classification.description}</p>
                      <p className="text-xs leading-relaxed font-semibold">{news2Result.classification.response}</p>
                    </div>
                  </div>

                  {/* Score breakdown metrics list */}
                  <div className="space-y-3 bg-white p-5 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 font-mono mb-2">Detalhamento dos Parâmetros Clínicos</p>
                    
                    <div className="divide-y divide-slate-100 text-xs font-medium space-y-2.5">
                      <div className="flex items-center justify-between pt-2.5 first:pt-0">
                        <div className="flex items-center gap-2">
                          <Wind className="h-3.5 w-3.5 text-blue-500 stroke-[2.5px]" />
                          <span className="text-slate-600 font-bold text-xs uppercase tracking-wide">Frequência Respiratória</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-slate-800">{getOptionLabel('respiratoryRate', values.respiratoryRate)}</span>
                          <span className={cn(
                            "px-1.5 py-0.5 rounded text-[10px] font-black font-mono",
                            news2Result.points.respiratoryRate === 3 ? "bg-red-100 text-red-700 font-bold" : 
                            news2Result.points.respiratoryRate > 0 ? "bg-amber-100 text-amber-700 font-bold" : 
                            "bg-slate-100 text-slate-500 font-bold"
                          )}>
                            +{news2Result.points.respiratoryRate}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2.5">
                        <div className="flex items-center gap-2">
                          <Activity className="h-3.5 w-3.5 text-[#1a73e8] stroke-[2.5px]" />
                          <span className="text-slate-600 font-bold text-xs uppercase tracking-wide">Estratégia O₂ (Escala)</span>
                        </div>
                        <span className="font-extrabold text-slate-800">{getOptionLabel('spo2Scale', values.spo2Scale)}</span>
                      </div>

                      <div className="flex items-center justify-between pt-2.5">
                        <div className="flex items-center gap-2">
                          <Activity className="h-3.5 w-3.5 text-teal-500 stroke-[2.5px]" />
                          <span className="text-slate-600 font-bold text-xs uppercase tracking-wide">Oxigenação (SpO₂)</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-slate-800">{getOptionLabel('spo2', values.spo2, values.spo2Scale)}</span>
                          <span className={cn(
                            "px-1.5 py-0.5 rounded text-[10px] font-black font-mono",
                            news2Result.points.spo2 === 3 ? "bg-red-100 text-red-700 font-bold" : 
                            news2Result.points.spo2 > 0 ? "bg-amber-100 text-amber-700 font-bold" : 
                            "bg-slate-100 text-slate-500 font-bold"
                          )}>
                            +{news2Result.points.spo2}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2.5">
                        <div className="flex items-center gap-2">
                          <Wind className="h-3.5 w-3.5 text-sky-500 stroke-[2.5px]" />
                          <span className="text-slate-600 font-bold text-xs uppercase tracking-wide">Suporte de Oxigênio</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-slate-800">{getOptionLabel('oxygenSupport', values.oxygenSupport)}</span>
                          <span className={cn(
                            "px-1.5 py-0.5 rounded text-[10px] font-black font-mono",
                            news2Result.points.oxygenSupport === 3 ? "bg-red-100 text-red-700 font-bold" : 
                            news2Result.points.oxygenSupport === 2 ? "bg-amber-100 text-amber-700 font-bold" : 
                            "bg-slate-100 text-slate-500 font-bold"
                          )}>
                            +{news2Result.points.oxygenSupport}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2.5">
                        <div className="flex items-center gap-2">
                          <Heart className="h-3.5 w-3.5 text-rose-500 stroke-[2.5px]" />
                          <span className="text-slate-600 font-bold text-xs uppercase tracking-wide">Pressão Sistólica (PAS)</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-slate-800">{getOptionLabel('systolicBp', values.systolicBp)}</span>
                          <span className={cn(
                            "px-1.5 py-0.5 rounded text-[10px] font-black font-mono",
                            news2Result.points.systolicBp === 3 ? "bg-red-100 text-red-700 font-bold" : 
                            news2Result.points.systolicBp > 0 ? "bg-amber-100 text-amber-700 font-bold" : 
                            "bg-slate-100 text-slate-500 font-bold"
                          )}>
                            +{news2Result.points.systolicBp}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2.5">
                        <div className="flex items-center gap-2">
                          <Heart className="h-3.5 w-3.5 text-rose-600 stroke-[2.5px]" />
                          <span className="text-slate-600 font-bold text-xs uppercase tracking-wide">Frequência de Pulso</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-slate-800">{getOptionLabel('pulse', values.pulse)}</span>
                          <span className={cn(
                            "px-1.5 py-0.5 rounded text-[10px] font-black font-mono",
                            news2Result.points.pulse === 3 ? "bg-red-100 text-red-700 font-bold" : 
                            news2Result.points.pulse > 0 ? "bg-amber-100 text-amber-700 font-bold" : 
                            "bg-slate-100 text-slate-500"
                          )}>
                            +{news2Result.points.pulse}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2.5">
                        <div className="flex items-center gap-2">
                          <Brain className="h-3.5 w-3.5 text-purple-600 stroke-[2.5px]" />
                          <span className="text-slate-600 font-bold text-xs uppercase tracking-wide">Nível de Consciência</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-slate-800">{getOptionLabel('consciousness', values.consciousness)}</span>
                          <span className={cn(
                            "px-1.5 py-0.5 rounded text-[10px] font-black font-mono",
                            news2Result.points.consciousness === 3 ? "bg-red-100 text-red-700 font-bold" : 
                            news2Result.points.consciousness > 0 ? "bg-amber-100 text-amber-700 font-bold" : 
                            "bg-slate-100 text-slate-500 font-bold"
                          )}>
                            +{news2Result.points.consciousness}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2.5">
                        <div className="flex items-center gap-2">
                          <Thermometer className="h-3.5 w-3.5 text-amber-500 stroke-[2.5px]" />
                          <span className="text-slate-600 font-bold text-xs uppercase tracking-wide">Temperatura Corporal</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-slate-800">{getOptionLabel('temperature', values.temperature)}</span>
                          <span className={cn(
                            "px-1.5 py-0.5 rounded text-[10px] font-black font-mono",
                            news2Result.points.temperature === 3 ? "bg-red-100 text-red-700 font-bold" : 
                            news2Result.points.temperature > 0 ? "bg-amber-100 text-amber-700 font-bold" : 
                            "bg-slate-100 text-slate-500 font-bold"
                          )}>
                            +{news2Result.points.temperature}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}



              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Observações Clínicas</p>
                <div className="rounded-2xl bg-slate-50 p-6 border border-slate-100">
                  <p className="text-sm font-medium text-slate-700 leading-relaxed italic whitespace-pre-wrap">
                    "{current.observations || 'Nenhuma observação adicional registrada.'}"
                  </p>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-slate-900 flex items-center justify-center text-white">
                    <UserIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none">Registrado por</p>
                    <p className="text-sm font-black text-slate-900 uppercase mt-1">{current.professionalName || current.professionalEmail.split('@')[0]}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none">Data do Registro</p>
                  <p className="text-[10px] font-bold text-slate-600 mt-1 uppercase">
                    {format(ensureDate(current.createdAt), "d MMM yy • HH:mm", { locale: ptBR })}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</p>
      <p className="text-sm font-black text-slate-700 uppercase">{value}</p>
    </div>
  );
}
