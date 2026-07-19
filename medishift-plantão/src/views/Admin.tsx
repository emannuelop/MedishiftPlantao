import React, { useState, useEffect, useRef } from 'react';
import { db, handleFirestoreError, auth, collection, addDoc, serverTimestamp, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc, getDocs, where, limit, writeBatch } from '../lib/firebase';
import { Patient, OperationType, AppUser, Professional } from '../types';
import { useAppData } from '../context/AppDataContext';
import { Search, Plus, Users, Bed, Loader2, ShieldCheck, UserCircle, Trash2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PatientCard } from '../components/PatientCard';
import { ProfessionalCard } from '../components/ProfessionalCard';
import { UserCard } from '../components/UserCard';
import { PatientForm } from '../components/Admin/PatientForm';
import { ProfessionalForm } from '../components/Admin/ProfessionalForm';
import { SubTabButton } from '../components/ui/SubTabButton';
import { Button } from '../components/ui/Button';
import { cn } from '../lib/utils';

export default function Admin() {
  const { patients, professionals, loadingPatients, loadingProfessionals, refreshPatients, refreshProfessionals } = useAppData();
  const [appUsers, setAppUsers] = useState<AppUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPatientForm, setShowPatientForm] = useState(false);
  const [showProfessionalForm, setShowProfessionalForm] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [editingProfessional, setEditingProfessional] = useState<Professional | null>(null);
  const [deletingItem, setDeletingItem] = useState<{ type: 'patient' | 'professional', item: Patient | Professional } | null>(null);
  const [isProcessingDelete, setIsProcessingDelete] = useState(false);
  const [hasHandovers, setHasHandovers] = useState(false);
  const [alertMessage, setAlertMessage] = useState<{ title: string; message: string } | null>(null);
  const [search, setSearch] = useState('');
  const [activeSubTab, setActiveSubTab] = useState<'patients' | 'users' | 'professionals'>('patients');
  const [userFilter, setUserFilter] = useState<'all' | 'pending' | 'approved' | 'blocked'>('all');
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive'>('active');

  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      if (!isMounted.current) return;
      const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppUser));
      setAppUsers(usersData);
    } catch (error) {
      if (isMounted.current) {
        handleFirestoreError(error, OperationType.LIST, 'users');
      }
    } finally {
      if (isMounted.current) {
        setLoadingUsers(false);
      }
    }
  };

  useEffect(() => {
    setStatusFilter('active');
    if (activeSubTab === 'users') {
      fetchUsers();
    }
  }, [activeSubTab]);

  const isLoadingActiveTab = activeSubTab === 'patients'
    ? loadingPatients
    : activeSubTab === 'professionals'
      ? loadingProfessionals
      : loadingUsers;

  const isLoading = isLoadingActiveTab || loading;

  const handlePatientSubmit = async (data: any) => {
    try {
      if (editingPatient) {
        const oldName = editingPatient.name;
        const newName = data.name;

        await updateDoc(doc(db, 'patients', editingPatient.id), data);

        // If the patient name was changed, update all existing handovers
        if (oldName !== newName) {
          const q = query(collection(db, 'handovers'), where('patientId', '==', editingPatient.id));
          const querySnapshot = await getDocs(q);

          if (!querySnapshot.empty) {
            const docs = querySnapshot.docs;
            const batchLimit = 400; // safe threshold below 500
            for (let i = 0; i < docs.length; i += batchLimit) {
              const batchDocs = docs.slice(i, i + batchLimit);
              const batch = writeBatch(db);
              batchDocs.forEach((docSnap) => {
                batch.update(docSnap.ref, { patientName: newName });
              });
              await batch.commit();
            }
          }
        }
      } else {
        await addDoc(collection(db, 'patients'), {
          ...data,
          createdAt: serverTimestamp(),
        });
      }
      await refreshPatients();
      setShowPatientForm(false);
      setEditingPatient(null);
    } catch (error) {
      handleFirestoreError(error, editingPatient ? OperationType.UPDATE : OperationType.WRITE, 'patients');
    }
  };

  const handleProfessionalSubmit = async (data: any) => {
    try {
      if (editingProfessional) {
        await updateDoc(doc(db, 'professionals', editingProfessional.id), data);
      } else {
        await addDoc(collection(db, 'professionals'), {
          ...data,
          createdAt: serverTimestamp(),
        });
      }
      await refreshProfessionals();
      setShowProfessionalForm(false);
      setEditingProfessional(null);
    } catch (error) {
      handleFirestoreError(error, editingProfessional ? OperationType.UPDATE : OperationType.WRITE, 'professionals');
    }
  };

  const checkHasHandovers = async (field: string, value: string) => {
    const q = query(collection(db, 'handovers'), where(field, '==', value), limit(1));
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  };

  const onEditPatient = async (p: Patient) => {
    setLoading(true);
    setHasHandovers(await checkHasHandovers('patientId', p.id));
    setEditingPatient(p);
    setShowPatientForm(true);
    setLoading(false);
  };

  const onEditProfessional = async (p: Professional) => {
    setLoading(true);
    setHasHandovers(await checkHasHandovers('professionalId', p.id));
    setEditingProfessional(p);
    setShowProfessionalForm(true);
    setLoading(false);
  };

  const confirmDelete = async () => {
    if (!deletingItem) return;
    setIsProcessingDelete(true);
    const { type, item } = deletingItem;

    try {
      const field = type === 'patient' ? 'patientId' : 'professionalId';
      const value = item.id;
      
      const hasLinks = await checkHasHandovers(field, value);
      
      if (hasLinks) {
        setAlertMessage({
          title: "Exclusão Bloqueada",
          message: `O ${type === 'patient' ? 'paciente' : 'profissional'} "${item.name}" possui registros de plantão vinculados e não pode ser removido por questões de integridade do histórico médico. Altere o status para "Inativo" no botão de editar.`
        });
        setDeletingItem(null);
        return;
      }

      await deleteDoc(doc(db, type === 'patient' ? 'patients' : 'professionals', item.id));
      if (type === 'patient') {
        await refreshPatients();
      } else {
        await refreshProfessionals();
      }
      setDeletingItem(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${type === 'patient' ? 'patients' : 'professionals'}/${item.id}`);
    } finally {
      setIsProcessingDelete(false);
    }
  };

  const toggleUserAdmin = async (targetUser: AppUser) => {
    if (targetUser.id === auth.currentUser?.uid) {
      setAlertMessage({
        title: "Ação Não Permitida",
        message: "Por motivos de segurança, você não pode revogar seus próprios privilégios de Administrador. Peça a outro administrador ou acesse com a conta master caso precise alterar."
      });
      return;
    }
    try {
      await updateDoc(doc(db, 'users', targetUser.id), { isAdmin: !targetUser.isAdmin });
      await fetchUsers();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'users');
    }
  };

  const handleApproveUser = async (user: AppUser) => {
    try {
      await updateDoc(doc(db, 'users', user.id), { isApproved: true, isBlocked: false, status: 'approved' });
      await fetchUsers();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'users');
    }
  };

  const handleBlockUser = async (targetUser: AppUser) => {
    if (targetUser.id === auth.currentUser?.uid) {
      setAlertMessage({
        title: "Ação Não Permitida",
        message: "Você não pode bloquear o seu próprio usuário."
      });
      return;
    }
    try {
      await updateDoc(doc(db, 'users', targetUser.id), { isApproved: false, isBlocked: true, status: 'blocked' });
      await fetchUsers();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'users');
    }
  };

  const handleSetPendingUser = async (targetUser: AppUser) => {
    if (targetUser.id === auth.currentUser?.uid) {
      setAlertMessage({
        title: "Ação Não Permitida",
        message: "Você não pode alterar o status do seu próprio usuário para Pendente."
      });
      return;
    }
    try {
      await updateDoc(doc(db, 'users', targetUser.id), { isApproved: false, isBlocked: false, status: 'pending' });
      await fetchUsers();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'users');
    }
  };

  const activePatientsCount = patients.filter(p => p.active !== false).length;
  const inactivePatientsCount = patients.filter(p => p.active === false).length;

  const activeProfsCount = professionals.filter(p => p.active !== false).length;
  const inactiveProfsCount = professionals.filter(p => p.active === false).length;

  const filteredPatients = patients
    .filter(p => statusFilter === 'active' ? p.active !== false : p.active === false)
    .filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  const filteredProfessionals = professionals
    .filter(p => statusFilter === 'active' ? p.active !== false : p.active === false)
    .filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
  const filteredUsers = appUsers.filter(u => {
    const matchesSearch = u.displayName.toLowerCase().includes(search.toLowerCase()) || 
                          u.email.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;

    const isApprovedUser = u.status === 'approved' || (!u.status && u.isApproved === true);
    const isBlockedUser = u.status === 'blocked' || (!u.status && u.isBlocked === true);
    const isPendingUser = u.status === 'pending' || (!u.status && u.isApproved === false && u.isBlocked !== true);

    if (userFilter === 'all') return true;
    if (userFilter === 'pending') return isPendingUser;
    if (userFilter === 'approved') return isApprovedUser;
    if (userFilter === 'blocked') return isBlockedUser;
    return true;
  });

  return (
    <div className="space-y-6 pb-24">
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-brand">
          <ShieldCheck className="h-5 w-5" />
          <span className="text-[10px] font-black uppercase tracking-widest">Painel de Controle</span>
        </div>
        <h2 className="text-3xl font-bold tracking-tight text-slate-900">Configurações</h2>
      </div>

      <div className="flex p-1.5 bg-slate-100 rounded-[1.5rem] mt-4 overflow-x-auto no-scrollbar">
        <SubTabButton active={activeSubTab === 'patients'} onClick={() => setActiveSubTab('patients')} icon={<Bed className="h-4 w-4" />} label="Pacientes" />
        <SubTabButton active={activeSubTab === 'professionals'} onClick={() => setActiveSubTab('professionals')} icon={<UserCircle className="h-4 w-4" />} label="Equipe" />
        <SubTabButton active={activeSubTab === 'users'} onClick={() => setActiveSubTab('users')} icon={<Users className="h-4 w-4" />} label="Usuários" />
      </div>

      <div className="pt-4 space-y-6">
        {activeSubTab !== 'users' && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setStatusFilter('active')}
              className={cn(
                "px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all border",
                statusFilter === 'active'
                  ? "border-slate-900 bg-white text-[#0d9488] shadow-sm"
                  : "border-slate-100 bg-slate-50/50 hover:bg-slate-50 text-slate-400 hover:text-slate-500"
              )}
            >
              Ativos ({activeSubTab === 'patients' ? activePatientsCount : activeProfsCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('inactive')}
              className={cn(
                "px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all border",
                statusFilter === 'inactive'
                  ? "border-slate-900 bg-white text-slate-800 shadow-sm"
                  : "border-slate-100 bg-slate-50/50 hover:bg-slate-50 text-slate-400 hover:text-slate-500"
              )}
            >
              Inativos ({activeSubTab === 'patients' ? inactivePatientsCount : inactiveProfsCount})
            </button>
          </div>
        )}

        {activeSubTab === 'users' && (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-slate-800 tracking-tight">Controle e Liberação de Usuários</h3>
              <p className="text-xs font-semibold text-slate-400">Aprove e bloqueie o acesso dos funcionários de forma simples e direta.</p>
            </div>
            <div className="inline-flex p-1 bg-slate-50 rounded-2xl border border-slate-200/60 w-fit self-start md:self-auto shadow-sm">
              <button
                type="button"
                onClick={() => setUserFilter('all')}
                className={cn(
                  "px-4 py-2 text-xs font-extrabold tracking-wider transition-all rounded-[10px]",
                  userFilter === 'all'
                    ? "bg-white text-brand shadow-md shadow-brand/5 border border-slate-100 font-black"
                    : "text-slate-400 hover:text-slate-600"
                )}
              >
                TODOS
              </button>
              <button
                type="button"
                onClick={() => setUserFilter('pending')}
                className={cn(
                  "px-4 py-2 text-xs font-extrabold tracking-wider transition-all rounded-[10px]",
                  userFilter === 'pending'
                    ? "bg-white text-brand shadow-md shadow-brand/5 border border-slate-100 font-black"
                    : "text-slate-400 hover:text-slate-600"
                )}
              >
                PENDENTES
              </button>
              <button
                type="button"
                onClick={() => setUserFilter('approved')}
                className={cn(
                  "px-4 py-2 text-xs font-extrabold tracking-wider transition-all rounded-[10px]",
                  userFilter === 'approved'
                    ? "bg-white text-brand shadow-md shadow-brand/5 border border-slate-100 font-black"
                    : "text-slate-400 hover:text-slate-600"
                )}
              >
                LIBERADOS
              </button>
              <button
                type="button"
                onClick={() => setUserFilter('blocked')}
                className={cn(
                  "px-4 py-2 text-xs font-extrabold tracking-wider transition-all rounded-[10px]",
                  userFilter === 'blocked'
                    ? "bg-white text-brand shadow-md shadow-brand/5 border border-slate-100 font-black"
                    : "text-slate-400 hover:text-slate-600"
                )}
              >
                BLOQUEADOS
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="relative group flex-1 w-full">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-300 transition-colors group-focus-within:text-brand" />
            <input
              type="text"
              placeholder={`Pesquisar ${activeSubTab === 'patients' ? 'pacientes' : activeSubTab === 'professionals' ? 'profissionais' : 'usuários'}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-2xl border-2 border-slate-100 bg-white py-4 pl-12 pr-4 text-sm font-bold transition-all focus:bg-white focus:border-brand shadow-sm outline-none"
            />
          </div>
          {activeSubTab !== 'users' && (
            <Button
              onClick={() => activeSubTab === 'patients' ? setShowPatientForm(true) : setShowProfessionalForm(true)}
              size="lg"
              className="w-full md:w-auto"
            >
              <Plus className="h-5 w-5 stroke-[3.5px]" />
              Novo {activeSubTab === 'patients' ? 'Paciente' : 'Profissional'}
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-brand" /></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeSubTab === 'patients' && filteredPatients.map(p => (
              <PatientCard key={p.id} patient={p} onEdit={onEditPatient} onDelete={(item) => setDeletingItem({ type: 'patient', item })} />
            ))}
            {activeSubTab === 'professionals' && filteredProfessionals.map(p => (
              <ProfessionalCard key={p.id} professional={p} onEdit={onEditProfessional} onDelete={(item) => setDeletingItem({ type: 'professional', item })} />
            ))}
            {activeSubTab === 'users' && filteredUsers.map(u => (
              <UserCard 
                key={u.id} 
                user={u} 
                onToggleAdmin={toggleUserAdmin} 
                onApprove={handleApproveUser}
                onBlock={handleBlockUser}
                onSetPending={handleSetPendingUser}
              />
            ))}
            {((activeSubTab === 'patients' && filteredPatients.length === 0) || 
              (activeSubTab === 'professionals' && filteredProfessionals.length === 0) || 
              (activeSubTab === 'users' && filteredUsers.length === 0)) && (
              <div className="col-span-full py-20 text-center text-slate-400 bg-white rounded-[2rem] border border-dashed border-slate-200">
                Nenhum registro encontrado.
              </div>
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showPatientForm && <PatientForm editingPatient={editingPatient} hasHandovers={hasHandovers} onSubmit={handlePatientSubmit} onClose={() => { setShowPatientForm(false); setEditingPatient(null); }} />}
        {showProfessionalForm && <ProfessionalForm editingProfessional={editingProfessional} hasHandovers={hasHandovers} onSubmit={handleProfessionalSubmit} onClose={() => { setShowProfessionalForm(false); setEditingProfessional(null); }} />}
        
        {deletingItem && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-6 backdrop-blur-md">
            <motion.div initial={{ y: 50, scale: 0.95, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} exit={{ y: 50, scale: 0.95, opacity: 0 }} className="w-full max-w-sm overflow-hidden rounded-[2.5rem] bg-white shadow-2xl p-10 text-center">
              <div className="mx-auto h-16 w-16 bg-red-100 rounded-2xl flex items-center justify-center text-red-600 mb-6"><Trash2 className="h-8 w-8" /></div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase leading-none mb-2">Confirmar Exclusão</h3>
              <p className="text-sm font-medium text-slate-500 mb-8">Deseja realmente excluir {deletingItem.type === 'patient' ? 'o paciente' : 'o profissional'} "{deletingItem.item.name}"? Esta ação não pode ser desfeita.</p>
              <div className="flex gap-4">
                <Button variant="slate" onClick={() => setDeletingItem(null)} className="flex-1">Cancelar</Button>
                <Button variant="red" onClick={confirmDelete} isLoading={isProcessingDelete} className="flex-1">Confirmar</Button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {alertMessage && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 p-6 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-sm rounded-[2rem] bg-white p-8 shadow-2xl text-center">
              <div className="mx-auto h-16 w-16 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600 mb-6"><AlertCircle className="h-8 w-8" /></div>
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">{alertMessage.title}</h3>
              <p className="text-sm font-medium text-slate-500 mb-8">{alertMessage.message}</p>
              <Button variant="brand" onClick={() => setAlertMessage(null)} className="w-full" size="lg">Entendido</Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
