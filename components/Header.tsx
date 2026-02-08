
import React, { useState, useEffect, useRef } from 'react';
import { Play, Bell, BellOff, BellRing, MessageSquare, Volume2, VolumeX, ShieldAlert } from 'lucide-react';

interface HeaderProps {
  onToggleChat: () => void;
  hasUnread?: boolean;
  soundEnabled: boolean;
  onToggleSound: () => void;
  isAdmin: boolean;
  onAdminRequest: () => void;
}

const Header: React.FC<HeaderProps> = ({ onToggleChat, hasUnread, soundEnabled, onToggleSound, isAdmin, onAdminRequest }) => {
  const [notifStatus, setNotifStatus] = useState<NotificationPermission>('default');
  const longPressTimer = useRef<number | null>(null);

  useEffect(() => {
    if ("Notification" in window) {
      setNotifStatus(Notification.permission);
    }
  }, []);

  const startPress = (e: React.PointerEvent) => {
    // Activación por presión de 2 segundos en el logo/título
    longPressTimer.current = window.setTimeout(() => {
      onAdminRequest();
      longPressTimer.current = null;
    }, 2000);
  };

  const cancelPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const requestPermission = async () => {
    if (!("Notification" in window)) return;
    const permission = await Notification.requestPermission();
    setNotifStatus(permission);
  };

  return (
    <header className="bg-slate-900/80 backdrop-blur-md border-b border-white/5 px-4 pt-[calc(0.5rem+env(safe-area-inset-top))] pb-4 flex items-center justify-between shadow-sm z-40">
      <div 
        className="flex items-center gap-3 cursor-pointer select-none active:opacity-70 transition-opacity touch-none"
        onPointerDown={startPress}
        onPointerUp={cancelPress}
        onPointerLeave={cancelPress}
        onPointerMove={cancelPress}
        onContextMenu={(e) => e.preventDefault()}
      >
        <div className={`p-2 rounded-xl flex items-center justify-center shadow-lg transition-colors ${isAdmin ? 'bg-red-500 shadow-red-500/20' : 'bg-[#FFCC00] shadow-[#FFCC00]/20'}`}>
          {isAdmin ? <ShieldAlert size={20} className="text-white" /> : <Play fill="#0f172a" size={20} className="text-slate-900 translate-x-0.5" />}
        </div>
        <div>
          <h1 className="text-lg font-black tracking-tighter leading-none text-white uppercase italic">Hay Paso</h1>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_5px_rgba(34,197,94,0.8)]"></span>
            <p className={`text-[9px] font-black uppercase tracking-widest leading-none ${isAdmin ? 'text-red-400' : 'text-[#FFCC00]'}`}>
              {isAdmin ? 'MODO DESPACHADOR' : 'EN VIVO'}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button 
          onClick={onToggleSound}
          className={`p-2.5 rounded-full transition-all active:scale-90 border border-white/5 ${soundEnabled ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}
        >
          {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
        </button>

        <button 
          onClick={onToggleChat}
          className="relative p-2.5 bg-slate-800 text-slate-300 rounded-full active:scale-90 transition-all border border-white/5"
        >
          <MessageSquare size={20} />
          {hasUnread && (<span className="absolute top-0 right-0 w-3 h-3 bg-red-500 border-2 border-slate-900 rounded-full"></span>)}
        </button>

        <button 
          onClick={requestPermission}
          className={`p-2.5 rounded-full transition-all active:scale-90 ${
            notifStatus === 'granted' ? 'bg-[#FFCC00] text-slate-900' : 'bg-slate-800 text-slate-400'
          }`}
        >
          {notifStatus === 'granted' ? <BellRing size={20} /> : <Bell size={20} />}
        </button>
      </div>
    </header>
  );
};

export default Header;
