export enum PatientComplexity {
  BAIXA = 'BAIXA COMPLEXIDADE',
  MEDIA_SEM_DIETA = 'MÉDIA COMPLEXIDADE SEM DIETA',
  MEDIA_COM_DIETA = 'MÉDIA COMPLEXIDADE COM DIETA',
  ALTA_SEM_DIETA = 'ALTA COMPLEXIDADE SEM DIETA',
  ALTA_COM_DIETA = 'ALTA COMPLEXIDADE COM DIETA'
}

export enum WorkShift {
  DIURNO = 'DIURNO',
  NOTURNO = 'NOTURNO',
  HORAS_24 = '24 HORAS'
}

export interface Patient {
  id: string;
  name: string;
  birthDate: string; // YYYY-MM-DD
  active: boolean;
  complexity: PatientComplexity;
  usesDevice: boolean;
  deviceTypes?: string[];
  createdAt: any; // ServerTimestamp
}

export interface Professional {
  id: string;
  name: string;
  email?: string;
  active: boolean;
}

export interface Handover {
  id: string;
  patientId: string;
  patientName: string;
  hadEvacuation: boolean;
  tookSOSMedication: boolean;
  sosMedicationName?: string;
  hadComplication: boolean;
  complicationDescription?: string;
  hadDiurese: boolean;
  observations: string;
  professionalId?: string; // Reference to Professionals collection
  professionalUid: string;
  professionalEmail: string;
  professionalName: string;
  handoverDate: any; // Timestamp
  deviceTypes?: string[];
  shift: WorkShift;
  createdAt: any; // ServerTimestamp
  ventilation?: string;
  precautions?: string;
  status?: 'Rascunho' | 'Publicada' | 'Cancelada';
  news2Score?: number;
  news2Classification?: string;
  news2Values?: {
    respiratoryRate: string;
    spo2Scale: string;
    spo2: string;
    oxygenSupport: string;
    systolicBp: string;
    pulse: string;
    consciousness: string;
    temperature: string;
  };
  publishedAt?: any; // ServerTimestamp
  cancelledByUid?: string;
  cancelledByName?: string;
  cancelledByEmail?: string;
  cancelledAt?: any; // ServerTimestamp
  cancellationReason?: string;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
  AUTH = 'auth'
}

export interface AppUser {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  isAdmin: boolean;
  isApproved: boolean;
  isBlocked?: boolean;
  status?: 'pending' | 'approved' | 'blocked';
  createdAt: any;
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}
