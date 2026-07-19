import { OperationType, FirestoreErrorInfo } from '../types';

interface RegisteredListener {
  queryRef: { collectionName: string; id?: string };
  callback: (snapshot: any) => void;
}
const listenersMap = new Map<string, Set<RegisteredListener>>();

function triggerListeners(collectionName: string) {
  const listeners = listenersMap.get(collectionName);
  if (listeners) {
    listeners.forEach(listener => {
      try {
        if (listener.queryRef.id) {
          // Document listener
          const data = getFromStorage(collectionName, {});
          const val = data[listener.queryRef.id];
          listener.callback({
            id: listener.queryRef.id,
            exists: () => !!val,
            data: () => val ? { ...val } : undefined,
            ref: { collectionName, id: listener.queryRef.id }
          });
        } else {
          // Collection listener
          listener.callback(getCollectionSnapshot(collectionName));
        }
      } catch (err) {
        console.error("Error in real-time listener:", err);
      }
    });
  }
}

// Custom Timestamp mock to mirror Firestore's Timestamp interface
export class Timestamp {
  seconds: number;
  nanoseconds: number;

  constructor(seconds: number, nanoseconds: number) {
    this.seconds = seconds;
    this.nanoseconds = nanoseconds;
  }

  toDate() {
    return new Date(this.seconds * 1000);
  }

  toMillis() {
    return this.seconds * 1000;
  }

  toISOString() {
    return this.toDate().toISOString();
  }

  static now() {
    return new Timestamp(Math.floor(Date.now() / 1000), 0);
  }

  static fromDate(date: Date) {
    return new Timestamp(Math.floor(date.getTime() / 1000), 0);
  }
}

// Initial seed data to make the demonstration look full, realistic, and highly professional
const DEFAULT_USERS = {
  'user-admin': {
    id: 'user-admin',
    email: 'roberto.mendes@careflow.com.br',
    displayName: 'Dr. Roberto Mendes',
    photoURL: '',
    isAdmin: true,
    isApproved: true,
    status: 'approved',
    createdAt: new Date('2026-01-01').toISOString()
  },
  'user-supervisor': {
    id: 'user-supervisor',
    email: 'carolina.v@careflow.com.br',
    displayName: 'Carolina Vasconcelos',
    photoURL: '',
    isAdmin: false,
    isApproved: true,
    status: 'approved',
    createdAt: new Date('2026-01-05').toISOString()
  },
  'user-colaborador': {
    id: 'user-colaborador',
    email: 'thiago.souza@careflow.com.br',
    displayName: 'Thiago Souza',
    photoURL: '',
    isAdmin: false,
    isApproved: true,
    status: 'approved',
    createdAt: new Date('2026-01-10').toISOString()
  },
  'user-pendente': {
    id: 'user-pendente',
    email: 'juliana.reis@careflow.com.br',
    displayName: 'Juliana Reis',
    photoURL: '',
    isAdmin: false,
    isApproved: false,
    status: 'pending',
    createdAt: new Date('2026-07-15').toISOString()
  }
};

const DEFAULT_PATIENTS = {
  'pat-1': {
    id: 'pat-1',
    name: 'Geraldo de Alencar',
    birthDate: '1954-04-12',
    complexity: 'ALTA COMPLEXIDADE COM DIETA',
    usesDevice: true,
    deviceTypes: ['Traqueostomia', 'GTT'],
    active: true,
    createdAt: new Date('2026-01-10').toISOString()
  },
  'pat-2': {
    id: 'pat-2',
    name: 'Dona Eunice Camargo',
    birthDate: '1945-08-22',
    complexity: 'ALTA COMPLEXIDADE SEM DIETA',
    usesDevice: true,
    deviceTypes: ['VM', 'Sondagem Vesical'],
    active: true,
    createdAt: new Date('2026-02-15').toISOString()
  },
  'pat-3': {
    id: 'pat-3',
    name: 'Sebastião Ferreira Santos',
    birthDate: '1961-11-03',
    complexity: 'MÉDIA COMPLEXIDADE COM DIETA',
    usesDevice: true,
    deviceTypes: ['Oxigênio Cateter', 'GTT'],
    active: true,
    createdAt: new Date('2026-03-01').toISOString()
  },
  'pat-4': {
    id: 'pat-4',
    name: 'Beatriz Lins Fagundes',
    birthDate: '1938-05-19',
    complexity: 'BAIXA COMPLEXIDADE',
    usesDevice: false,
    deviceTypes: [],
    active: true,
    createdAt: new Date('2026-04-12').toISOString()
  },
  'pat-5': {
    id: 'pat-5',
    name: 'Marcos da Silva Santos',
    birthDate: '1967-02-28',
    complexity: 'MÉDIA COMPLEXIDADE SEM DIETA',
    usesDevice: false,
    active: false,
    createdAt: new Date('2026-04-20').toISOString()
  }
};

