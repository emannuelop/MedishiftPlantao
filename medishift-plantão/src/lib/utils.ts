import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function ensureDate(val: any): Date {
  if (!val) return new Date();
  if (val && typeof val.toDate === 'function') return val.toDate();
  if (val instanceof Date) return val;
  try {
    const d = new Date(val);
    return isNaN(d.getTime()) ? new Date() : d;
  } catch (e) {
    return new Date();
  }
}
