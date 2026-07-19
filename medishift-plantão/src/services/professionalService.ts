import { db, handleFirestoreError, collection, query, orderBy, onSnapshot, where } from '../lib/firebase';
import { Professional, OperationType } from '../types';

export function subscribeToProfessionals(
  callback: (professionals: Professional[]) => void,
  onlyActive: boolean = false
) {
  const collectionRef = collection(db, 'professionals');
  let q = query(collectionRef, orderBy('name', 'asc'));
  
  if (onlyActive) {
    q = query(collectionRef, where('active', '==', true), orderBy('name', 'asc'));
  }

  return onSnapshot(q, 
    (snapshot) => {
      const professionals = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as Professional));
      callback(professionals);
    }, 
    (error) => handleFirestoreError(error, OperationType.LIST, 'professionals')
  );
}

export function professionalsToMap(professionals: Professional[]): Record<string, string> {
  return professionals.reduce((acc, prof) => {
    acc[prof.id] = prof.name;
    return acc;
  }, {} as Record<string, string>);
}