const DEFAULT_PROFESSIONALS = {
  'prof-1': {
    id: 'prof-1',
    name: 'Carolina Vasconcelos (Enfermeira)',
    email: 'carolina.v@careflow.com.br',
    active: true
  },
  'prof-2': {
    id: 'prof-2',
    name: 'Thiago Souza (Técnico)',
    email: 'thiago.souza@careflow.com.br',
    active: true
  },
  'prof-3': {
    id: 'prof-3',
    name: 'Luciana Andrade (Enfermeira)',
    email: 'luciana.andrade@careflow.com.br',
    active: true
  },
  'prof-4': {
    id: 'prof-4',
    name: 'Daniel Silva (Técnico)',
    email: 'daniel.silva@careflow.com.br',
    active: true
  }
};

const DEFAULT_HANDOVERS = {
  'hand-1': {
    id: 'hand-1',
    patientId: 'pat-1',
    patientName: 'Geraldo de Alencar',
    hadEvacuation: true,
    tookSOSMedication: false,
    hadComplication: false,
    hadDiurese: true,
    professionalId: 'prof-1',
    professionalUid: 'user-supervisor',
    professionalEmail: 'carolina.v@careflow.com.br',
    professionalName: 'Carolina Vasconcelos (Enfermeira)',
    handoverDate: new Timestamp(Math.floor((Date.now() - 3600000) / 1000), 0),
    createdAt: new Timestamp(Math.floor((Date.now() - 3600000) / 1000), 0),
    shift: 'DIURNO',
    status: 'Publicada',
    news2Score: 1,
    news2Classification: 'BAIXO',
    news2Values: {
      respiratoryRate: '12-20',
      spo2Scale: 'scale1',
      spo2: '>=96',
      oxygenSupport: 'no',
      systolicBp: '111-219',
      pulse: '51-90',
      consciousness: 'A',
      temperature: '36.1-38.0'
    },
    observations: 'Paciente em bom estado geral, lúcido e orientado. Cooperativo. Dieta enteral por GTT infundida lentamente com boa aceitação. Trato gastrointestinal funcionante (evacuação presente). Ruídos hidroaéreos presentes.'
  },
  'hand-2': {
    id: 'hand-2',
    patientId: 'pat-2',
    patientName: 'Dona Eunice Camargo',
    hadEvacuation: false,
    tookSOSMedication: true,
    sosMedicationName: 'Berotec + Atrovent (Inalação SOS)',
    hadComplication: true,
    complicationDescription: 'Apresentou episódio de dispneia e sibilância leve na madrugada. Realizada aspiração traqueal de secreção clara e fluida, seguida de inalação SOS conforme prescrição médica, obtendo melhora imediata do padrão respiratório.',
    hadDiurese: true,
    professionalId: 'prof-2',
    professionalUid: 'user-colaborador',
    professionalEmail: 'thiago.souza@careflow.com.br',
    professionalName: 'Thiago Souza (Técnico)',
    handoverDate: new Timestamp(Math.floor((Date.now() - 14400000) / 1000), 0),
    createdAt: new Timestamp(Math.floor((Date.now() - 14400000) / 1000), 0),
    shift: 'NOTURNO',
    status: 'Publicada',
    news2Score: 5,
    news2Classification: 'MÉDIO',
    news2Values: {
      respiratoryRate: '21-24',
      spo2Scale: 'scale1',
      spo2: '94-95',
      oxygenSupport: 'yes',
      systolicBp: '111-219',
      pulse: '51-90',
      consciousness: 'A',
      temperature: '36.1-38.0'
    },
    observations: 'Paciente mantida em ventilação mecânica invasiva. Saturação mantida estável após procedimentos. Cabeceira elevada. Monitorizada constantemente.'
  },
  'hand-3': {
    id: 'hand-3',
    patientId: 'pat-3',
    patientName: 'Sebastião Ferreira Santos',
    hadEvacuation: true,
    tookSOSMedication: false,
    hadComplication: false,
    hadDiurese: true,
    professionalId: 'prof-3',
    professionalUid: 'user-admin',
    professionalEmail: 'roberto.mendes@careflow.com.br',
    professionalName: 'Dr. Roberto Mendes',
    handoverDate: new Timestamp(Math.floor((Date.now() - 86400000) / 1000), 0),
    createdAt: new Timestamp(Math.floor((Date.now() - 86400000) / 1000), 0),
    shift: 'DIURNO',
    status: 'Publicada',
    news2Score: 0,
    news2Classification: 'BAIXO',
    news2Values: {
      respiratoryRate: '12-20',
      spo2Scale: 'scale1',
      spo2: '>=96',
      oxygenSupport: 'no',
      systolicBp: '111-219',
      pulse: '51-90',
      consciousness: 'A',
      temperature: '36.1-38.0'
    },
    observations: 'Realizado curativo limpo e seco na inserção de traqueostomia. GTT limpa e sem sinais inflamatórios periféricos. Diurese clara e em bom volume. Paciente deambulou com auxílio técnico. Dieta enteral bem tolerada.'
  },
  'hand-4': {
    id: 'hand-4',
    patientId: 'pat-4',
    patientName: 'Beatriz Lins Fagundes',
    hadEvacuation: false,
    tookSOSMedication: false,
    hadComplication: false,
    hadDiurese: true,
    professionalId: 'prof-2',
    professionalUid: 'user-colaborador',
    professionalEmail: 'thiago.souza@careflow.com.br',
    professionalName: 'Thiago Souza (Técnico)',
    handoverDate: new Timestamp(Math.floor((Date.now()) / 1000), 0),
    createdAt: new Timestamp(Math.floor((Date.now()) / 1000), 0),
    shift: 'NOTURNO',
    status: 'Rascunho',
    news2Score: 0,
    news2Classification: 'BAIXO',
    news2Values: {
      respiratoryRate: '12-20',
      spo2Scale: 'scale1',
      spo2: '>=96',
      oxygenSupport: 'no',
      systolicBp: '111-219',
      pulse: '51-90',
      consciousness: 'A',
      temperature: '36.1-38.0'
    },
    observations: 'Dormiu bem durante todo o plantão noturno. Sem queixas ou alterações observadas. Rascunho salvo para preenchimento de detalhes adicionais.'
  }
};

