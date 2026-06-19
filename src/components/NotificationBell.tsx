"use client";

import { Bell, Check, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useState, useEffect, useCallback, useTransition } from "react";
import {
  getActiveNotifications,
  markAsRead as markAsReadAction,
  markAllAsRead as markAllAsReadAction,
} from "@/app/actions/notification";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: Date;
}

function timeAgo(date: Date): string {
  const now = new Date();
  const diff = Math.floor((now.getTime() - new Date(date).getTime()) / 1000);

  if (diff < 60) return "Baru saja";
  if (diff < 3600) return `${Math.floor(diff / 60)} mnt lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} hari lalu`;
  return new Date(date).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

function getTypeColor(type: string): string {
  switch (type) {
    case "urgent": return "text-red-500";
    case "warning": return "text-amber-500";
    case "success": return "text-emerald-500";
    default: return "text-blue-500";
  }
}

function getTypeDot(type: string): string {
  switch (type) {
    case "urgent": return "bg-red-500";
    case "warning": return "bg-amber-500";
    case "success": return "bg-emerald-500";
    default: return "bg-blue-500";
  }
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await getActiveNotifications();
      setNotifications(data);
    } catch {
      console.error("Failed to fetch notifications");
    }
  }, []);

  // Fetch on mount and poll every 30 seconds
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Also refetch when popover opens
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleMarkAsRead = (id: string) => {
    // Optimistic update
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    startTransition(async () => {
      await markAsReadAction(id);
    });
  };

  const handleMarkAllAsRead = () => {
    // Optimistic update
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    startTransition(async () => {
      await markAllAsReadAction();
    });
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button className="relative rounded-full" size="icon" variant="ghost">
          <Bell className="h-5 w-5 text-gray-600 dark:text-gray-300"/>
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1.5 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0" sideOffset={8}>
        <div className="flex items-center justify-between px-4 py-3 border-b bg-slate-50 dark:bg-slate-800/50 rounded-t-md">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold">Notifikasi</h4>
            {unreadCount > 0 && (
              <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold">
                {unreadCount}
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button 
              onClick={handleMarkAllAsRead} 
              disabled={isPending}
              className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 hover:underline disabled:opacity-50 transition-colors"
            >
              <CheckCheck className="w-3 h-3" />
              Tandai dibaca
            </button>
          )}
        </div>
        <div className="max-h-[350px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="w-8 h-8 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
              <p className="text-sm text-gray-500">Belum ada notifikasi.</p>
            </div>
          ) : (
            notifications.map((notif) => (
              <div 
                key={notif.id} 
                onClick={() => !notif.isRead && handleMarkAsRead(notif.id)}
                className={`p-3 border-b last:border-0 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors cursor-pointer ${
                  !notif.isRead ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''
                }`}
              >
                <div className="flex gap-2.5">
                  {/* Type indicator dot */}
                  <div className="mt-1.5 shrink-0">
                    <div className={`w-2 h-2 rounded-full ${!notif.isRead ? getTypeDot(notif.type) : 'bg-gray-300 dark:bg-gray-600'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2 mb-0.5">
                      <p className={`text-sm font-medium truncate ${!notif.isRead ? getTypeColor(notif.type) : 'text-gray-500 dark:text-gray-400'}`}>
                        {notif.title}
                      </p>
                      <span className="text-[10px] text-gray-400 whitespace-nowrap shrink-0">{timeAgo(notif.createdAt)}</span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">{notif.message}</p>
                  </div>
                  {/* Read indicator */}
                  {!notif.isRead && (
                    <div className="mt-1 shrink-0" title="Tandai dibaca">
                      <Check className="w-3.5 h-3.5 text-gray-400 hover:text-blue-500 transition-colors" />
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
        {notifications.length > 0 && (
          <div className="px-4 py-2.5 border-t bg-slate-50 dark:bg-slate-800/50 rounded-b-md">
            <p className="text-[10px] text-center text-gray-400">
              Menampilkan {notifications.length} notifikasi terbaru
            </p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
