
import React, { useState, useEffect } from 'react';
import { Play, Bell, BellOff, BellRing, MessageSquare } from 'lucide-react';

interface HeaderProps {
  onToggleChat: () => void;
  hasUnread?: boolean;
}

const Header: React.FC<HeaderProps> = ({ onToggleChat, hasUnread }) => {
  const [notifStatus, setNotifStatus] = useState<NotificationPermission>('default');

  useEffect(() => {
    if ("Notification" in window) {
      setNotifStatus(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if (!("Notification" in window)) {
      alert("Tu navegador no soporta notificaciones.");
      return;
    }

    const permission = await Notification.requestPermission();
    setNotifStatus(permission);
    
    if (permission === 'granted') {
      new Notification("¡Notificaciones activadas!", {
        body: "Te avisaremos sobre accidentes pesados y obras en tiempo real.",
        icon: 'https://picsum.photos/192/192'
      });
    }
  };

  return (
    <header className="bg-slate-900/80 backdrop-blur-md border-b border-white/5 px-4 pt-[calc(0.5rem+env(safe-area-inset-top))] pb-4 flex items-center justify-between shadow-sm z-40">
      <div className="flex items-center gap-3">
        <div className="bg-yellow-400 p-2 rounded-xl flex items-center justify-center shadow-lg shadow-yellow-400/20">
          <Play fill="#0f172a" size={20} className="text-slate-900 translate-x-0.5" />
        </div>
        <div>
          <h1 className="text-lg font-black tracking-tighter leading-none text-white uppercase">
            Hay Paso
          </h1>
          <p className="text-[9px] font-black text-yellow-400 uppercase tracking-widest leading-none mt-1">
            TIEMPO REAL
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button 
          onClick={onToggleChat}
          className="relative p-2.5 bg-slate-800 text-slate-300 rounded-full active:scale-90 transition-all border border-white/5"
        >
          <MessageSquare size={20} />
          {hasUnread && (
            <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 border-2 border-slate-900 rounded-full"></span>
          )}
        </button>

        <button 
          onClick={requestPermission}
          className={`p-2.5 rounded-full transition-all active:scale-90 ${
            notifStatus === 'granted' 
              ? 'bg-yellow-400 text-slate-900 shadow-lg shadow-yellow-400/20' 
              : notifStatus === 'denied'
                ? 'bg-red-500/10 text-red-500'
                : 'bg-slate-800 text-slate-400'
          }`}
        >
          {notifStatus === 'granted' ? <BellRing size={20} /> : notifStatus === 'denied' ? <BellOff size={20} /> : <Bell size={20} />}
        </button>
      </div>
    </header>
  );
};

export default Header;