// Database Initialization Helper
function getFromStorage(key: string, defaultData: any) {
  const data = localStorage.getItem(`demo_db_${key}`);
  if (!data) {
    localStorage.setItem(`demo_db_${key}`, JSON.stringify(defaultData));
    return defaultData;
  }
  try {
    return JSON.parse(data);
  } catch {
    return defaultData;
  }
}

function saveToStorage(key: string, data: any) {
  localStorage.setItem(`demo_db_${key}`, JSON.stringify(data));
}

// Ensure database keys exist in storage
getFromStorage('users', DEFAULT_USERS);
getFromStorage('patients', DEFAULT_PATIENTS);
getFromStorage('professionals', DEFAULT_PROFESSIONALS);
getFromStorage('handovers', DEFAULT_HANDOVERS);

// Convert standard storage object to Firestore collection snapshot format
function getCollectionSnapshot(collectionName: string) {
  const rawData = getFromStorage(collectionName, {});
  const docs = Object.values(rawData).map((item: any) => {
    // Correctly reconstruct Timestamp structures for handovers
    let docData = { ...item };
    if (collectionName === 'handovers') {
      if (docData.handoverDate && !(docData.handoverDate instanceof Timestamp)) {
        const sec = docData.handoverDate.seconds || Math.floor(new Date(docData.handoverDate).getTime() / 1000);
        docData.handoverDate = new Timestamp(sec, 0);
      }
      if (docData.createdAt && !(docData.createdAt instanceof Timestamp)) {
        const sec = docData.createdAt.seconds || Math.floor(new Date(docData.createdAt).getTime() / 1000);
        docData.createdAt = new Timestamp(sec, 0);
      }
      if (docData.publishedAt && !(docData.publishedAt instanceof Timestamp)) {
        const sec = docData.publishedAt.seconds || Math.floor(new Date(docData.publishedAt).getTime() / 1000);
        docData.publishedAt = new Timestamp(sec, 0);
      }
      if (docData.cancelledAt && !(docData.cancelledAt instanceof Timestamp)) {
        const sec = docData.cancelledAt.seconds || Math.floor(new Date(docData.cancelledAt).getTime() / 1000);
        docData.cancelledAt = new Timestamp(sec, 0);
      }
    }
    return {
      id: item.id,
      data: () => docData,
      exists: () => true,
      ref: doc(db, collectionName, item.id)
    };
  });

  return {
    docs,
    empty: docs.length === 0,
    size: docs.length,
    forEach(callback: (doc: any) => void) {
      docs.forEach(callback);
    }
  };
}

