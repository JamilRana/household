"use client";

import { useState, useEffect, createContext, useContext } from "react";
import { Bell, X, Info, AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

type NotificationType = "info" | "warning" | "success";

interface Notification {
  id: string;
  message: string;
  type: NotificationType;
}

interface NotificationContextType {
  notify: (message: string, type?: NotificationType) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const notify = (message: string, type: NotificationType = "info") => {
    const id = Math.random().toString(36).substring(7);
    setNotifications((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 5000);
  };

  return (
    <NotificationContext.Provider value={{ notify }}>
      {children}
      <div className="fixed bottom-8 left-8 z-50 flex flex-col gap-2 pointer-events-none">
        {notifications.map((n) => (
          <div 
            key={n.id} 
            className={cn(
              "p-4 rounded-2xl shadow-2xl flex items-center gap-3 w-80 animate-in slide-in-from-left-full duration-300 pointer-events-auto border",
              n.type === "success" ? "bg-emerald-600 text-white border-emerald-500" :
              n.type === "warning" ? "bg-amber-500 text-white border-amber-400" : "bg-blue-600 text-white border-blue-500"
            )}
          >
            {n.type === "success" ? <CheckCircle2 className="h-5 w-5 shrink-0" /> :
             n.type === "warning" ? <AlertCircle className="h-5 w-5 shrink-0" /> : <Info className="h-5 w-5 shrink-0" />}
            <p className="text-sm font-medium flex-1">{n.message}</p>
            <button onClick={() => setNotifications((prev) => prev.filter((notif) => notif.id !== n.id))}>
              <X className="h-4 w-4 opacity-50 hover:opacity-100" />
            </button>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
}

export function useNotify() {
  const context = useContext(NotificationContext);
  if (!context) throw new Error("useNotify must be used within NotificationProvider");
  return context;
}
