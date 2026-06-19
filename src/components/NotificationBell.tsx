"use client";

import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useState } from "react";

export function NotificationBell() {
  // Mock data for now - later this can fetch from database
  const [notifications, setNotifications] = useState([
    { id: 1, title: "Stok Menipis", desc: "Outsole 19F0 GUM 3 tersisa 50 pcs", time: "10 mnt lalu", unread: true, type: "warning" },
    { id: 2, title: "PO Urgent", desc: "PO LB0705 harus segera diproses", time: "1 jam lalu", unread: true, type: "urgent" },
    { id: 3, title: "Sistem", desc: "Backup database harian berhasil", time: "2 jam lalu", unread: false, type: "info" },
  ]);

  const unreadCount = notifications.filter(n => n.unread).length;

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, unread: false })));
  };

  return (
    <Popover>
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
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h4 className="text-sm font-semibold">Notifikasi</h4>
          {unreadCount > 0 && (
            <button onClick={markAllAsRead} className="text-xs text-blue-500 hover:underline">
              Tandai dibaca
            </button>
          )}
        </div>
        <div className="max-h-[300px] overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="p-4 text-center text-sm text-gray-500">Belum ada notifikasi.</p>
          ) : (
            notifications.map((notif) => (
              <div 
                key={notif.id} 
                className={`p-4 border-b last:border-0 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors cursor-pointer ${notif.unread ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''}`}
              >
                <div className="flex justify-between items-start mb-1">
                  <p className={`text-sm font-medium ${notif.type === 'urgent' ? 'text-red-500' : notif.type === 'warning' ? 'text-amber-500' : ''}`}>
                    {notif.title}
                  </p>
                  <span className="text-[10px] text-gray-400 whitespace-nowrap ml-2">{notif.time}</span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">{notif.desc}</p>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