// Mock auth object
class MockAuth {
  currentUser: any = null;
  private authListeners = new Set<(user: any) => void>();

  constructor() {
    const savedUser = localStorage.getItem('demo_current_user');
    if (savedUser) {
      try {
        const u = JSON.parse(savedUser);
        this.currentUser = {
          uid: u.id,
          email: u.email,
          displayName: u.displayName,
          photoURL: u.photoURL || '',
          emailVerified: true,
          isAnonymous: false,
          providerData: [{ providerId: 'google.com', email: u.email }]
        };
      } catch {
        this.currentUser = null;
      }
    }
  }

  onAuthStateChanged(callback: (user: any) => void) {
    this.authListeners.add(callback);
    callback(this.currentUser);
    return () => {
      this.authListeners.delete(callback);
    };
  }

  signInWithProfile(uid: string) {
    const users = getFromStorage('users', DEFAULT_USERS);
    const u = users[uid];
    if (u) {
      this.currentUser = {
        uid: u.id,
        email: u.email,
        displayName: u.displayName,
        photoURL: u.photoURL || '',
        emailVerified: true,
        isAnonymous: false,
        providerData: [{ providerId: 'google.com', email: u.email }]
      };
      localStorage.setItem('demo_current_user', JSON.stringify(u));
      this.authListeners.forEach(cb => cb(this.currentUser));
    }
  }

  signOut() {
    this.currentUser = null;
    localStorage.removeItem('demo_current_user');
    this.authListeners.forEach(cb => cb(null));
    return Promise.resolve();
  }
}

export const auth = new MockAuth();
export const db = {};
export const googleProvider = {};

export const isWebView = () => false;

export const signIn = async () => {
  // Overridden by demonstration profile chooser
  return Promise.resolve();
};

export const signOut = () => auth.signOut();

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  console.error(`Mock Database Log [${operationType}] - Path: ${path}`, error);
}

// ----------------------------------------------------
// Mock firestore methods to allow complete offline usage
// ----------------------------------------------------

export function doc(dbInstance: any, collectionName: string, id: string) {
  return { collectionName, id };
}

export function collection(dbInstance: any, collectionName: string) {
  return { collectionName };
}

export async function getDoc(docRef: any) {
  const { collectionName, id } = docRef;
  const data = getFromStorage(collectionName, {});
  const val = data[id];
  return {
    id,
    exists: () => !!val,
    data: () => val ? { ...val } : undefined
  };
}

export async function setDoc(docRef: any, val: any, options?: any) {
  const { collectionName, id } = docRef;
  const data = getFromStorage(collectionName, {});
  
  // Reconstruct timestamps/dates to ISO strings for persistence
  const toSave = { ...val };
  if (toSave.createdAt instanceof Timestamp) {
    toSave.createdAt = toSave.createdAt.toDate().toISOString();
  }
  
  data[id] = { id, ...toSave };
  saveToStorage(collectionName, data);
  triggerListeners(collectionName);
}

