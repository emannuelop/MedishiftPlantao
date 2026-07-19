import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, auth, collection, query, orderBy, limit, onSnapshot } from '../lib/firebase';
import { Handover, OperationType } from '../types';
import { useAppData } from '../context/AppDataContext';
import { User as UserIcon, AlertCircle, FileText, Pill, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import HandoverDetailsModal from '../components/HandoverDetailsModal';
import { cn, ensureDate } from '../lib/utils';
import { SummaryCard, ItemBadge } from '../components/Dashboard/SummaryCard';

export default function Home({ isAdmin = false, refreshTrigger = 0 }: { isAdmin?: boolean, refreshTrigger?: number }) {
  const { professionalsMap } = useAppData();
  const [handovers, setHandovers] = useState<Handover[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedHandover, setSelectedHandover] = useState<Handover | null>(null);
  const [localRefreshTrigger, setLocalRefreshTrigger] = useState(0);
  const user = auth.currentUser;

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const q = query(
      collection(db, 'handovers'),
      orderBy('handoverDate', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allDocs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Handover));
      
      const filtered = allDocs.filter(h => {
        const hStatus = h.status || 'Publicada';
        if (hStatus === 'Rascunho') {
          return h.professionalUid === user?.uid;
        }
        return true;
      });

      const sorted = filtered.sort((a, b) => {
        const timeA = a.handoverDate ? ensureDate(a.handoverDate).getTime() : 0;
        const timeB = b.handoverDate ? ensureDate(b.handoverDate).getTime() : 0;
        if (timeA !== timeB) return timeB - timeA;

        const catA = a.createdAt ? ensureDate(a.createdAt).getTime() : 0;
        const catB = b.createdAt ? ensureDate(b.createdAt).getTime() : 0;
        return catB - catA;
      });

      setHandovers(sorted.slice(0, 20));
      setLoading(false);
    }, (error) => {
      console.error("Home handovers snapshot error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, refreshTrigger, localRefreshTrigger]);

  if (loading) return (
    <div className="grid grid-cols-1 gap-4">
      {[1, 2, 3].map(i => (
        <div key={i} className="h-32 w-full animate-pulse rounded-[2rem] bg-white shadow-sm border border-slate-100" />
      ))}
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 font-display">
            Olá, <span className="text-brand">{user?.displayName?.split(' ')[0] || 'Profissional'}</span>
          </h2>
          <p className="text-sm font-medium text-slate-400 mt-1">Bem-vindo ao sistema de gestão de plantão.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard 
          label="Passagens Recentes" 
          value={handovers.length.toString()} 
          icon={<FileText />}
          color="brand"
        />
        <SummaryCard 
          label="Com Intercorrência" 
          value={handovers.filter(h => h.hadComplication).length.toString()} 
          icon={<AlertCircle />}
          color="red"
        />
        <SummaryCard 
          label="SOS Administrado" 
          value={handovers.filter(h => h.tookSOSMedication).length.toString()} 
          icon={<Pill />}
          color="amber"
        />
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <h3 className="text-lg font-bold text-slate-900 font-display uppercase tracking-tight">Atividade Recente</h3>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Últimos 20 registros</span>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {handovers.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-20 text-center bg-white rounded-[2rem] border border-dashed border-slate-200">
              <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-slate-50">
                <FileText className="h-10 w-10 text-slate-200" />
              </div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Nenhum registro encontrado</p>
            </div>
          ) : (
            handovers.map((handover, index) => (
              <motion.div
                 key={handover.id}
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ delay: index * 0.05 }}
                 className="group relative overflow-hidden rounded-[2rem] bg-white p-6 pl-8 shadow-sm border border-slate-100 transition-all hover:shadow-xl hover:-translate-y-1 cursor-pointer"
                 onClick={() => setSelectedHandover(handover)}
              >
                <div className={cn(
                  "absolute top-0 left-0 bottom-0 w-1.5 transition-colors",
                  (handover.hadComplication || handover.news2Classification === 'ALTO') ? "bg-red-500" :
                  handover.news2Classification === 'MÉDIO' ? "bg-amber-500" :
                  handover.news2Classification === 'BAIXO-MÉDIO' ? "bg-yellow-500" :
                  "bg-emerald-500"
                )} />

                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-2xl transition-all shadow-inner",
                      handover.hadComplication ? "bg-red-50 text-red-500" : "bg-slate-50 text-slate-400"
                    )}>
                      <UserIcon className="h-6 w-6 stroke-[2.5px]" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-slate-900 group-hover:text-brand transition-colors uppercase">{handover.patientName}</h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-300">
                          {format(ensureDate(handover.handoverDate), "dd/MM/yy")} • {handover.shift}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    <ItemBadge 
                      label={handover.hadComplication ? "Intercorrência" : "Normal"} 
                      color={handover.hadComplication ? "red" : "brand"}
                    />
                    <ItemBadge 
                      label={handover.status || 'Publicada'} 
                      color={
                        handover.status === 'Rascunho' ? 'slate' :
                        handover.status === 'Cancelada' ? 'red' : 'purple'
                      }
                    />
                    {handover.news2Score !== undefined && handover.news2Score !== null && (
                      <span className={cn(
                        "rounded-full px-2.5 py-0.5 text-[9px] font-black tracking-wider uppercase flex items-center gap-1.5 whitespace-nowrap shadow-sm border",
                        handover.news2Classification === 'ALTO' ? "bg-red-500 text-white border-red-650" :
                        handover.news2Classification === 'MÉDIO' ? "bg-amber-500 text-white border-amber-600" :
                        handover.news2Classification === 'BAIXO-MÉDIO' ? "bg-yellow-500 text-slate-900 border-yellow-600" :
                        "bg-emerald-500 text-white border-emerald-600"
                      )}>
                        <span>NEWS2: {handover.news2Score}</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-50 mt-4 pt-4">
                  <div className="flex gap-2">
                    {handover.hadEvacuation && <ItemBadge label="EVAC" />}
                    {handover.hadDiurese && <ItemBadge label="DIUR" color="blue" />}
                    {handover.tookSOSMedication && <ItemBadge label="SOS" color="amber" />}
                    {handover.precautions && (
                      <ItemBadge 
                        label={
                          handover.precautions === 'Precaução padrão' ? 'PADRÃO' :
                          handover.precautions === 'Precaução de contato' ? 'CONTATO' :
                          handover.precautions === 'Gotículas' ? 'GOTÍCULAS' : 'AEROSSÓIS'
                        } 
                        color="rose" 
                      />
                    )}
                    {handover.ventilation && (
                      <ItemBadge 
                        label={
                          handover.ventilation === 'Ventilação mecânica' ? 'VM' :
                          handover.ventilation === 'O2 cateter' ? 'O2 CAT' :
                          handover.ventilation === 'O2 máscara' ? 'O2 MÁS' : 'AR AMB'
                        } 
                        color="purple" 
                      />
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <span className="text-[9px] font-bold uppercase truncate max-w-[100px]">
                      {(handover.professionalId && professionalsMap[handover.professionalId]) || handover.professionalName || '---'}
                    </span>
                    <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform group-hover:text-brand" />
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      <HandoverDetailsModal 
        handover={selectedHandover}
        onClose={() => {
          setSelectedHandover(null);
          setLocalRefreshTrigger(prev => prev + 1);
        }}
        isAdmin={isAdmin}
      />
    </div>
  );
}
