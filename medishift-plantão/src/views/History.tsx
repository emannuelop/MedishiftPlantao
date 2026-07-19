import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, auth, collection, query, orderBy, limit, onSnapshot } from '../lib/firebase';
import { Handover, OperationType, Patient } from '../types';
import { Search, Calendar, User as UserIcon, History as HistoryIcon, Loader2, Download, Plus, ChevronRight, RotateCw } from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { cn, ensureDate } from '../lib/utils';
import HandoverDetailsModal from '../components/HandoverDetailsModal';
import { exportToExcel, exportToPDF } from '../services/exportService';
import { Button } from '../components/ui/Button';
import { ItemBadge } from '../components/Dashboard/SummaryCard';
import { useAppData } from '../context/AppDataContext';

export default function History({ isAdmin = false, refreshTrigger: globalRefreshTrigger = 0 }: { isAdmin?: boolean, refreshTrigger?: number }) {
  const { patients, professionalsMap } = useAppData();
  const [handovers, setHandovers] = useState<Handover[]>([]);
  const [loading, setLoading] = useState(true);
  const [queryLimit, setQueryLimit] = useState(500);
  const [hasMore, setHasMore] = useState(true);
  const [localRefreshTrigger, setLocalRefreshTrigger] = useState(0);

  // Filters
  const [filterPatient, setFilterPatient] = useState('');
  const [filterPatientId, setFilterPatientId] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterShift, setFilterShift] = useState('');
  const [filterProfessional, setFilterProfessional] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  useEffect(() => {
    setCurrentPage(1);
  }, [filterPatient, filterPatientId, filterStartDate, filterEndDate, filterShift, filterProfessional, filterStatus]);

  const [selectedHandover, setSelectedHandover] = useState<Handover | null>(null);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);

  const currentUser = auth.currentUser;

  useEffect(() => {
    if (!currentUser) return;
    setLoading(true);
    const q = query(
      collection(db, 'handovers'),
      orderBy('handoverDate', 'desc'),
      limit(queryLimit)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allDocs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Handover));
      
      const filtered = allDocs.filter(h => {
        const hStatus = h.status || 'Publicada';
        if (hStatus === 'Rascunho') {
          return h.professionalUid === currentUser?.uid;
        }
        return true;
      });

      const sorted = filtered.sort((a, b) => {
        const timeA = a.handoverDate ? ensureDate(a.handoverDate).getTime() : 0;
        const timeB = b.handoverDate ? ensureDate(b.handoverDate).getTime() : 0;
        return timeB - timeA;
      });

      setHandovers(sorted);
      setHasMore(snapshot.docs.length === queryLimit);
      setLoading(false);
    }, (error) => {
      console.error("History handovers snapshot error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser, queryLimit, globalRefreshTrigger, localRefreshTrigger]);

  const handleManualRefresh = () => {
    setLocalRefreshTrigger(p => p + 1);
  };

  const loadMore = () => {
    setQueryLimit(prev => prev + 500);
  };

  // Perform in-memory filtering for pristine accuracy and zero composite-index overhead
  const filteredHandovers = handovers.filter(h => {
    if (filterShift && h.shift !== filterShift) return false;
    if (filterProfessional && h.professionalId !== filterProfessional) return false;
    if (filterPatientId && h.patientId !== filterPatientId) return false;
    
    // Status filter - treating legacy records without status as 'Publicada'
    const statusVal = h.status || 'Publicada';
    if (filterStatus && statusVal !== filterStatus) return false;
    
    if (filterStartDate) {
      const [year, month, day] = filterStartDate.split('-').map(Number);
      const start = new Date(year, month - 1, day, 0, 0, 0).getTime();
      const docDate = h.handoverDate ? ensureDate(h.handoverDate).getTime() : 0;
      if (docDate < start) return false;
    }
    
    if (filterEndDate) {
      const [year, month, day] = filterEndDate.split('-').map(Number);
      const end = new Date(year, month - 1, day, 23, 59, 59).getTime();
      const docDate = h.handoverDate ? ensureDate(h.handoverDate).getTime() : 0;
      if (docDate > end) return false;
    }

    const search = filterPatient.toLowerCase();
    if (search) {
      const matchesPatient = (h.patientName?.toLowerCase() || '').includes(search);
      const matchesObs = (h.observations?.toLowerCase() || '').includes(search);
      const matchesSOS = (h.sosMedicationName?.toLowerCase() || '').includes(search);
      const matchesDesc = (h.complicationDescription?.toLowerCase() || '').includes(search);
      return matchesPatient || matchesObs || matchesSOS || matchesDesc;
    }

    return true;
  });

  const totalPages = Math.ceil(filteredHandovers.length / ITEMS_PER_PAGE);
  const paginatedHandovers = filteredHandovers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleExportExcel = async () => {
    if (exportingExcel) return;
    setExportingExcel(true);
    try {
      exportToExcel(filteredHandovers, professionalsMap);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'handovers');
    } finally {
      setExportingExcel(false);
    }
  };

  const handleExportPDF = async () => {
    if (exportingPDF) return;
    setExportingPDF(true);
    try {
      exportToPDF(filteredHandovers, professionalsMap, filterStartDate, filterEndDate);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'handovers');
    } finally {
      setExportingPDF(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 font-display font-black uppercase">Histórico Geral</h2>
          <p className="text-xs font-medium text-slate-500 mt-1 uppercase tracking-wider">Histórico digital de passagens de turno</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto font-sans">
          <Button 
            onClick={handleManualRefresh}
            isLoading={loading}
            variant="slate"
            className="flex-1 sm:flex-none h-11"
          >
            <RotateCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button 
            onClick={handleExportExcel}
            isLoading={exportingExcel}
            variant="emerald"
            className="flex-1 sm:flex-none h-11"
          >
            <Download className="h-4 w-4" />
            Excel
          </Button>
          <Button 
            onClick={handleExportPDF}
            isLoading={exportingPDF}
            variant="red"
            className="flex-1 sm:flex-none h-11"
          >
            <Download className="h-4 w-4" />
            PDF
          </Button>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-100">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300 transition-colors group-focus-within:text-brand" />
            <select
              value={filterPatientId}
              onChange={(e) => setFilterPatientId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-xs font-bold transition-all focus:bg-white focus:border-brand outline-none appearance-none"
            >
              <option value="">PACIENTE</option>
              {patients.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300 transition-colors group-focus-within:text-brand" />
            <input
              type="text"
              placeholder="Pesquisar notas..."
              value={filterPatient}
              onChange={(e) => setFilterPatient(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-xs font-bold transition-all focus:bg-white focus:border-brand outline-none"
            />
          </div>
          <div className="relative group">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-300 group-focus-within:text-brand uppercase">De</span>
            <input
              type="date"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-8 pr-4 text-[10px] font-bold transition-all focus:bg-white focus:border-brand outline-none uppercase tracking-tighter"
            />
          </div>
          <div className="relative group">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-300 group-focus-within:text-brand uppercase">Até</span>
            <input
              type="date"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-8 pr-4 text-[10px] font-bold transition-all focus:bg-white focus:border-brand outline-none uppercase tracking-tighter"
            />
          </div>
          <div className="relative group">
            <HistoryIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300 transition-colors group-focus-within:text-brand" />
            <select
              value={filterShift}
              onChange={(e) => setFilterShift(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-xs font-bold transition-all focus:bg-white focus:border-brand outline-none appearance-none"
            >
              <option value="">TODOS TURNOS</option>
              <option value="DIURNO">DIURNO</option>
              <option value="NOTURNO">NOTURNO</option>
              <option value="24 HORAS">24 HORAS</option>
            </select>
          </div>
          <div className="relative group">
            <UserIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300 transition-colors group-focus-within:text-brand" />
            <select
              value={filterProfessional}
              onChange={(e) => setFilterProfessional(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-xs font-bold transition-all focus:bg-white focus:border-brand outline-none appearance-none"
            >
              <option value="">PROFISSIONAL</option>
              {Object.entries(professionalsMap).map(([id, name]) => (
                <option key={id} value={id}>{name}</option>
              ))}
            </select>
          </div>
          <div className="relative group">
            <HistoryIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300 transition-colors group-focus-within:text-brand" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-xs font-bold transition-all focus:bg-white focus:border-brand outline-none appearance-none"
            >
              <option value="">STATUS</option>
              <option value="Rascunho">RASCUNHO</option>
              <option value="Publicada">PUBLICADA</option>
              <option value="Cancelada">CANCELADA</option>
            </select>
          </div>
          <Button 
            variant="ghost"
            onClick={() => { 
              setFilterPatient(''); 
              setFilterPatientId(''); 
              setFilterStartDate(''); 
              setFilterEndDate(''); 
              setFilterShift(''); 
              setFilterProfessional(''); 
              setFilterStatus(''); 
            }}
            className="text-[10px]"
          >
            Limpar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="col-span-full flex flex-col items-center justify-center py-20 space-y-4">
            <Loader2 className="h-10 w-10 animate-spin text-brand" />
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Carregando Histórico...</p>
          </div>
        ) : filteredHandovers.length > 0 ? (
          paginatedHandovers.map((h, index) => {
            const hasComplication = h.hadComplication;
            
            return (
              <motion.div 
                key={h.id} 
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.02 }}
                className={cn(
                  "group relative overflow-hidden rounded-3xl bg-white shadow-sm border border-slate-100 transition-all",
                  "hover:shadow-lg hover:-translate-y-1 cursor-pointer"
                )}
                onClick={() => setSelectedHandover(h)}
              >
                <div className={cn(
                  "absolute top-0 left-0 bottom-0 w-1.5 transition-colors",
                  (hasComplication || h.news2Classification === 'ALTO') ? "bg-red-500" :
                  h.news2Classification === 'MÉDIO' ? "bg-amber-500" :
                  h.news2Classification === 'BAIXO-MÉDIO' ? "bg-yellow-500" :
                  "bg-emerald-500"
                )} />
                
                <div className="flex items-center justify-between p-5 pl-7">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-2xl transition-all shadow-inner",
                      hasComplication ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-400'
                    )}>
                      <UserIcon className="h-6 w-6 stroke-[2.5px]" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold tracking-tight text-slate-900 group-hover:text-brand transition-colors uppercase">{h.patientName}</h4>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                          {format(ensureDate(h.handoverDate), "dd/MM/yy")} • {h.shift}
                        </span>
                        <span className="text-[9px] font-black uppercase bg-brand/5 text-brand px-2 py-0.5 rounded-full border border-brand/10">
                          {(h.professionalId && professionalsMap[h.professionalId]) || h.professionalName || '---'}
                        </span>
                        {h.precautions && (
                          <span className="text-[9px] font-black uppercase bg-rose-50 text-rose-600 px-2 py-0.5 rounded-full border border-rose-100">
                            {h.precautions}
                          </span>
                        )}
                        {h.ventilation && (
                          <span className="text-[9px] font-black uppercase bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full border border-purple-100">
                            {h.ventilation}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {h.news2Score !== undefined && h.news2Score !== null && (
                      <span className={cn(
                        "rounded-full px-2.5 py-1 text-[9px] font-black tracking-wider uppercase flex items-center gap-1.5 whitespace-nowrap shadow-sm border",
                        h.news2Classification === 'ALTO' ? "bg-red-500 text-white border-red-650" :
                        h.news2Classification === 'MÉDIO' ? "bg-amber-500 text-white border-amber-600" :
                        h.news2Classification === 'BAIXO-MÉDIO' ? "bg-yellow-500 text-slate-900 border-yellow-600" :
                        "bg-emerald-500 text-white border-emerald-600"
                      )}>
                        <span>NEWS2: {h.news2Score}</span>
                      </span>
                    )}
                    <ItemBadge 
                      label={h.status || 'Publicada'} 
                      color={
                        (h.status || 'Publicada') === 'Rascunho' ? 'slate' :
                        (h.status || 'Publicada') === 'Cancelada' ? 'red' : 'purple'
                      }
                    />
                    <div className="h-10 w-10 flex items-center justify-center rounded-full bg-slate-50 group-hover:bg-brand/10 transition-colors">
                      <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-brand transition-all group-hover:translate-x-0.5" />
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })
        ) : (
          <div className="col-span-full flex flex-col items-center justify-center py-24 text-center space-y-6 bg-white rounded-[2rem] border border-dashed border-slate-200">
            <div className="h-24 w-24 rounded-full bg-slate-50 flex items-center justify-center text-slate-200">
              <HistoryIcon className="h-12 w-12" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-slate-900 uppercase tracking-tighter">Histórico Vazio</h3>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 max-w-xs mx-auto">Nenhum registro encontrado</p>
            </div>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {!loading && filteredHandovers.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 pb-2 px-2 bg-slate-50/50 p-4 rounded-3xl border border-slate-100">
          <span className="text-xs font-black uppercase tracking-wider text-slate-400 font-mono">
            Mostrando {Math.min(filteredHandovers.length, (currentPage - 1) * ITEMS_PER_PAGE + 1)} a {Math.min(filteredHandovers.length, currentPage * ITEMS_PER_PAGE)} de {filteredHandovers.length} registros
          </span>

          <div className="flex items-center gap-1 flex-wrap justify-center">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              type="button"
              className={cn(
                "h-9 px-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 transition-all cursor-pointer flex items-center justify-center gap-1 select-none bg-white",
                "hover:bg-slate-50 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:border-slate-200"
              )}
            >
              Anterior
            </button>

            {/* Page number buttons */}
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
              if (totalPages <= 5 || page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1) {
                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    type="button"
                    className={cn(
                      "h-9 w-9 rounded-xl text-xs font-black transition-all cursor-pointer select-none border",
                      currentPage === page
                        ? "bg-brand text-white border-brand"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300"
                    )}
                  >
                    {page}
                  </button>
                );
              } else if (page === 2 && currentPage > 3) {
                return <span key="ellipsis-start" className="px-1.5 text-slate-400 font-bold select-none text-xs">...</span>;
              } else if (page === totalPages - 1 && currentPage < totalPages - 2) {
                return <span key="ellipsis-end" className="px-1.5 text-slate-400 font-bold select-none text-xs">...</span>;
              }
              return null;
            })}

            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              type="button"
              className={cn(
                "h-9 px-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 transition-all cursor-pointer flex items-center justify-center gap-1 select-none bg-white",
                "hover:bg-slate-50 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:border-slate-200"
              )}
            >
              Próximo
            </button>
          </div>
        </div>
      )}

      {hasMore && !loading && (
        <div className="flex justify-center pt-8">
          <Button
            onClick={loadMore}
            variant="slate"
            size="lg"
            className="min-w-[200px]"
          >
            Carregar Mais
          </Button>
        </div>
      )}

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
