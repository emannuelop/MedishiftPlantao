import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { db, handleFirestoreError, collection, getDocs } from '../lib/firebase';
import { Patient, Professional, OperationType } from '../types';

interface AppDataContextType {
  patients: Patient[];
  professionals: Professional[];
  professionalsMap: Record<string, string>;
  loadingPatients: boolean;
  loadingProfessionals: boolean;
  refreshPatients: () => Promise<void>;
  refreshProfessionals: () => Promise<void>;
}

const AppDataContext = createContext<AppDataContextType | undefined>(undefined);

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [professionalsMap, setProfessionalsMap] = useState<Record<string, string>>({});
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [loadingProfessionals, setLoadingProfessionals] = useState(true);

  const refreshPatients = useCallback(async () => {
    setLoadingPatients(true);
    try {
      const patientsSnapshot = await getDocs(collection(db, 'patients'));
      const patientsData = patientsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Patient));
      setPatients(patientsData.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'patients');
    } finally {
      setLoadingPatients(false);
    }
  }, []);

  const refreshProfessionals = useCallback(async () => {
    setLoadingProfessionals(true);
    try {
      const profsSnapshot = await getDocs(collection(db, 'professionals'));
      const profsData = profsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Professional));
      
      const map: Record<string, string> = {};
      profsData.forEach(p => {
        map[p.id] = p.name;
      });
      
      setProfessionals(profsData.sort((a, b) => a.name.localeCompare(b.name)));
      setProfessionalsMap(map);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'professionals');
    } finally {
      setLoadingProfessionals(false);
    }
  }, []);

  useEffect(() => {
    refreshPatients();
    refreshProfessionals();
  }, [refreshPatients, refreshProfessionals]);

  return (
    <AppDataContext.Provider value={{
      patients,
      professionals,
      professionalsMap,
      loadingPatients,
      loadingProfessionals,
      refreshPatients,
      refreshProfessionals
    }}>
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppData() {
  const context = useContext(AppDataContext);
  if (context === undefined) {
    throw new Error('useAppData must be used within an AppDataProvider');
  }
  return context;
}