export async function addDoc(collectionRef: any, val: any) {
  const { collectionName } = collectionRef;
  const id = `${collectionName.substring(0, 4)}-${Math.random().toString(36).substr(2, 9)}`;
  const data = getFromStorage(collectionName, {});
  
  const toSave = { ...val };
  if (toSave.createdAt instanceof Timestamp) {
    toSave.createdAt = toSave.createdAt.toDate().toISOString();
  }
  if (toSave.handoverDate instanceof Timestamp) {
    toSave.handoverDate = toSave.handoverDate.toDate().toISOString();
  }
  
  data[id] = { id, ...toSave };
  saveToStorage(collectionName, data);
  triggerListeners(collectionName);
  return { id };
}

export async function updateDoc(docRef: any, val: any) {
  const { collectionName, id } = docRef;
  const data = getFromStorage(collectionName, {});
  if (data[id]) {
    const toSave = { ...data[id], ...val };
    
    // Convert Timestamps to ISO strings for storage safety
    if (toSave.updatedAt instanceof Timestamp) {
      toSave.updatedAt = toSave.updatedAt.toDate().toISOString();
    }
    if (toSave.publishedAt instanceof Timestamp) {
      toSave.publishedAt = toSave.publishedAt.toDate().toISOString();
    }
    if (toSave.cancelledAt instanceof Timestamp) {
      toSave.cancelledAt = toSave.cancelledAt.toDate().toISOString();
    }
    if (toSave.handoverDate instanceof Timestamp) {
      toSave.handoverDate = toSave.handoverDate.toDate().toISOString();
    }
    
    data[id] = toSave;
    saveToStorage(collectionName, data);
    triggerListeners(collectionName);
  }
}

export async function deleteDoc(docRef: any) {
  const { collectionName, id } = docRef;
  const data = getFromStorage(collectionName, {});
  if (data[id]) {
    delete data[id];
    saveToStorage(collectionName, data);
    triggerListeners(collectionName);
  }
}

export async function getDocs(queryRef: any) {
  const { collectionName } = queryRef;
  return getCollectionSnapshot(collectionName);
}

export function onSnapshot(queryRef: any, callback: any, errorCallback?: any, ...args: any[]): any {
  const { collectionName, id } = queryRef;
  
  const listener: RegisteredListener = { queryRef, callback };
  
  if (!listenersMap.has(collectionName)) {
    listenersMap.set(collectionName, new Set());
  }
  listenersMap.get(collectionName)!.add(listener);
  
  // Trigger callback immediately on registration with initial data
  try {
    if (id) {
      const data = getFromStorage(collectionName, {});
      const val = data[id];
      callback({
        id,
        exists: () => !!val,
        data: () => val ? { ...val } : undefined,
        ref: { collectionName, id }
      });
    } else {
      callback(getCollectionSnapshot(collectionName));
    }
  } catch (err) {
    if (errorCallback) errorCallback(err);
  }

  // Return unsubscribe handler
  return () => {
    const listeners = listenersMap.get(collectionName);
    if (listeners) {
      listeners.delete(listener);
      if (listeners.size === 0) {
        listenersMap.delete(collectionName);
      }
    }
  };
}

export function query(collectionRef: any, ...constraints: any[]) {
  // Returns collection details; sorting/filtering is done on client-side
  return { collectionName: collectionRef.collectionName };
}

export function where(field: string, operator: string, value: any) {
  return { type: 'where', field, operator, value };
}

export function orderBy(field: string, direction?: 'asc' | 'desc') {
  return { type: 'orderBy', field, direction };
}

export function limit(n: number) {
  return { type: 'limit', n };
}

export function serverTimestamp() {
  return Timestamp.now();
}

export function getRedirectResult(authInstance: any) {
  return Promise.resolve(null);
}

export function onAuthStateChanged(authInstance: any, callback: (user: any) => void) {
  return auth.onAuthStateChanged(callback);
}

export function writeBatch(dbInstance: any) {
  const operations: Array<() => void> = [];
  return {
    update(docRef: any, data: any) {
      operations.push(() => {
        updateDoc(docRef, data);
      });
    },
    async commit() {
      operations.forEach(op => op());
    }
  };
}
