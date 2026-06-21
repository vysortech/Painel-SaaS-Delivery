import React from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

export interface ToastMessage {
    message: string;
    type: 'success' | 'error';
}

interface ToastProps {
    toast: ToastMessage;
    onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
    return (
         <div className="fixed bottom-6 right-6 z-[70] animate-in slide-in-from-bottom-5 fade-in duration-300">
            <div className={`flex items-center gap-3 px-6 py-4 rounded-xl shadow-lg border ${
               toast.type === 'success' ? 'bg-emerald-900/50 border-emerald-500/50 text-emerald-400' : 'bg-red-900/50 border-red-500/50 text-red-400'
            }`}>
               {toast.type === 'success' ? <CheckCircle2 className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
               <span className="font-medium text-white">{toast.message}</span>
               <button onClick={onClose} className="ml-4 opacity-70 hover:opacity-100">
                  <X className="w-4 h-4" />
               </button>
            </div>
         </div>
    );
};
