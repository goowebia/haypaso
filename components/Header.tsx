
import React, { useState, useEffect } from 'react';
import { Play, Bell, BellOff, BellRing } from 'lucide-react';

const Header: React.FC = () => {
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
    <header className="bg-slate-900 border-b border-slate-800 px-4 py-4 flex items-center justify-between shadow-sm z-40">
      <div className="flex items-center gap-3">
        <div className="bg-yellow-400 p-2 rounded-xl flex items-center justify-center shadow-lg shadow-yellow-400/20">
          <Play fill="#0f172a" size={24} className="text-slate-900 translate-x-0.5" />
        </div>
        <div>
          <h1 className="text-xl font-black tracking-tighter leading-none text-white">
            PASO
          </h1>
          <p className="text-[10px] font-bold text-yellow-400 uppercase tracking-widest leading-none mt-1">
            HAY PASO
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden sm:block text-right">
          <p className="text-xs text-slate-400 italic">Ruta Manzanillo-Colima-GDL</p>
        </div>
        
        <button 
          onClick={requestPermission}
          className={`p-2 rounded-full transition-all active:scale-90 ${
            notifStatus === 'granted' 
              ? 'bg-yellow-400/10 text-yellow-400 border border-yellow-400/30' 
              : notifStatus === 'denied'
                ? 'bg-red-500/10 text-red-500 border border-red-500/30'
                : 'bg-slate-800 text-slate-400 border border-slate-700'
          }`}
          title={notifStatus === 'granted' ? "Notificaciones activas" : "Activar notificaciones"}
        >
          {notifStatus === 'granted' ? <BellRing size={20} /> : notifStatus === 'denied' ? <BellOff size={20} /> : <Bell size={20} />}
        </button>
      </div>
    </header>
  );
};

export default Header;
