"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, AlertCircle, Info, Cpu, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastType = "success" | "error" | "info" | "ai";

export interface ToastOptions {
  title: string;
  description?: string;
  type?: ToastType;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastItem extends ToastOptions {
  id: string;
}

interface ToastContextType {
  toast: (options: ToastOptions) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
  ai: (title: string, description?: string) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((options: ToastOptions) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newItem: ToastItem = { ...options, id, type: options.type || "info" };
    setToasts((prev) => [newItem, ...prev].slice(0, 4));

    const duration = options.duration || 4000;
    setTimeout(() => {
      dismiss(id);
    }, duration);
  }, [dismiss]);

  const success = useCallback((title: string, description?: string) => toast({ title, description, type: "success" }), [toast]);
  const error = useCallback((title: string, description?: string) => toast({ title, description, type: "error" }), [toast]);
  const info = useCallback((title: string, description?: string) => toast({ title, description, type: "info" }), [toast]);
  const ai = useCallback((title: string, description?: string) => toast({ title, description, type: "ai" }), [toast]);

  const getIcon = (type: ToastType) => {
    switch (type) {
      case "success":
        return <CheckCircle2 className="w-5 h-5 text-success shrink-0" />;
      case "error":
        return <AlertCircle className="w-5 h-5 text-danger shrink-0" />;
      case "ai":
        return <Cpu className="w-5 h-5 text-signal-500 shrink-0" />;
      default:
        return <Info className="w-5 h-5 text-signal-500 shrink-0" />;
    }
  };

  return (
    <ToastContext.Provider value={{ toast, success, error, info, ai, dismiss }}>
      {children}
      
      {/* Toast Notification Container */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, y: 15, transition: { duration: 0.2 } }}
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
              className="pointer-events-auto w-full glass-panel border border-ink-border bg-ink-surface p-4 shadow-glass-lg rounded-2xl flex items-start gap-3 relative overflow-hidden group"
            >
              {/* Top gradient border highlight */}
              <div 
                className={cn(
                  "absolute top-0 left-0 right-0 h-[2px]",
                  t.type === "success" && "bg-success",
                  t.type === "error" && "bg-danger",
                  t.type === "ai" && "bg-gradient-to-r from-aperture-500 to-signal-500",
                  t.type === "info" && "bg-signal-500"
                )}
              />

              {getIcon(t.type || "info")}

              <div className="flex-1 min-w-0 pr-2">
                <h4 className="text-sm font-semibold text-text-primary tracking-tight">{t.title}</h4>
                {t.description && (
                  <p className="text-xs text-text-secondary mt-0.5 leading-relaxed font-sans">{t.description}</p>
                )}
                {t.action && (
                  <button
                    onClick={() => {
                      t.action?.onClick();
                      dismiss(t.id);
                    }}
                    className="mt-2 text-xs font-semibold text-signal-500 hover:text-signal-600 transition-colors"
                  >
                    {t.action.label} &rarr;
                  </button>
                )}
              </div>

              <button
                onClick={() => dismiss(t.id)}
                className="text-text-tertiary hover:text-text-primary transition-colors p-1 rounded-lg hover:bg-white/5"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};
