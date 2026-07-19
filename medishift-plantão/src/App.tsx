import React, { useState, useEffect } from 'react';
import { 
  auth, 
  signIn, 
  db, 
  doc, 
  getDoc, 
  setDoc, 
  serverTimestamp, 
  onSnapshot, 
  collection, 
  getDocs, 
  writeBatch, 
  query, 
  where, 
  limit, 
  onAuthStateChanged, 
  getRedirectResult 
} from './lib/firebase';
import { Loader2, Plus, History as HistoryIcon, ShieldCheck, LogOut, User as UserIcon, LayoutDashboard, Settings, Lock, AlertCircle, Activity } from 'lucide-react';
import { cn } from './lib/utils';
import Home from './views/Home';
import History from './views/History';
import Admin from './views/Admin';
import HandoverForm from './views/HandoverForm';
import { motion, AnimatePresence } from 'framer-motion';
import { AppUser } from './types';
import { Button } from './components/ui/Button';
import { AppDataProvider, useAppData } from './context/AppDataContext';

export default function App() {
  return <AppContent />;
}

function AppContent() {
  const [user, setUser] = useState<any | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [showVersionBanner, setShowVersionBanner] = useState(false);
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'home' | 'history' | 'admin'>('home');
  const [showAddForm, setShowAddForm] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [refreshHandoversTrigger, setRefreshHandoversTrigger] = useState(0);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [showPrivacyHelp, setShowPrivacyHelp] = useState(false);

  const handleSignIn = async () => {
    setIsBlocked(false);
    setAuthError(null);
    setAuthLoading(true);
    try {
      await signIn();
    } catch (error: any) {
      console.error("Erro na autenticação:", error);
      let friendlyMessage = "Erro ao fazer login. Por favor, tente novamente.";
      const errorCode = error?.code || '';
      const errorMessage = error?.message || '';
      const errorStr = `${errorCode} ${errorMessage}`.toLowerCase();
      
      if (errorCode === 'auth/operation-not-allowed') {
        friendlyMessage = "O fornecedor de login do Google não está ativado no seu Firebase Console. Vá em 'Authentication' > 'Sign-in method' > 'Add new provider' e ative o 'Google'.";
      } else if (errorCode === 'auth/unauthorized-domain') {
        friendlyMessage = `Este domínio (${window.location.hostname}) não está na lista de domínios autorizados no seu Firebase Console. Vá em 'Authentication' > 'Settings' > 'Authorized domains' e adicione o domínio atual.`;
      } else if (errorCode === 'auth/popup-blocked') {
        friendlyMessage = "O navegador bloqueou a janela de login (popup). Tentamos o redirecionamento automático como alternativa, mas se o erro persistir, ative as permissões ou desative as proteções extras de privacidade (como o Brave Shields ou Firefox Shields).";
        setShowPrivacyHelp(true);
      } else if (errorCode === 'auth/popup-closed-by-user') {
        friendlyMessage = "A janela de autenticação do Google foi fechada antes de concluir o processo.";
      } else if (errorCode === 'auth/web-storage-unsupported' || errorStr.includes('cookie') || errorStr.includes('storage') || errorStr.includes('index') || errorStr.includes('shield')) {
        friendlyMessage = "Cookies de terceiros ou armazenamento local desativados. Navegadores como Brave, Safari ou Firefox com modo estrito de privacidade por padrão impedem o login popup. Ative cookies de terceiros ou desative as proteções temporariamente.";
        setShowPrivacyHelp(true);
      } else {
        friendlyMessage = `Erro Firebase (${errorCode || 'erro-desconhecido'}): Se você baixou o projeto e colocou em seu próprio Firebase, lembre-se de:\n\n1. Ativar o login do Google em 'Authentication' no Console\n2. Adicionar o domínio "${window.location.hostname}" em Domínios Autorizados\n3. Substituir o arquivo 'firebase-applet-config.json' pelas credenciais do seu projeto.\n\nSe estiver usando Brave ou Firefox, desative as Proteções (Shields/Escudo) do navegador para este site.`;
        setShowPrivacyHelp(true);
      }
      setAuthError(friendlyMessage);
    } finally {
      setAuthLoading(false);
    }
  };

  useEffect(() => {
    if (globalError) {
      const timer = setTimeout(() => setGlobalError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [globalError]);

  useEffect(() => {
    const handleError = (e: any) => {
      if (e.detail?.error) {
        setGlobalError(e.detail.error);
      }
    };
    window.addEventListener('firestore-error', handleError);
    return () => window.removeEventListener('firestore-error', handleError);
  }, []);

  useEffect(() => {
    let unsubProfile: (() => void) | null = null;

    // Handle redirect result right on mount
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          console.log("Redirect success for user:", result.user.email);
        }
      })
      .catch((error) => {
        console.error("Redirect login error:", error);
        let friendlyMessage = `Erro no retorno do login por redirecionamento: ${error.message || error.code}`;
        const errorCode = error?.code || '';
        const errorMessage = error?.message || '';
        const errorStr = `${errorCode} ${errorMessage}`.toLowerCase();

        if (errorCode === 'auth/unauthorized-domain') {
          friendlyMessage = `Este domínio (${window.location.hostname}) não está na lista de domínios autorizados no seu Firebase Console. Vá em 'Authentication' > 'Settings' > 'Authorized domains' e adicione o domínio atual.`;
        } else if (errorCode === 'auth/operation-not-allowed') {
          friendlyMessage = "O fornecedor de login do Google não está ativado no seu Firebase Console. Vá em 'Authentication' > 'Sign-in method' > 'Add new provider' e ative o 'Google'.";
        } else if (errorCode === 'auth/web-storage-unsupported' || errorStr.includes('cookie') || errorStr.includes('storage') || errorStr.includes('index') || errorStr.includes('shield')) {
          friendlyMessage = "Cookies de terceiros ou armazenamento local desativados no redirect. Navegadores como Brave, Safari ou Firefox com modo de privacidade rígido bloqueiam o acesso necessário ao armazenamento do Firebase Auth.";
          setShowPrivacyHelp(true);
        }
        setAuthError(friendlyMessage);
      });

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (unsubProfile) {
        unsubProfile();
        unsubProfile = null;
      }

      if (currentUser) {
        const userRef = doc(db, 'users', currentUser.uid);
        
        // Ensure user document exists
        const userDoc = await getDoc(userRef);
        if (!userDoc.exists()) {
          const isOwner = currentUser.email === 'roberto.mendes@careflow.com.br';
          const newUser: Partial<AppUser> = {
            email: currentUser.email || '',
            displayName: currentUser.displayName || '',
            photoURL: currentUser.photoURL || '',
            isAdmin: isOwner,
            isApproved: isOwner,
            isBlocked: false,
            status: isOwner ? 'approved' : 'pending',
            createdAt: serverTimestamp()
          };
          await setDoc(userRef, newUser);
        }

        // Start real-time listener for blocked status, approval, and admin role
        unsubProfile = onSnapshot(userRef, (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data() as AppUser;
            
            // Check status first, fallback to old booleans
            const status = data.status || (data.isBlocked ? 'blocked' : data.isApproved ? 'approved' : 'pending');
            
            if (status === 'blocked') {
              setIsBlocked(true);
              setIsApproved(false);
              setLoading(false);
            } else if (status === 'pending') {
              setIsBlocked(false);
              setIsApproved(false);
              setLoading(false);
            } else if (status === 'approved') {
              setIsBlocked(false);
              setIsApproved(true);
              setAppUser(data);
              setIsAdmin(data.isAdmin);
              setLoading(false);
            }
          } else {
            setLoading(false);
          }
        }, (error) => {
          console.error("Profile snapshot error:", error);
          setLoading(false);
        });
      } else {
        setIsAdmin(false);
        setIsApproved(false);
        setIsBlocked(false);
        setAppUser(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (unsubProfile) unsubProfile();
    };
  }, []);

  // One-time automatic client-side migration for legacy handovers (Admin only)
  useEffect(() => {
    if (user && appUser && appUser.isAdmin) {
      const migrateLegacyHandovers = async () => {
        if (localStorage.getItem('legacy_handover_status_v1_completed') === 'true') {
          return;
        }
        try {
          // Check migrations collection in DB to prevent multiple admins from running it
          const migrationRef = doc(db, 'migrations', 'legacy_handover_status_v1');
          const migrationDoc = await getDoc(migrationRef);
          if (migrationDoc.exists() && migrationDoc.data()?.migrated === true) {
            localStorage.setItem('legacy_handover_status_v1_completed', 'true');
            return;
          }

          const q = query(collection(db, 'handovers'), limit(500));
          const querySnapshot = await getDocs(q);
          const documentsToUpdate: { id: string; data: any }[] = [];
          
          querySnapshot.forEach((document) => {
            const data = document.data();
            if (data && data.status === undefined) {
              documentsToUpdate.push({ id: document.id, data });
            }
          });
          
          if (documentsToUpdate.length > 0) {
            console.log(`[MIGRATION] Found ${documentsToUpdate.length} legacy handovers to migrate to 'Publicada'.`);
            let migratedCount = 0;
            
            // Write in chunks of 100 to avoid Firestore's 500 max batch operations limit
            for (let i = 0; i < documentsToUpdate.length; i += 100) {
              const chunk = documentsToUpdate.slice(i, i + 100);
              const batch = writeBatch(db);
              
              chunk.forEach((item) => {
                const docRef = doc(db, 'handovers', item.id);
                batch.update(docRef, {
                  status: 'Publicada',
                  publishedAt: item.data.createdAt || item.data.handoverDate || serverTimestamp()
                });
              });
              
              await batch.commit();
              migratedCount += chunk.length;
            }
            
            console.log(`[MIGRATION] Successfully updated ${migratedCount} legacy handovers.`);
          }

          // Mark migration as completed both in DB and local registry
          await setDoc(migrationRef, { migrated: true, migratedAt: serverTimestamp() });
          localStorage.setItem('legacy_handover_status_v1_completed', 'true');
        } catch (error) {
          console.warn("Migration warning:", error);
        }
      };
      
      migrateLegacyHandovers();
    }
  }, [user, appUser]);

  // Real-time app version checks and initialization
  useEffect(() => {
    if (user && isApproved) {
      if (isAdmin) {
        setDoc(doc(db, 'config', 'appVersion'), {
          version: (import.meta as any).env.VITE_APP_VERSION || '1.0.0',
          updatedAt: serverTimestamp()
        }, { merge: true }).catch(err => console.warn("Failed to set appVersion config:", err));
      }

      const unsubVersion = onSnapshot(doc(db, 'config', 'appVersion'), (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          const currentLocal = (import.meta as any).env.VITE_APP_VERSION || '1.0.0';
          const remoteVersion = data.version;
          if (remoteVersion && remoteVersion !== currentLocal) {
            setShowVersionBanner(true);
            setLatestVersion(remoteVersion);
          } else {
            setShowVersionBanner(false);
          }
        }
      }, (error) => {
        console.warn("Error reading appVersion config:", error);
      });
      return () => unsubVersion();
    }
  }, [user, isApproved, isAdmin]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-10 w-10 animate-spin text-brand" />
      </div>
    );
  }

  if (isBlocked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-md space-y-8 rounded-[2.5rem] bg-white p-10 shadow-2xl shadow-red-900/5 border border-slate-100">
          <div className="text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-red-600 shadow-xl shadow-red-500/30">
              <Lock className="h-10 w-10 text-white stroke-[3px]" />
            </div>
            <h1 className="mt-6 text-3xl font-black tracking-tighter text-slate-900 leading-none">CONTA<br/><span className="text-red-600">BLOQUEADA</span></h1>
            <p className="mt-4 text-sm font-bold text-slate-600 px-4">Conta bloqueada. Entre em contato com o administrador.</p>
          </div>
          <Button
            variant="slate"
            className="w-full"
            size="lg"
            onClick={() => {
              setIsBlocked(false);
              auth.signOut();
            }}
          >
            Sair da Conta
          </Button>
        </div>
      </div>
    );
  }

  if (!user) {
    const demoProfiles = [
      {
        uid: 'user-admin',
        name: 'Dr. Roberto Mendes',
        role: 'Administrador / Gestor',
        email: 'roberto.mendes@careflow.com.br',
        badgeColor: 'bg-teal-50 text-teal-700 border-teal-200',
        borderColor: 'hover:border-teal-400',
        iconBg: 'bg-teal-500 text-white',
        description: 'Acesso irrestrito ao painel. Permite cadastrar pacientes, equipe operacional, gerenciar novos acessos e auditar todo o histórico médico.'
      },
      {
        uid: 'user-supervisor',
        name: 'Carolina Vasconcelos',
        role: 'Enfermeira Supervisora',
        email: 'carolina.v@careflow.com.br',
        badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
        borderColor: 'hover:border-blue-400',
        iconBg: 'bg-blue-500 text-white',
        description: 'Acesso operacional completo. Lançamento e publicação de passagens, avaliação do Escore NEWS2 em tempo real e exportação de relatórios PDF/Excel.'
      },
      {
        uid: 'user-colaborador',
        name: 'Thiago Souza',
        role: 'Técnico de Enfermagem',
        email: 'thiago.souza@careflow.com.br',
        badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        borderColor: 'hover:border-emerald-400',
        iconBg: 'bg-emerald-500 text-white',
        description: 'Acesso operacional direcionado. Criação rápida de novas passagens, salvamento e edição de rascunhos e acompanhamento de intercorrências.'
      },
      {
        uid: 'user-pendente',
        name: 'Juliana Reis',
        role: 'Novo Profissional (Acesso Pendente)',
        email: 'juliana.reis@careflow.com.br',
        badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
        borderColor: 'hover:border-amber-400',
        iconBg: 'bg-amber-500 text-white',
        description: 'Demonstração da barreira de controle de acesso. Simula o estado da conta recém-registrada que aguarda aprovação ativa de um gestor.'
      }
    ];

    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4 sm:p-6 md:p-10 font-sans">
        <div className="w-full max-w-2xl space-y-8 rounded-[2.5rem] bg-white p-6 sm:p-10 md:p-12 shadow-xl shadow-slate-900/5 border border-slate-100">
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand shadow-lg shadow-brand/30">
              <Plus className="h-8 w-8 text-white stroke-[3px]" />
            </div>
            <h1 className="mt-5 text-3xl font-black tracking-tight text-slate-900 leading-none font-display uppercase">
              MEDISHIFT <span className="text-brand">PLANTÃO</span>
            </h1>
            <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Plataforma Digital de Passagem de Turno</p>
            
            <div className="mt-6 p-5 bg-slate-50 rounded-2xl border border-slate-200/60 max-w-xl mx-auto">
              <h2 className="text-sm font-bold text-slate-800 tracking-tight">Modo Demonstração (Portfólio)</h2>
              <p className="text-xs font-semibold text-slate-500 leading-relaxed mt-1.5">
                Esta é uma versão anonimizada e otimizada para fins de demonstração pública. 
                Selecione um dos perfis profissionais fictícios abaixo para iniciar a navegação simulada e experimentar o painel:
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
            {demoProfiles.map((profile) => (
              <button
                key={profile.uid}
                onClick={() => auth.signInWithProfile(profile.uid)}
                className={cn(
                  "flex flex-col text-left p-5 rounded-3xl border-2 border-slate-100 bg-white cursor-pointer transition-all duration-300",
                  profile.borderColor,
                  "hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
                )}
              >
                <div className="flex items-center gap-3 w-full">
                  <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold text-sm", profile.iconBg)}>
                    {profile.uid === 'user-admin' ? <ShieldCheck className="h-5 w-5 stroke-[2.5px]" /> :
                     profile.uid === 'user-supervisor' ? <UserIcon className="h-5 w-5 stroke-[2.5px]" /> :
                     profile.uid === 'user-colaborador' ? <Activity className="h-5 w-5 stroke-[2.5px]" /> :
                     <Lock className="h-5 w-5 stroke-[2.5px]" />}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-extrabold text-sm text-slate-900 leading-tight truncate">{profile.name}</h3>
                    <span className={cn("inline-block px-2 py-0.5 mt-1 rounded-full text-[8px] font-black tracking-wider uppercase border", profile.badgeColor)}>
                      {profile.role}
                    </span>
                  </div>
                </div>
                <p className="text-[11px] font-medium leading-relaxed text-slate-500 mt-3 flex-1">
                  {profile.description}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!isApproved) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-md space-y-8 rounded-[2.5rem] bg-white p-10 shadow-2xl shadow-slate-900/5 border border-slate-100">
          <div className="text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-amber-500 shadow-xl shadow-amber-500/30">
              <Lock className="h-10 w-10 text-white stroke-[3px]" />
            </div>
            <h1 className="mt-6 text-3xl font-black tracking-tighter text-slate-900 leading-none">ACESSO<br/><span className="text-amber-500">PENDENTE</span></h1>
            <p className="mt-4 text-sm font-bold text-slate-600 px-4">Sua conta foi criada com sucesso, mas ainda não foi aprovada por um administrador.</p>
            <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Contate o suporte para liberação.</p>
          </div>
          <Button
            variant="slate"
            className="w-full"
            size="lg"
            onClick={() => auth.signOut()}
          >
            Sair da Conta
          </Button>
        </div>
      </div>
    );
  }

  return (
    <AppDataProvider>
      <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-32 pt-20">
        {/* Version Update Warning Banner */}
        {showVersionBanner && (
          <div className="fixed top-0 left-0 right-0 z-[100] bg-brand text-white text-center py-3 px-4 font-bold text-xs sm:text-sm shadow-md flex items-center justify-center gap-3">
            <span>Uma nova versão do app está disponível. Clique aqui para atualizar.</span>
            <button 
              onClick={() => window.location.reload()} 
              className="bg-white text-brand px-3 py-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer font-black uppercase text-[10px]"
            >
              Atualizar
            </button>
          </div>
        )}
        {/* Global Error Toast */}
        <AnimatePresence>
          {globalError && (
            <motion.div 
              initial={{ y: -100, opacity: 0 }} 
              animate={{ y: 0, opacity: 1 }} 
              exit={{ y: -100, opacity: 0 }}
              className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] w-full max-w-sm px-4"
            >
              <div className="bg-red-600 text-white p-4 rounded-2xl shadow-xl flex items-center gap-3">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <div className="flex-1 overflow-hidden">
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Erro no Sistema</p>
                  <p className="text-xs font-bold truncate">{globalError}</p>
                </div>
                <button onClick={() => setGlobalError(null)} className="p-1 hover:bg-white/20 rounded-lg">
                  <Plus className="h-4 w-4 rotate-45" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <header className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between bg-white/80 backdrop-blur-md px-6 py-4 border-b border-slate-100 h-16">
          <div className="mx-auto flex w-full max-w-7xl items-center justify-between">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight font-display">
                <span className="text-slate-900">MediShift</span>{' '}
                <span className="text-brand">Plantão</span>
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-3 pr-2 border-r border-slate-100 h-8">
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-bold text-slate-700 leading-none truncate max-w-[120px]">{user.displayName}</p>
                </div>
                <div className="h-8 w-8 overflow-hidden rounded-full border border-slate-200 shadow-sm flex-shrink-0">
                  <img src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} alt={user.displayName || ''} className="h-full w-full object-cover" />
                </div>
              </div>
              <button onClick={() => auth.signOut()} className="flex items-center gap-1.5 text-slate-500 hover:text-red-600 transition-colors px-2.5 py-1.5 rounded-xl hover:bg-red-50 group font-bold text-xs uppercase tracking-wider">
                <LogOut className="h-4 w-4 group-hover:scale-110 transition-transform" />
                <span className="hidden sm:inline">Sair</span>
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8 pt-6 pb-24 sm:pb-32">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, scale: 0.99 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.01 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              {activeTab === 'home' && <Home isAdmin={isAdmin} refreshTrigger={refreshHandoversTrigger} />}
              {activeTab === 'history' && <History isAdmin={isAdmin} refreshTrigger={refreshHandoversTrigger} />}
              {activeTab === 'admin' && <Admin />}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Navigation - Always at bottom now as requested */}
        <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-100 bg-white/90 backdrop-blur-lg px-2 sm:px-6 py-3">
          <div className="flex items-center justify-around max-w-md mx-auto">
            <NavButton 
              active={activeTab === 'home'} 
              onClick={() => setActiveTab('home')}
              icon={<LayoutDashboard className="h-4 w-4" />}
              label="Início"
            />
            <NavButton 
              active={activeTab === 'history'} 
              onClick={() => setActiveTab('history')}
              icon={<HistoryIcon className="h-4 w-4" />}
              label="Histórico"
            />
            {isAdmin && (
              <NavButton 
                active={activeTab === 'admin'} 
                onClick={() => setActiveTab('admin')}
                icon={<Settings className="h-4 w-4" />}
                label="Ajustes"
              />
            )}
          </div>
        </nav>

        {/* Floating Action Button - Fixed position for quick access */}
        {activeTab !== 'admin' && !showAddForm && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowAddForm(true)}
            className="fixed bottom-20 right-4 sm:bottom-24 sm:right-6 md:bottom-28 md:right-10 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand text-white shadow-xl shadow-brand/40 z-50 ring-4 ring-white active:ring-brand/20 transition-all cursor-pointer"
            title="Nova Passagem"
          >
            <Plus className="h-6 w-6 stroke-[3px]" />
          </motion.button>
        )}

        {/* Form Overlay */}
        <AnimatePresence>
          {showAddForm && (
            <HandoverForm onClose={() => {
              setShowAddForm(false);
              setRefreshHandoversTrigger(prev => prev + 1);
            }} />
          )}
        </AnimatePresence>
      </div>
    </AppDataProvider>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 transition-all outline-none",
        active ? "text-brand" : "text-slate-400 hover:text-brand/60"
      )}
    >
      <div className={cn(
        "flex h-8 w-8 items-center justify-center rounded-xl transition-all",
        active ? "bg-brand/10" : "bg-transparent"
      )}>
        {icon}
      </div>
      <span className={cn("text-[9px] font-bold tracking-tight uppercase", active ? "opacity-100" : "opacity-70")}>{label}</span>
    </button>
  );
}
