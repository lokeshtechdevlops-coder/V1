'use client';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
export const Dialog = DialogPrimitive.Root;
export const DialogTitle = DialogPrimitive.Title;
export const DialogDescription = DialogPrimitive.Description;
export function DialogContent({children}: {children: React.ReactNode}) {
  return <DialogPrimitive.Portal><DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-slate-950/40"/><DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-lg focus:outline-none">
    {children}<DialogPrimitive.Close aria-label="Close dialog" className="absolute right-4 top-4 rounded p-1 text-slate-500 hover:bg-slate-100"><X size={18}/></DialogPrimitive.Close>
  </DialogPrimitive.Content></DialogPrimitive.Portal>;
}
