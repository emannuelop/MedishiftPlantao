import React from 'react';
import { motion } from 'framer-motion';
import { Shield, CheckCircle2, X } from 'lucide-react';
import { AppUser } from '../types';
import { cn } from '../lib/utils';

interface UserCardProps {
  user: AppUser;
  onToggleAdmin: (user: AppUser) => void;
  onToggleApproval?: (user: AppUser) => void;
  onApprove?: (user: AppUser) => void;
  onBlock?: (user: AppUser) => void;
  onSetPending?: (user: AppUser) => void;
  key?: React.Key;
}

export function UserCard({ user, onToggleAdmin, onToggleApproval, onApprove, onBlock, onSetPending }: UserCardProps) {
  return (
    <motion.div
      className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm"
    >
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 overflow-hidden rounded-full border-4 border-slate-50 ring-2 ring-brand/10">
              <img 
                src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}&background=brand&color=fff`} 
                alt={user.displayName} 
                className="h-full w-full object-cover" 
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-lg font-bold text-slate-900">{user.displayName}</h4>
                <span className={cn(
                  "px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest",
                  (user.status === 'approved' || (!user.status && user.isApproved))
                    ? "bg-emerald-50 text-emerald-600 border border-emerald-100" 
                    : (user.status === 'blocked' || (!user.status && user.isBlocked))
                      ? "bg-red-50 text-red-600 border border-red-100" 
                      : "bg-amber-50 text-amber-600 border border-amber-100"
                )}>
                  {(user.status === 'approved' || (!user.status && user.isApproved))
                    ? 'Liberado' 
                    : (user.status === 'blocked' || (!user.status && user.isBlocked))
                      ? 'Bloqueado' 
                      : 'Pendente'}
                </span>
              </div>
              <p className="text-sm font-medium text-slate-400">{user.email}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-t border-slate-50 pt-6">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">Cargo</p>
            <p className="text-xs font-bold text-slate-600">{user.isAdmin ? 'Administrador' : 'Usuário Comum'}</p>
          </div>
          <div className="flex flex-wrap sm:flex-nowrap justify-start xl:justify-end items-center gap-2 w-full xl:w-auto">
            <button
               onClick={() => onToggleAdmin(user)}
              className={cn(
                "flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-all w-full sm:w-auto",
                user.isAdmin 
                  ? "bg-brand text-white border-brand shadow-lg shadow-brand/20" 
                  : "bg-white text-slate-400 border-slate-100 hover:border-brand hover:text-brand"
              )}
            >
              <Shield className="h-3.5 w-3.5" />
              {user.isAdmin ? 'Admin' : 'Tornar Admin'}
            </button>
            
            {(user.status === 'approved' || (!user.status && user.isApproved)) ? (
              <>
                <button
                  type="button"
                  onClick={() => onSetPending ? onSetPending(user) : onToggleApproval?.(user)}
                  className="flex items-center w-full sm:w-auto justify-center rounded-xl border border-slate-100 bg-white hover:bg-slate-50 text-slate-500 px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-all"
                >
                  Pendente
                </button>
                <button
                  type="button"
                  onClick={() => onBlock ? onBlock(user) : onToggleApproval?.(user)}
                  className="flex items-center gap-1.5 w-full sm:w-auto justify-center rounded-xl border border-red-100 bg-red-50 hover:bg-red-100 text-red-600 px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-all"
                >
                  <X className="h-3.5 w-3.5" />
                  Bloquear
                </button>
              </>
            ) : (user.status === 'blocked' || (!user.status && user.isBlocked)) ? (
              <>
                <button
                  type="button"
                  onClick={() => onApprove ? onApprove(user) : onToggleApproval?.(user)}
                  className="flex items-center gap-1.5 w-full sm:w-auto justify-center rounded-xl border border-emerald-100 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-all"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Liberar
                </button>
                <button
                  type="button"
                  onClick={() => onSetPending ? onSetPending(user) : onToggleApproval?.(user)}
                  className="flex items-center w-full sm:w-auto justify-center rounded-xl border border-slate-100 bg-white hover:bg-slate-50 text-slate-500 px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-all"
                >
                  Pendente
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => onApprove ? onApprove(user) : onToggleApproval?.(user)}
                  className="flex items-center gap-1.5 w-full sm:w-auto justify-center rounded-xl border border-emerald-100 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-all"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Aprovar
                </button>
                <button
                  type="button"
                  onClick={() => onBlock ? onBlock(user) : onToggleApproval?.(user)}
                  className="flex items-center gap-1.5 w-full sm:w-auto justify-center rounded-xl border border-red-100 bg-red-50 hover:bg-red-100 text-red-600 px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-all"
                >
                  <X className="h-3.5 w-3.5" />
                  Bloquear
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
